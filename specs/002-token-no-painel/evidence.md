# Evidência — Spec 002 Token no painel

Uma linha por task: comando, resultado, commit. Escaladas de modelo também entram aqui.
O token do Railway nunca aparece neste arquivo: testes usam valor-isca.

| Task | Comando | Resultado | Commit |
|---|---|---|---|
| Preparação | `git fetch` + conferência da base; `make validate` | branch `feat/infra-token-no-painel` sobre `main` com o merge do PR #12 (`5496478a`) | — |
| T0.1 | `architect` e `security-reviewer` (`opus`, somente leitura) sobre spec, plano e código; conferência própria dos achados no código | **Arquitetura: executável com ajustes** (10 obrigatórios). **Segurança: aprovar com ajustes obrigatórios, 0 críticos, 5 altos, 6 médios, 6 baixos.** Conferido por mim no código: a `api-ada` **não tem Sentry**; `findById` do agente não traz o hash da senha; `RAILWAY_ENVIRONMENT_ID` só é exigida com `RAILWAY_API_TOKEN`; as chaves de cache não identificam token/workspace; sem tarefas o scheduler nem cria o `setInterval`; a redação do logger casa só por chave **exata** e `audit_logs.metadata` é gravado sem redação; **CORS devolve credenciais também para as origens do widget e `POST /auth/refresh` não checa `Origin`** (achado anterior à feature). Mudanças adotadas: `resolveGateway()` por `execute` (em vez de gateway que delega), workspace fixado no ambiente e token de conta recusado, fonte única com fail closed, limpeza do Redis, bloqueio na 5ª falha de senha, redação por substring, pré-requisito RF14 (CORS/refresh), scheduler só em produção, `key_id` e AAD completo, formulário sem captura por gerenciador de senhas. Não adotado nesta spec: contador de falhas compartilhado com o **login** (não alteramos o login) e aviso por e-mail (item aberto no ADR). ADR 0005 escrito | — |

