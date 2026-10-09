# Spec 002 — Token do Railway configurável pelo painel da Ada

> Status: pronta para execução · Depende da spec 001 (já em `main`, PR #12)
> Apps: `apps/api-ada`, `apps/frontend-panel` · Data: 2026-10-09

## 1. Problema

Hoje o `RAILWAY_API_TOKEN` só entra como variável de ambiente da `api` de produção, pelo painel do
Railway. Trocar ou remover o token exige acesso ao Railway, redeploy da API, e não deixa claro dentro do
painel da Ada se a integração está funcionando. O usuário decidiu que o token deve ser configurado **pelo
painel da Ada**.

Isso muda a postura de segurança. O token de workspace pode apagar serviços e volumes e ler variáveis de
produção; passar por um formulário significa que ele trafega pelo navegador e passa a morar no banco.
Esta spec existe para fazer isso **sem enfraquecer** as garantias da spec 001.

## 2. Objetivo

Uma tela **Infra › Integração** (só admin) que permite:

1. informar o token e o id do workspace, **testar a conexão antes de salvar**, e salvar;
2. ver o estado da integração (configurada ou não, origem, final do token, quem mudou e quando, acesso);
3. verificar de novo o acesso e **remover** o token;

com o token **cifrado em repouso**, **nunca devolvido** pela API, **nunca logado**, e passando a valer
**sem redeploy**.

## 3. Histórias de usuário

- **US1 — Configurar.** Como admin, abro *Infra › Integração*, colo o token e o id do workspace, confirmo
  com a minha senha e clico em *Testar e salvar*. Se o Railway recusar o token, nada é salvo e vejo o motivo.
  Se aceitar, a tela Infra passa a funcionar na hora.
- **US2 — Acompanhar.** Vejo se está configurada, de onde vem (painel ou variável de ambiente), os 4 últimos
  caracteres, quem alterou e quando, e o resultado do último teste de acesso.
- **US3 — Trocar.** Informo um token novo; o antigo deixa de existir. A troca exige a senha de novo.
- **US4 — Remover.** Removo o token (com senha); o módulo Infra volta a ficar desligado (503
  `INFRA_NOT_CONFIGURED`) e as agendas deixam de agir.
- **US5 — Rastro.** Toda configuração, troca, remoção e teste fica na auditoria, sem o token.

## 4. Requisitos funcionais

- **RF1** Rotas só admin: `GET /v1/panel/infra/integration`, `PUT /v1/panel/infra/integration`,
  `POST /v1/panel/infra/integration/verify`, `DELETE /v1/panel/infra/integration`.
- **RF2** O `PUT` valida o formato do token e do workspace (zod), **chama o Railway com o token recebido**
  (`workspace(workspaceId)` precisa devolver o mesmo id) e só então grava. Falha de autenticação,
  workspace não encontrado ou Railway indisponível **não gravam nada**, com erros distintos.
- **RF3** `PUT` e `DELETE` exigem a **senha do admin logado** no corpo (confirmação de identidade). Senha
  errada: 403 `INFRA_INTEGRATION_PASSWORD_INVALID`, sem gravar, e conta para o limite de tentativas.
- **RF4** O token é guardado **cifrado** (AES-256-GCM, IV aleatório por gravação, dado autenticado com um
  rótulo fixo e a versão da chave), com chave em variável de ambiente **separada do banco**
  (`INFRA_SECRET_ENCRYPTION_KEY`). Sem a chave, `PUT` responde 503 `INFRA_SECRET_KEY_MISSING`; o banco
  sozinho não decifra nada.
- **RF5** **Nenhuma rota devolve o token**, nem cifrado. O `GET` devolve só estado: `configured`, `source`
  (`panel` | `environment`), `tokenHint` (últimos 4 caracteres), `workspaceId`, `updatedAt`,
  `updatedByName`, `access` (mesmo vocabulário da spec 001).
- **RF6** O token vale **sem redeploy**: ao salvar, trocar ou remover, a API passa a usar o novo valor em
  até 1 requisição (cache em memória invalidado no mesmo processo). A API continua com uma réplica (spec 001,
  D3); com mais de uma, o valor vale em até 30 s (TTL do cache).
- **RF7** **Só em produção.** `PUT` fora de `ENV=production` responde 403
  `INFRA_INTEGRATION_PRODUCTION_ONLY` (a mesma regra do `RAILWAY_API_TOKEN`). `GET` funciona em qualquer ambiente
  e mostra o estado.
- **RF8** **Precedência:** token salvo pelo painel vale; sem ele, vale `RAILWAY_API_TOKEN` (compatibilidade
  com o que a spec 001 documentou). Token vindo da variável de ambiente **não** pode ser removido pelo painel
  (a tela explica onde ele está).
- **RF9** Corpo de `PUT` e `DELETE` **nunca** entra em log, em erro, em contexto de erro nem no Sentry. A
  redação existente (`token`, `password`) continua valendo e ganha teste dedicado.
- **RF10** Limite de tentativas: `PUT` e `DELETE` com **5 por minuto por agente** e por IP; `verify` com 12.
- **RF11** Auditoria: `infra.integration_configured`, `infra.integration_replaced`,
  `infra.integration_removed`, `infra.integration_verified` e `infra.integration_denied` (senha errada,
  fora de produção, token recusado), com ator, IP, alvo e motivo; **jamais** o token, nem os últimos 4
  caracteres, na metadata.
- **RF12** As rotas e o scheduler da spec 001 passam a obter o gateway **a cada uso** (provedor), e não mais
  no boot. A tarefa do scheduler fica sempre registrada e só age quando há token.
- **RF13** O painel nunca guarda o token: campo `type=password`, `autocomplete` desligado, limpo ao salvar,
  ao falhar e ao desmontar; sem `localStorage`/`sessionStorage`; a mutação não mantém o valor no cache do
  react-query.

## 5. Requisitos não funcionais

- **Cifra:** só `node:crypto` (nativo do Bun), sem biblioteca nova. Chave de 32 bytes em base64, validada no
  boot (comprimento exato) quando presente. Versão da chave gravada com o segredo, para rotação futura.
- **Rotação:** trocar a chave exige informar o token de novo (documentado). Sem suporte a duas chaves na v1.
- **Compatibilidade:** sem a chave e sem token, tudo continua como na spec 001 (módulo desligado, 503).
- **Migration** aditiva (`0005`), sem apagar nada.

## 6. Fora de escopo (v1)

- Vários workspaces ou vários tokens.
- Papéis finos além de admin; aprovação por duas pessoas.
- Rotação automática do token no Railway e alerta de expiração.
- Guardar outros segredos (WhatsApp, e-mail) por este mecanismo, embora o desenho permita.
- Cache compartilhado entre réplicas (a spec 001 já fixa uma réplica).

## 7. Decisões assumidas (vetáveis antes da execução)

| # | Decisão | Alternativa descartada |
|---|---|---|
| D1 | Token no banco **cifrado**, chave só em variável de ambiente separada | Texto puro no banco (um dump entregaria o token); chave no próprio banco (não protege) |
| D2 | **Confirmar com a senha** do admin em `PUT`/`DELETE` | Só a sessão: um token de sessão roubado trocaria ou apagaria a integração sem nova prova |
| D3 | **Testar no Railway antes de salvar** | Salvar e testar depois: guarda lixo e esconde o erro de digitação |
| D4 | `GET` sem o token e **sem cifrado**; dica = 4 últimos caracteres | Devolver máscara maior ou hash: sem ganho |
| D5 | Gateway por **provedor** consultado a cada uso, sem reiniciar | Reiniciar a API ao salvar: derruba a agenda e as operações em curso |
| D6 | Painel > variável de ambiente; variável vira reserva | Remover a variável de ambiente: quebra o que a spec 001 documentou |
| D7 | Token só pode ser gravado em `ENV=production` | Permitir em staging: o token mais poderoso do workspace num ambiente menos protegido |

## 8. Riscos aceitos (a registrar no ADR 0005)

- Quem tem uma **sessão admin válida e a senha** pode trocar ou remover o token. Isso já podia desligar
  staging; agora também controla a integração. A senha de confirmação reduz o risco de sessão roubada.
- **XSS** na página de Integração leria o campo enquanto o admin digita. Mitigação: sem `dangerouslySetInnerHTML`,
  sem script de terceiros na tela, e o campo só existe nessa tela.
- Quem tiver o **banco e a chave** (os dois) lê o token. A chave fica fora do banco, no mesmo cofre de
  variáveis que já guarda o `PANEL_JWT_SECRET`.
- O token em memória da API existe por 30 s no cache e enquanto uma requisição o usa.

## 9. Critérios de aceite

1. Sem a chave de cifra: `PUT` responde 503 `INFRA_SECRET_KEY_MISSING` e nada muda.
2. Token inválido ou workspace errado: `PUT` responde com erro distinto e **nada é gravado** (conferido no banco).
3. Senha errada em `PUT` e `DELETE`: 403 e nada muda; a 6ª tentativa no minuto leva 429.
4. Token salvo: nenhuma resposta da API, nenhum log e nenhuma linha de auditoria contém o token (varredura
   automática com um valor-isca nos testes e na API real).
5. O banco guarda só texto cifrado (`ciphertext` não contém o token; trocar um byte faz a leitura falhar).
6. Depois de salvar, as telas Ambientes e Custos funcionam **sem redeploy**; depois de remover, voltam a 503.
7. Fora de `ENV=production`, `PUT` responde 403 e o `GET` mostra o estado.
8. Com token só na variável de ambiente, o `GET` mostra `source: environment` e `DELETE` é recusado.
9. O painel não deixa o token em `localStorage`, `sessionStorage` nem no cache de mutação (verificado no
   navegador) e limpa o campo ao salvar e ao falhar.
10. `make validate` verde; nenhum `test.skip`/`.only`.
