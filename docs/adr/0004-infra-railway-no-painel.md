# ADR 0004 — Infra Railway no painel: liga/desliga de staging, agenda e custos

- **Data:** 2026-10-09
- **Status:** proposto

## Contexto

Os ambientes de staging de todos os projetos do workspace Railway "AdA Technology" ficam ligados 24 horas
por dia, 7 dias por semana, e são cobrados por isso. A medição do ciclo de cobrança
(`specs/001-infra-railway/evidence.md`, T0.1 e T0.2) mostra o tamanho do problema:

| Recorte | US$ (1–9/out) |
|---|---|
| Total do workspace | 50,57 |
| Todos os staging | 24,18 (**48%**) |
| `transportada / staging` sozinho | 19,58 (quase igual aos 20,01 da produção dele) |

**Memória é cerca de 95% do custo**, e CPU quase não pesa. O cálculo por `usage` bateu com o total que o
próprio Railway informa (`customer.currentUsage`): US$ 114,69 contra 113,28 no ciclo de 19/set a 19/out, uma
diferença de **1,2%**. Desligar staging fora do horário de uso corta praticamente toda a conta desses ambientes.

Já existem duas formas de desligar, mas nenhuma é usada no dia a dia e uma delas não funciona:

- `financiamento-imobiliario-bot/scripts/railway-environment-power.sh` usa `railway down`, que equivale a
  `deploymentRemove`, para desligar, e `railway redeploy` para religar. Funciona, mas religar cria um
  deployment novo e, num serviço com código do repositório, isso significa build novo. Só roda por linha de
  comando e só cobre um projeto.
- Os `stg-toggle.yml` dos repos `fin-bot-*` e `financiamento-mensagens-prontas` usam
  `serviceInstanceUpdate(numReplicas: 0|1)`. No teste do T0.1 **o Railway recusou essa mutação**
  (`BAD_USER_INPUT — Error in numReplicas - Invalid input`). O workflow só imprime o aviso e termina com
  "desligado com sucesso", então hoje ele não desliga nada.

Ninguém vê quanto cada projeto custa nem quanto staging pesa na fatura.

## Decisão

Criar uma área **Infra** no painel da Ada, visível só para admin, com rotas `/v1/panel/infra/...` na
`api-ada`. Ela lista projetos, ambientes e serviços, liga e desliga ambientes de staging na ordem segura,
liga e desliga por agenda, e mostra o custo do **ciclo de cobrança** (hoje do dia 19 ao dia 19, não o
mês-calendário) com a projeção de fechamento.

### D1 — Token de workspace, só na `api-ada` de produção

A API GraphQL do Railway oferece token de conta, de workspace e de projeto. O token de projeto vale para um
único ambiente de um projeto e não enxerga os outros quatro projetos, então não atende uma tela que cobre o
workspace inteiro. Usamos **token de workspace** (`Authorization: Bearer`), guardado em `RAILWAY_API_TOKEN`,
que existe só no ambiente `production` da `api-ada`. Sem o token, o módulo fica desligado: as rotas
respondem 503 `INFRA_NOT_CONFIGURED` e o resto da API sobe normalmente. É o mesmo padrão de "o recurso só
existe se a variável existir" que o `container.ts` já usa.

### D2 — `deploymentStop` para desligar e `deploymentRestart` para religar (fechada no T0.1)

O teste em `cbni-staging` (alvos `worker-uploads` e `Redis`) comparou três mecanismos:

| Mecanismo | Desliga | Religa | Tempo | Veredito |
|---|---|---|---|---|
| `deploymentStop` + `deploymentRestart` | sim, instância em `EXITED` em menos de 7 s | **mesmo deployment, sem build** | ≤ 7 s | **escolhido** |
| `serviceInstanceUpdate(numReplicas: 0)` | **recusado** pelo Railway | — | — | descartado |
| `deploymentRemove` + `serviceInstanceRedeploy` | sim | deployment novo; app de repositório exige build | ~19 s no Redis | descartado como caminho principal |

Dois achados do teste mudam o código:

- **O status do deployment parado continua `SUCCESS`**, e ele continua em `activeDeployments`. Um serviço
  conta como **desligado** se acontecer qualquer um destes: `latestDeployment.deploymentStopped` verdadeiro,
  instância em `EXITED`, ou nenhum deployment (estado deixado pelo script antigo com `railway down`). Um
  serviço só conta como **pronto** com `deploymentStopped` falso **e** instância `RUNNING`.
- O caminho para religar depende do estado: deployment parado → `deploymentRestart`; sem deployment →
  `serviceInstanceRedeploy`, que pode exigir build.

Banco e aplicação se distinguem por `source.image` (`postgres-ssl`, `redis`); o nome só reforça quando a
imagem vier nula. Ao desligar, as aplicações param primeiro e os bancos depois. Ao religar, os bancos sobem
primeiro, com espera limitada por `RAILWAY_DATABASE_WAIT_SECONDS` (padrão 120 s), e as aplicações em seguida.

Depois de religar, o domínio público continua o mesmo e o `GET /health` do backend responde 200. Nenhuma
configuração de serviço é alterada (`numReplicas` continua `null`).

### D3 — Agenda no scheduler que já roda dentro da `api-ada`

A agenda entra como uma tarefa a mais no `startScheduler({ tasks })`, ao lado de `catalogModule.schedules`,
com tick de 1 minuto. A `api-ada` roda hoje com uma réplica só, e o custo de um `apps/cron-ada` separado
(serviço, deploy, variáveis e mais um lugar com o token) não se justifica enquanto isso for verdade. A trava
Redis `SET NX` por ambiente e a coluna `last_evaluated_at` evitam a execução em dobro na janela em que um
deploy novo e o antigo rodam juntos. **Se a API ganhar réplicas, esta decisão é revista.**

### D4 — Preços numa constante, com fonte e data

O Railway não expõe a tabela de preços pela API. `railwayPricing.constant.ts` guarda o preço de cada
medida, a unidade, a URL de `docs.railway.com` e a data em que o valor foi conferido, e a tela de custos
mostra essa data e o total oficial do Railway ao lado do cálculo, para a divergência ficar visível. Unidades
confirmadas no T0.2: CPU em vCPU-minuto, memória e disco em GB-minuto, rede em GB; o mês tem 43 200 minutos.

### D5 — Rotas dentro do painel (`/v1/panel/infra/...`)

As rotas usam a autenticação, o `AUTH_REQUIREMENT.ADMIN`, o rate limit e a auditoria que o painel já tem. Uma
rota fora do painel exigiria reconstruir tudo isso para um único consumidor.

### D6 — Agenda como janela de funcionamento, que só age na transição

Cada ambiente gerenciável pode ter uma agenda com dias da semana, hora de ligar e hora de desligar, no fuso
`America/Sao_Paulo`, além de um interruptor ativa/pausada. A agenda **não reaplica o estado desejado a cada
minuto**: ela age só quando o horário **muda de lado da janela** desde a última avaliação. Com isso, quem
desliga staging à mão no meio da janela não vê a agenda religar no minuto seguinte.

Ligar manualmente fora da janela exige `keepOnUntil` (padrão +2 h, máximo 24 h). A agenda respeita esse
prazo e, quando ele vence, desliga no próximo minuto. Na v1, uma janela que cruza a meia-noite é recusada.
Dois crons independentes, um para ligar e outro para desligar, permitiriam estados impossíveis (ligar depois
de desligar no mesmo dia) e não teriam como representar "manter ligado até".

### Proteções que não dependem de configuração

- Todo ambiente com `prod` no nome (cobre `production`) é **protegido**, mesmo que case com o padrão de gerenciáveis: não mostra botão, a API responde 403
  `INFRA_ENVIRONMENT_PROTECTED` e nenhuma mutação é enviada.
- O ambiente onde a própria `api-ada` roda, identificado por `RAILWAY_ENVIRONMENT_ID` (o Railway injeta),
  também é protegido, e a variável é obrigatória no boot quando há token, para a proteção nunca sumir em
  silêncio.
- O painel não oferece forma de liberar um ambiente protegido. Desligar produção está bloqueado por design.

## O risco do token de workspace

O token de workspace pode fazer, em todos os projetos do workspace, tudo o que um membro faz pela API:
apagar serviços, volumes e projetos, ler variáveis de produção (`DATABASE_URL`, chaves da Meta, segredos de
JWT) e trocar a imagem de um deploy. **É o segredo mais poderoso que a `api-ada` vai guardar.** A tela usa
uma fração mínima desse poder, mas o token carrega o poder inteiro.

| Mitigação | Protege contra | Não protege contra |
|---|---|---|
| Documentos GraphQL fixos em `RailwayGateway.ts`; nenhuma query montada a partir de entrada | admin, entrada maliciosa ou bug fazendo o painel executar outra coisa | token lido fora do processo |
| Token só na `api-ada` de **produção**; vazio em dev, test e staging | vazamento por ambiente menos protegido, `.env` local ou CI | vazamento da própria produção |
| Autoproteção de produção e do próprio ambiente (`classifyEnvironment`, função pura com teste) | engano operacional | — |
| Token nunca em log; header `authorization` sempre redigido | vazamento por log ou Sentry | — |
| Auditoria de cada ação (`infra.environment_powered_off`, `_on`, `infra.schedule_changed`) com ator, alvo e resultado por serviço | uso indevido do painel por um admin | uso do token fora do painel, que **não aparece** na nossa auditoria |
| Rotação documentada em `docs/SECURITY.md`, com achado datado | prazo de exposição | — |

**Se o token vazar:** quem o tiver age sobre todos os projetos do workspace, produção incluída, **sem passar
pela `api-ada`**; as travas vivem no nosso código e não no Railway. O procedimento é:

1. revogar o token no painel do Railway, criar um novo e trocar `RAILWAY_API_TOKEN` só na `api-ada` de
   produção;
2. tratar como queimados os segredos de **todos** os projetos (banco, Meta, JWT, S3) e rotacioná-los, porque
   o token permitia lê-los;
3. revisar no Railway os deployments e as mudanças de variáveis desde a data provável do vazamento.

Esse custo de resposta a incidente é o preço da D1, e foi aceito porque o token de projeto não atende o
requisito.

## O webhook do WhatsApp em staging desligado

`cbni-staging` recebe webhook da Meta. Com o serviço parado, o domínio do Railway devolve erro, e a Meta
trata qualquer resposta diferente de 200 como falha de entrega:

- **A Meta reenvia por até 7 dias**, com frequência decrescente, segundo a
  [documentação oficial](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks), que
  também avisa que o reenvio vai a todos os apps assinados na conta e que o endpoint deve tolerar
  duplicatas. A página não diz se falhas contínuas desativam a assinatura. Ao religar, chega uma **rajada**
  de mensagens e status acumulados, e o bot pode responder a conversas de horas atrás.
- **O dedup só existe em parte.** O `Webhook.controller` do financiamento guarda o nonce no Redis por 300 s,
  usando `x-request-id` ou, se o header faltar, `Date.now()`; esse fallback gera um valor novo a cada
  requisição e **não deduplica nada**. Não está confirmado se a Meta envia `x-request-id`. O `LogMessage`
  evita registrar a mensagem duas vezes por `waMessageId`, mas falta confirmar se a **resposta** do bot
  depende desse resultado.
- **A conta do WhatsApp tem 3 apps assinados** (`quick-cart`, `CBNI-staging`, `AdA technology`).
- Enquanto Redis ou Postgres não estiverem prontos, o webhook responde 500 (e não 200), e a Meta tenta de
  novo depois em vez de dar a mensagem por entregue.

A agenda por janela reduz o impacto em vez de eliminá-lo: staging fica desligado só fora do horário de uso, e
a rajada da manhã cai num ambiente que acabou de subir com os bancos primeiro. Quem testa fora da janela
liga com `keepOnUntil`; desligar no meio de uma conversa de teste produz reenvios.

## Alternativas descartadas

- **`serviceInstanceUpdate(numReplicas: 0)`.** É o que os `stg-toggle.yml` fazem, e o Railway recusou no teste.
- **`deploymentRemove` + `serviceInstanceRedeploy` (o `railway down` do script).** Funciona, mas religar cria
  um deployment novo e, em serviço de repositório, um build novo: minutos em vez de segundos, e o risco de
  subir um commit diferente do que estava no ar. Fica só como fallback, quando o serviço não tem deployment.
- **Serverless (`sleepApplication`).** Faz o serviço dormir sem tráfego, o que não combina com staging que
  recebe webhook e roda worker de fila. Avaliado e fora da v1.
- **Token de projeto.** Vale para um único ambiente de um projeto, e a tela precisa de cinco projetos.
- **`apps/cron-ada` separado para a agenda.** Mais um serviço com o mesmo token poderoso, sem ganho enquanto
  a API tiver uma réplica só.
- **Agenda como dois crons, um para ligar e outro para desligar.** Ver D6.
- **Buscar preço pela API do Railway.** Não existe.

## Consequências

- Staging passa a custar perto de zero fora da janela, e o painel mostra quanto staging pesa em cada projeto.
- Os mecanismos antigos continuam no lugar. Os `stg-toggle.yml` **não funcionam** e dão falsa sensação de
  controle; revisá-los é trabalho à parte.
- A agenda depende da `api-ada` de produção estar no ar. Se ela cair, o staging fica no último estado; na
  volta, o primeiro minuto detecta se o horário mudou de lado da janela e age uma vez só.
- A `api-ada` passa a guardar um segredo capaz de apagar o workspace. Isso entra no `docs/SECURITY.md` como
  achado datado, com procedimento de rotação.
- Uma ação feita direto no console do Railway não aparece na auditoria do painel; a tela mostra o estado
  real, não o histórico.

### Pontos em aberto

1. **Não está confirmado que um deployment parado deixa de ser cobrado.** Três minutos depois do stop, a
   métrica de memória ainda mostrava o valor antigo (atraso de ingestão), e a documentação só diz que o
   Railway cobra enquanto o serviço roda. Verificar no roteiro da T6.3, comparando `MEMORY_USAGE_GB` numa
   janela desligada. Se não parar de cobrar, a D2 cai e o fallback é `deploymentRemove`, aceitando o build ao
   religar.
2. **O Postgres não foi testado.** O teste cobriu `Redis` e `worker-uploads`. O primeiro stop do Postgres
   acontece no roteiro da T6.3, com o backup do volume conferido antes.
3. **A agenda roda numa réplica só.** Se a `api-ada` escalar, a D3 é revista (trava por tarefa, como o
   advisory lock que o `scheduler.ts` já prevê em comentário, ou `apps/cron-ada`).
4. **Webhook:** confirmar se a Meta envia `x-request-id`, se a resposta do bot depende do dedup por
   `waMessageId`, e se algum dos outros apps da conta aponta para o mesmo domínio de staging.
