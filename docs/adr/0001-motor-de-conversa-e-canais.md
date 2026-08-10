# ADR 0001 — Motor de conversa no módulo do SDK, com o widget entrando pelo mesmo canal

- **Data:** 2026-08-08
- **Status:** aceito

## Contexto

O bot de atendimento precisa responder em dois canais — widget no site e WhatsApp Cloud API — sobre
um único fluxo editável no painel, com takeover humano e uma inbox só.

Ao inspecionar `@adatechnology/meta-whatsapp-module` antes de escrever o motor, ficou claro que o
pacote já entrega o que seria construído: `FlowInterpreter`, `FlowGraphRepository`, `SessionRepository`,
`MessageRepository`, os use-cases de takeover/release/list/export, o `SseHub` de tempo real, a
verificação HMAC do webhook com anti-replay por nonce, e dez migrations próprias que criam o schema
Postgres `meta_whatsapp`.

O schema escrito à mão para este projeto (`contacts`, `conversations`, `messages`, `flows`,
`flow_versions`) duplicava essas tabelas.

## Decisão

**1. O módulo é dono da conversa.** As tabelas `sessions`, `messages`, `flow_graphs`, `documents`,
`flow_media` e `settings` vêm dele, no schema `meta_whatsapp`. As tabelas duplicadas foram removidas.
A Ada mantém apenas o que é seu: `knowledge_*`, `leads`, `agents`, `audit_logs`, no schema `public`.

**2. As duas suítes de migration rodam em sequência,** com journals separados
(`drizzle.meta_whatsapp_migrations` para o módulo, `__drizzle_migrations` para a Ada). O módulo roda
primeiro, porque `leads.session_id` referencia conversa.

**3. `leads.session_id` não tem foreign key.** O `DeleteConversationUseCase` do módulo apaga a sessão
pelo caminho dele; uma FK atravessando schemas travaria essa exclusão e passaria a ser disputada por
duas migrations rivais. O vínculo é por índice, e a limpeza é passo de aplicação.

**4. O widget reusa as peças do módulo em vez de um motor paralelo.** `createMetaWhatsAppModule` fixa
o canal em `WhatsAppChannelAdapter` e não aceita override — mas `ChannelAdapterInterface` é agnóstico
(`sendText(to, body)`, `sendInteractiveList`), e `SendMessageUseCase`, `LogMessageUseCase`,
`FlowInterpreter` e os repositórios são exportados individualmente. Então o widget ganha um
`WidgetChannelAdapter` próprio e um `SendMessageUseCase` composto sobre **os mesmos repositórios e as
mesmas tabelas**. Uma inbox, um grafo, dois canais.

**5. A sessão do widget é chaveada por um id opaco de 17 caracteres** (`w` + 16 hex), porque
`sessions.whatsapp_number` é `varchar(20)` e um UUID de 36 não caberia. Opaco também evita PII na
chave.

## Consequências

- Não escrevemos motor de fluxo, interpretador, cache de grafo nem segurança de webhook: são do
  módulo, e sobem corrigidos a cada atualização de versão.
- O editor visual do painel (`@adatechnology/conversations-ui/flows`) fala com `flow_graphs` do
  módulo sem tradução — é o mesmo formato de grafo dos dois lados.
- Ficamos presos ao formato de sessão do módulo, inclusive ao `varchar(20)` da chave. Um canal futuro
  com identificador maior (e-mail, por exemplo) exigiria uma tabela de correspondência.
- Atualizar o pacote passa a ser evento de migration, não só troca de dependência.

## Alternativa descartada

Instanciar o módulo duas vezes, uma por canal, não funciona: o canal é construído dentro da fábrica a
partir das credenciais da Meta, sem ponto de injeção. Compor os use-cases exportados à mão é o que o
próprio pacote oferece para este caso.
