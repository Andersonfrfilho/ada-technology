# ADR 0002 — Anexo de e-mail por referência, em bucket privado próprio, sobre uma fila que ainda não existe

- **Data:** 2026-08-25
- **Status:** aceito

## Contexto

O painel precisa anexar arquivo ao e-mail de uma notificação: o operador manda o arquivo para a API,
a API anexa e envia. O destinatário recebe o arquivo **dentro** da mensagem, não um link.

Ao inspecionar o caminho antes de escrever, três fatos mudaram o desenho:

1. **`SendEmailParams` do `@adatechnology/notification-contracts` não tinha anexo.** Os campos eram
   `to`, `subject`, `html`, `text`, `replyTo?`, `idempotencyKey?`. Nenhum ponto do caminho carregava
   arquivo.
2. **A fila de notificação é `createInProcessQueue()`** (`apps/api-ada/src/infra/container.ts`). Não
   há Redis nem worker no caminho: o job vive na memória do processo da API, e `apps/` não tem
   `worker-`. Deploy, restart ou crash perdem entrega enfileirada, em silêncio.
3. **O único bucket configurado é `ada-products`, criado com leitura anônima** (`deploy-railway.md`,
   seção do bucket de imagem de produto). Ele é público de propósito — a Meta precisa buscar imagem
   de produto por URL estável.

## Decisão

**1. O anexo trafega por referência, e os bytes param no storage.** O upload grava o arquivo no
bucket e o que segue para o disparo é `{ filename, url, contentType }`. Quem baixa é o **driver**, ao
montar o MIME. Não é preferência estética: um PDF de 25MB no payload do job é 25MB na memória do
processo por tentativa, replicados a cada retry, e nota fiscal é dado pessoal — `security.md` §6 já
manda o payload de fila carregar referência.

Baixar no módulo (e não no driver) carregaria bytes na memória de um processo que pode nem chegar a
enviar, porque a decisão de canal e a checagem de supressão vêm depois.

**2. Anexo é um tipo de variável, não uma variável de texto.** `TemplateVariableDefinition` ganhou
`kind: 'text' | 'attachment'`. As duas validações são opostas — variável de texto declarada e ausente
do corpo é aviso; variável de anexo ausente do corpo é o **normal**, porque ela viaja ao lado da
mensagem. Sem o tipo, todo anexo obrigatório apareceria eternamente como "faltando no texto".

O caso inverso virou `attachmentsInText` no diff: `{{nota}}` escrito no corpo renderiza a URL crua no
meio da frase e não anexa nada. Aviso, não erro — mandar o link é escolha legítima, só não é essa.

**3. Bucket próprio e privado, separado do `ada-products`.** Anexo é dado pessoal, entregue por URL
assinada de vida curta; imagem de produto é asset público que a Meta busca. Dividir o bucket é errar
por descuido — basta alguém copiar `OBJECT_STORAGE_PUBLIC_BASE_URL` para o anexo e o arquivo vira
público. Chave do objeto **sem dado pessoal** (`security.md` §7): `nota-fiscal-joao-silva.pdf` não
pode ser a chave.

**4. `https` obrigatório, e validação antes de qualquer rede.** `checkEmailAttachment` recusa nome
vazio, travessia de diretório (`../`, `/`, `\` — o nome vai para o cabeçalho MIME e depois para o
disco de quem salva), `contentType` vazio (extensão mente, e cliente de e-mail confia) e URL que não
seja `https` (`file:` puxaria do disco do servidor, `data:` inflaria a mensagem, `http:` trafega
documento pessoal em claro). Devolve o motivo em vez de lançar, para a `delivery` registrar a causa.

Tetos: **25MB** por anexo (Gmail e Outlook recusam acima, e o SES conta o MIME já em base64, que
infla ~33%) e **10 anexos** por mensagem.

**5. A fila passa a ser BullMQ sobre o Redis que já existe.** `security.md` §6 já é escrito para
BullMQ + Redis — retenção obrigatória, idempotência por chave, `attempts` com backoff exponencial,
DLQ com alerta. O Redis já está no `docker-compose` e no Railway. `@adatechnology/rabbitmq-provider`
existe, mas adicionaria um broker para operar sem ganho neste volume, e o baseline de segurança
teria de ser reescrito para ele.

## Consequências

- **A fila em memória vira bloqueio de produção, não de funcionalidade.** O anexo funciona com ela;
  o que não funciona é a promessa de entrega. Envio com anexo demora mais (download + MIME), então a
  janela de perda por restart aumenta. Trocar por BullMQ e subir um `worker-ada` em `apps/` é
  trabalho separado e anterior ao go-live disto.
- **Três pacotes publicam:** `notification-contracts` (feito), `email-provider` (os três drivers
  baixam e anexam — SMTP aceita stream, Resend quer base64 no JSON, e o SES exige MIME montado à mão)
  e `notification-module` (repassa e registra na entrega **o que** foi anexado: nome e tipo, nunca o
  conteúdo nem a URL assinada, que é credencial).
- **Egress passa a ter custo por envio.** O driver baixa o arquivo a cada entrega: cem e-mails com a
  mesma tabela de preços de 5MB são 500MB de saída. Cache no driver é otimização possível, não parte
  desta decisão.
- **Anexar arquivo a um envio é ação sensível** e entra na trilha de auditoria (`security.md` §10)
  com ator, alvo e timestamp — sem o conteúdo e sem a URL assinada.
- O schema de env hoje é "tudo ou nada" para **um** bucket. Um segundo bucket exige um segundo
  conjunto de variáveis com a mesma validação estrita, senão volta o caso que aquela regra evita:
  bucket meio configurado que sobe a rota e falha só no primeiro upload real.

## Alternativas descartadas

**Bytes no contrato (`content: Uint8Array`).** Resolve sem storage e sem upload, e quebra na fila: o
job carregaria o arquivo, e a retenção do BullMQ manteria cópias de documentos pessoais no Redis por
tempo indeterminado. É exatamente o que `security.md` §6 proíbe.

**Link no corpo em vez de anexo.** Funciona **hoje**, sem alterar contrato nenhum — presigned URL
como variável de texto comum, que é o que `security.md` §7 prescreve para entregar arquivo. Foi
descartado porque o caso é o contador que arquiva a nota e o cliente que encaminha o boleto: os dois
precisam do arquivo dentro da mensagem, não de um link que expira.

**Reusar o `ada-products`.** Um bucket a menos para operar, e um vazamento a mais para explicar: ele
é servido com leitura anônima, e anexo de notificação é dado pessoal.
