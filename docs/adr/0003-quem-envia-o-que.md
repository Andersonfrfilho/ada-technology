# ADR 0003 — Quem envia o quê: a divisão entre `user-module`, `notification-module` e o host

- **Data:** 2026-08-25
- **Status:** aceito

## Contexto

Quatro peças conseguem mandar um e-mail neste produto, e três delas já tentaram ao mesmo tempo:

| Peça | Consegue enviar? |
|---|---|
| `@adatechnology/user-module` | **Sim** — aceita `providers.email` e envia por conta própria |
| `@adatechnology/notification-module` | **Sim** — é o que ele faz |
| `@adatechnology/email-provider` | **Sim** — é o transporte |
| `api-ada` (host) | **Sim** — pode chamar o driver direto |

Sem uma regra escrita, a pergunta *"quem manda o e-mail de redefinição de senha?"* tem quatro
respostas defensáveis. E já teve duas ao mesmo tempo: com `providers.email` ligado no `user-module`
**e** o hook `onPasswordResetRequested` apontando para o `notification-module`, a pessoa recebia
**dois e-mails** — o texto fixo do pacote e o template do painel.

## Decisão

**Cada peça tem um verbo, e só um.**

| Peça | Verbo | O que ela NÃO faz |
|---|---|---|
| `user-module` | **Emite evento** (`onLoginSucceeded`, `onPasswordResetRequested`, …) | Não envia. `providers.email` fica **deliberadamente ausente** |
| `notification-module` | **Despacha** — template, preferência, supressão, retry, histórico de entrega, fan-out de canal | Não conhece a marca nem a copy |
| `email-provider` e os outros drivers | **Transporta** — fala com SMTP, Resend, SES, Meta. Baixa e anexa o arquivo | Não decide se, para quem, ou o quê |
| `@ada/email-layout` | **Emoldura** — logo, cartões, rodapé, e o validador de HTML de e-mail | Não envia e não conhece destinatário |
| `api-ada` (host) | **Costura** — liga hook a notificador, declara categoria/template/variáveis, assina a URL do anexo, e escreve a copy padrão | Não reimplementa despacho |

### 1. O `user-module` emite; ele não envia

`providers.email` continua fora, e isso é uma decisão ativa a cada revisão — não um esquecimento.
Quem religar reintroduz o e-mail duplicado, e a copy volta a só mudar com publicação de pacote.

O ganho de passar pelo `notification-module` não é estético: copy editável pelo painel com preview,
preferência por canal e por categoria, supressão por bounce, retry com backoff, histórico auditável
de entrega, e os cinco canais.

### 2. O host escolhe se o canal é forçado, e a escolha diz o que a mensagem é

- **Redefinição de senha força `channels: ['email']`.** É recuperação de acesso: precisa chegar por
  um caminho que o dono da conta certamente lê.
- **Aviso de login não força canal.** É informativo, então o fan-out resolve pela preferência — e no
  dia em que um driver de push ou WhatsApp entrar no módulo, o aviso passa a sair por ele sem uma
  linha mudar.

Forçar canal em tudo mataria a preferência; não forçar em nada trancaria alguém fora da conta.

### 3. Categoria por assunto, nunca compartilhada por conveniência

`auth.password_reset` e `auth.login_alert` são categorias **separadas**, mesmo sendo as duas de
autenticação. Categoria é a unidade que a pessoa liga e desliga na aba de Roteamento: compartilhar
significa que desligar o aviso de acesso calaria a recuperação de conta.

### 4. A copy nasce em código e vive no banco

O template em `*.constant.ts` é **default de boot**. O seeder semeia **só o que falta** — nunca
sobrescreve. A partir do primeiro `upsert` pelo painel, a versão do banco manda, e a anterior fica
no histórico para auditoria.

Isso é o mesmo princípio do `conversation-flow.md` §1, e a consequência prática é a mesma: editar o
arquivo em código **não** muda o que o cliente lê hoje.

### 5. Uma regra, dois consumidores — nunca duas cópias da regra

Onde painel e servidor precisam concordar, a regra mora no **contracts** e os dois importam:

- `checkEmailAttachment` — o painel valida antes de enviar, o driver valida antes de baixar
- `diffTemplateVariables` — o aviso da tela e a recusa da rota vêm da mesma função
- `renderTemplate` — o preview e o envio interpolam igual

Duas implementações divergem no primeiro ajuste, e a tela passa a aprovar o que a rota recusa.

O mesmo motivo põe o `buildEmailHtml` num pacote (`@ada/email-layout`) em vez de dentro do
`api-ada`: o painel precisa da **mesma** função para o preview, e duas cópias divergem no primeiro
ajuste de cor — a partir daí o preview mente sobre o que chega na caixa de entrada.

### 6. Anexo: referência atravessa, bytes não

O upload grava no bucket e devolve **chave**. O disparo assina a URL (cinco minutos) e passa a
**referência**. Quem baixa é o **driver**, ao montar o MIME.

Assinar no upload guardaria credencial com prazo dentro do payload, e ela venceria antes do primeiro
reenvio. Baixar no módulo carregaria bytes na memória de um processo que pode decidir não enviar.
Ver ADR 0002.

## Consequências

- **Adicionar um canal é configuração, não código.** Injetar um driver de push ou WhatsApp em
  `createNotificationModule` faz todos os avisos não-forçados passarem a sair por ele.
- **Adicionar uma notificação nova é um notificador no host** (`*Notifier.ts`), uma categoria, uma
  chave de template e a copy padrão — nunca um driver novo, nunca envio direto.
- **O envio direto continua existindo em um único lugar**: o fallback de redefinição de senha, para
  quando o módulo se recusa a entregar (supressão, canal desligado, template inativo). É a exceção
  documentada em `passwordResetNotifier.ts`, com log, e ela não é precedente para nada.
- Quem quiser um e-mail fora do módulo tem de justificar por que perde preferência, supressão,
  retry e histórico.

## Alternativas descartadas

**Enviar pelo `user-module`.** É o que o pacote oferece e o que já esteve ligado. Reintroduz o
e-mail duplicado, tira a copy do painel, e não resolve push nem WhatsApp — o `user-module` não tem
esses canais.

**Só a redefinição pelo `user-module`, o resto pelo módulo.** Meio-termo que parece reduzir
acoplamento e na prática cria duas respostas para a mesma pergunta: um e-mail transacional com copy
em código e outro com copy no banco, e ninguém lembra qual é qual seis meses depois.
