# ADR 0005 — Token do Railway configurável pelo painel

- **Data:** 2026-10-09
- **Status:** aceito e implementado (spec 002, tarefas T0 a T5, 2026-10-09). Pendentes: T6.1 (API real ponta a ponta),
  T6.3 (revisão independente) e T6.4 (roteiro manual com token de workspace real).
- **Depende de:** ADR 0004 (Infra Railway no painel)
- **Revisão:** arquitetura e modelo de ameaças por `architect` e `security-reviewer` (`opus`), antes de implementar;
  achados conferidos no código e incorporados (ver `specs/002-token-no-painel/evidence.md`).

## Contexto

O ADR 0004 colocou na `api-ada` de produção um token de workspace do Railway, lido de `RAILWAY_API_TOKEN`. Trocar ou
remover esse token exige acesso ao painel do Railway e um redeploy, e o painel da Ada não mostra se a integração
funciona. Foi decidido que o token deve ser configurado **pelo painel da Ada**.

Isso muda a postura de segurança do segredo mais poderoso que a API guarda (apaga serviços e volumes, lê variáveis de
produção): ele passa a trafegar pelo navegador e a morar no banco. Este ADR registra como fazer isso sem enfraquecer
as garantias do 0004.

Fatos do código que moldam a solução:

- O gateway é criado uma vez no boot e injetado como `railwayGateway?` em cinco casos de uso; `undefined` é módulo desligado.
- O bloqueio por `Retry-After` vive **em memória**, dentro do cliente GraphQL de cada instância do gateway.
- Inventário, acesso e custos ficam no Redis (`infra:inventory`, `infra:access`, `infra:costs:v1`, `infra:costs:v1:last-good`
  de até 7 dias), com chaves que não identificam token nem workspace.
- A autoproteção do próprio ambiente depende de `RAILWAY_ENVIRONMENT_ID`, hoje obrigatória só quando `RAILWAY_API_TOKEN` existe.
- Sem token, o relógio do scheduler nem sobe em dev, test e staging.
- A `api-ada` **não usa Sentry**. Os caminhos de vazamento são o logger (redação só por nome **exato** de chave), o filtro de
  exceção (loga mensagem e stack de erro desconhecido; o erro do Drizzle inclui os parâmetros da consulta) e o
  `audit_logs.metadata` (gravado sem redação).
- `findById` do agente não traz o hash da senha; só `findByEmail` traz credenciais.
- **Achado anterior a esta feature:** o CORS devolve credenciais para as origens do painel **e** do widget, e
  `POST /auth/refresh` lê um cookie `SameSite=None` sem checar a origem.

## Decisão

Tela **Infra › Integração** (só admin) com `GET`, `PUT`, `POST /verify` e `DELETE` em `/v1/panel/infra/integration`. O token é
testado no Railway antes de salvar, guardado cifrado, nunca devolvido nem logado, e passa a valer sem redeploy.

### D1 — Cifrado em repouso; chave fora do banco e só em produção
AES-256-GCM com `node:crypto`, IV aleatório de 12 bytes por gravação, tag fixada em 16 bytes. O dado autenticado liga o cifrado
ao seu lugar: `ada.infra.railway-token|<key_id>|<provider>|<workspace_id>`. A chave vem de `INFRA_SECRET_ENCRYPTION_KEY`
(base64 de exatamente 32 bytes), no mesmo cofre do `PANEL_JWT_SECRET`, nunca no banco. O `key_id` é a impressão digital da própria
chave (8 bytes do SHA-256) gravada com o segredo: chave trocada vira `key_mismatch`, não "não configurado". A chave é **recusada no
boot fora de `ENV=production`** e se igual ao `PANEL_JWT_SECRET`, e exige `RAILWAY_WORKSPACE_ID` e `RAILWAY_ENVIRONMENT_ID`
(sem isso a autoproteção do ambiente da API sumiria em silêncio quando o token vem do painel).

### D2 — Confirmação por senha em `PUT` e `DELETE`
O caso de uso relê o agente no banco e exige `isActive` e papel `admin` naquele instante (o papel do JWT pode estar 15 min
defasado), e confere a senha com o `Bun.password.verify` do login. Falhas somam num contador por agente (15 min); na 5ª, revoga
as sessões do agente e bloqueia a integração por 15 min (423, auditoria `infra.integration_locked`). O login não muda.
**Limite honesto:** a confirmação não protege contra uma sessão admin roubada, porque essa sessão pode criar um admin novo com
senha conhecida e confirmar com ele. Ela acrescenta um passo e dois rastros (criação de agente e alteração da integração).

### D3 — Testar no Railway antes de gravar; workspace fixado no ambiente; sem token de conta
O `PUT` recebe só `token` e `password`. O workspace é o de `RAILWAY_WORKSPACE_ID` (não é segredo): isso fecha a troca de
integração para um workspace de terceiros, que faria a agenda deixar de agir no nosso staging e o painel renderizar nomes
controlados por outro. `probeWorkspace`, num cliente descartável, compara o id e devolve resultado discriminado (recusado,
workspace inacessível, indisponível, limite). Um token em que a query `me` responde é de **conta** (a documentação do Railway diz que
`me` é negada a token de workspace) e é recusado como amplo demais.

### D4 — A API nunca devolve o token
Nem cifrado. O `GET` devolve só estado (origem, `state`, dica de 4 caracteres, workspace, autor, data, `access` lido do cache,
`environmentTokenAlsoPresent`). A dica nunca entra na auditoria. Todas as respostas são `no-store`.

### D5 — `resolveGateway()` por uso; provedor que só remonta com credencial nova; Redis limpo
Os cinco casos de uso trocam `railwayGateway?` por `resolveGateway()`, chamado **uma vez** no início do `execute`; a operação de
energia passa o gateway ao runner em segundo plano (nunca troca de token no meio; uma operação admitida termina com o token com que
começou). O `RailwayGatewayProvider` relê a linha no máximo a cada 30 s e **só remonta o gateway quando a credencial muda**
(impressão digital de `updated_at`, `key_id`, `workspace_id`), preservando o bloqueio de `Retry-After` do ADR 0004; `invalidate()` vale
na próxima chamada, com contador de geração contra leitura em andamento. Salvar, trocar e remover **apagam as quatro chaves Redis** (inventário, acesso, custos e o último bom de custos) e também `infra:integration:verify`, o cache de 30 s do `verify` (T4.1), para o teste não devolver o "ok" do token antigo.
`PUT`/`DELETE` rodam em transação com `SELECT … FOR UPDATE`. O scheduler e a recuperação do boot são registrados **apenas em
produção** e retornam sem chamar o Railway quando não há token.

### D6 — Uma fonte de credencial por vez; a variável de ambiente trava o painel
Se `RAILWAY_API_TOKEN` existir, ela vale (com o `RAILWAY_WORKSPACE_ID` do ambiente), `source = environment`, e `PUT`/`DELETE`
respondem 409; uma linha do painel eventual é ignorada com aviso. Sem a variável, vale o painel, com o workspace do ambiente.
Linha do painel ilegível (chave ausente/errada, tag inválida) é **fail closed**: o módulo fica indisponível, sem cair para outra
credencial. Remover ou trocar no painel **não revoga** o token no Railway, e a tela diz isso.

### D7 — Só em produção
`PUT` fora de `ENV=production` responde 403 (auditado). Fora de produção a tabela nem é lida.

### Proteção contra vazamento
Redação do logger por **substring** (`token`, `password`, `secret`, `ciphertext`, `encryptionkey`) com allowlist `tokenHint`;
metadata de auditoria dessas ações como **tipo fechado** (`reason` de enum fixo); o filtro de exceção não loga a mensagem de erro do
Drizzle; token em campo privado `#token`; corpo lido uma vez em variável local; testes com **valor-isca** varrendo stdout e stderr
do **processo real**, respostas e `audit_logs`. Formulário: campo que gerenciador de senhas e corretor não capturam, limpo ao salvar,
falhar e desmontar, sem storage do navegador.

### Pré-requisito: CORS e refresh (RF14)
Credenciais de CORS só para o painel; `refresh` recusa `Origin` que não seja do painel; o widget não pode regredir.

## Modelo de ameaças

| # | Ativo | Ator | Vetor | Mitigação | Risco residual |
|---|---|---|---|---|---|
| T1 | Sessão admin | Script numa origem do widget | `fetch` com credenciais em `/auth/refresh` | RF14 | Baixo |
| T2 | Senha do admin | Dono de sessão roubada | Força bruta em `PUT`/`DELETE`, XFF forjado | D2 (contador, revogação, papel no banco); IP por `X-Real-IP` (confirmação no proxy do Railway em aberto, ponto 5) | Baixo |
| T3 | Token no navegador | XSS ou extensão | Ler o campo | CSP `script-src 'self'`, sem HTML injetado | Médio (supply chain) |
| T4 | Token no navegador | Gerenciador de senhas / corretor | Salvar ou enviar o campo | RF13 | Baixo |
| T5 | Token em trânsito | Rede | Interceptação | HTTPS, HSTS, `no-store` | Baixo |
| T6 | Token em log/auditoria | Bug ou operador | Chave com outro nome, `message`, erro do Drizzle, metadata | Redação por substring, metadata tipada, filtro sem parâmetros, isca em stdout/stderr | Baixo |
| T7 | Cifrado no banco | Dump, backup, leitura SQL | Ler a tabela | AES-256-GCM, chave fora do banco e só em produção, tag 16 bytes, AAD | Baixo |
| T8 | Banco + chave | Quem lê as variáveis do Railway | Decifrar | Controle de acesso do Railway | Alto, **aceito** (já teria todos os segredos) |
| T9 | Integridade da integração | Admin com sessão e senha | Trocar por token de outro workspace ou de conta | Workspace fixado no ambiente, recusa de token de conta, auditoria | Baixo |
| T10 | Disponibilidade da agenda | Admin ou atacante com senha, quem escreve no banco | `DELETE`, linha adulterada, `verify` em rajada | Auditoria, fail closed, `verify` 3/min com cache | Médio (custo, nunca produção) |
| T11 | Token antigo | Quem tem backup + chave | Usar depois de "remover" | Aviso e documentação: revogar no Railway | Médio (ação humana) |
| T12 | Token removido | Corrida interna | Cache repovoado, operação em curso | Contador de geração, `FOR UPDATE`, operação termina com o token inicial | Baixo |
| T13 | Autoproteção de produção | Configuração | Token do painel sem `RAILWAY_ENVIRONMENT_ID` | 503 e exigência no boot | Baixo |
| T14 | Token em memória | Quem inspeciona objeto/dump | `inspect`, `JSON.stringify` do gateway | `#token`, cache curto, nada no Redis | Baixo |
| T15 | Saída | Quem manipula entrada | SSRF por id ou token | URL constante, id em `variables`, UUID validado | Desprezível |

## Alternativas descartadas

- **Texto puro no banco** (um dump entregaria o token); **chave no próprio banco** (não protege); **confirmar só com a sessão**.
- **Salvar e testar depois** (guarda lixo, esconde erro de digitação); **workspace vindo do formulário** (abre a troca para workspace alheio).
- **Reiniciar a API ao salvar** (derruba a agenda e as operações).
- **Gateway que delega a cada chamada, sem mexer nos casos de uso:** zero mudança nos casos de uso, mas a listagem e os custos leem o
  cache antes de tocar o gateway (servem dados até 15 min após a remoção), uma operação poderia trocar de token entre serviços e o
  scheduler registraria erro a cada minuto.
- **Remontar o gateway a cada vencimento do cache** (perde o `Retry-After`); **painel com prioridade sobre a variável** (sombreia uma
  credencial posta de propósito e, ao remover, a variável "voltaria" sem aviso); **registrar o scheduler em todos os ambientes**.
- **Duas chaves de cifra na v1** (rotação rara; reinformar o token custa menos).

## Consequências

- O token passa a valer e deixar de valer sem redeploy, e a tela mostra origem, dica, autor, data e acesso.
- Trocar ou perder a chave invalida o token salvo (`key_mismatch`); informa-se o token de novo. Rotação documentada em `SECURITY.md`.
- Migrar da variável de ambiente para o painel exige remover `RAILWAY_API_TOKEN` e um redeploy, uma vez.
- Para usar o painel é preciso configurar antes, na `api` de produção: `INFRA_SECRET_ENCRYPTION_KEY` e `RAILWAY_WORKSPACE_ID`
  (`RAILWAY_ENVIRONMENT_ID` o Railway injeta).
- Os testes da spec 001 continuam; só muda o ponto de injeção. A primeira abertura depois de salvar chama o Railway (Redis limpo).
- Agendas de ambientes de outro workspace ficam órfãs depois de uma troca de workspace e são ignoradas; limpá-las é trabalho à parte.

## Riscos aceitos

- Sessão admin roubada (ver D2); XSS na tela (resíduo de supply chain); banco + chave no mesmo cofre de variáveis; token em memória
  por 30 s e durante uma operação em curso; remover/trocar não revoga no Railway; falha ao gravar a auditoria depois de salvar
  (autor e data saem da própria linha); uma réplica só (com mais, outra réplica usa o token antigo por até 30 s); máscara do campo do token sem efeito no Firefox (`-webkit-text-security` não é suportado), e a conferência de gerenciador de senha nesse navegador segue manual (RF13).

## Pontos em aberto

1. Confirmar com um token real de workspace (no roteiro manual) que a query `me` é negada; se não for, a recusa de token de conta
   precisa de outro critério.
2. Se o Railway responde igual a workspace alheio e inexistente, um código só.
3. Aviso por e-mail aos admins quando a integração muda (módulo de notificação já existe).
4. Pedir a mesma confirmação por senha na criação e na promoção de admin, para a D2 proteger de fato contra sessão roubada.
5. IP confiável para rate limit e auditoria: a documentação do Railway diz que `X-Real-IP` identifica o IP do cliente e a API passou a usá-lo (T2.1); **falta conferir no ambiente real que o proxy sobrescreve um `X-Real-IP` enviado pelo cliente** (um `curl` com `X-Real-IP` falso).
6. 13 achados `high` do `bun audit` (fora do caminho do token).

## Revisão independente (T6.3, 2026-10-09)

`code-reviewer` e `security-reviewer` (sonnet, somente leitura): 0 bloqueantes/críticos. **Corrigidos** (teste vermelho antes):
cache regravado com dado do token antigo após troca (`isCurrent` no provedor), `Retry-After: 0` no probe, token/senha retidos no
painel até a releitura, bloqueio de rate limit perdido em queda do banco, corrida DELETE×upsert (agora 409
`INFRA_INTEGRATION_CONCURRENT_CHANGE`), `catch` mudo em `hasPanelRow`, redação por valor e mais fragmentos, chave de baixa entropia.

**Aceitos, sem mudança de código:**
- Probe limitado pelo Railway responde 503 (herdado da spec 001), não 429 como o RF2.
- Contador de falhas de senha zera no sucesso (o limite de 5/min por rota e a janela de 15 min limitam o ganho).
- Corpo das rotas sem limite global (`maxRequestBodySize` afetaria upload do widget); só autenticado e com 5/min.
- Papel/`isActive` do JWT valem até 15 min nas leituras (GET/verify); escritas relêem o banco.
- Constantes repetidas (`'production'`, `'Muitas requisicoes'`), auditoria `locked` duplicável em requisições paralelas, fingerprint sem hash do cifrado.
- Replay de ciphertext antigo por quem escreve no banco (coberto por T8/T11).

**Abertos para o deploy (decisão do usuário):** confirmar `X-Real-IP` sobrescrito pelo proxy do Railway; sobreposição de
origens painel×widget só avisa (tornar fatal pode impedir o boot); `CORS_ALLOWED_ORIGINS` de produção precisa conter o domínio exato do painel (o refresh agora exige `Origin`).

