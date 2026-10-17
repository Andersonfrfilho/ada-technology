/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** O mesmo caminho que o `PANEL_RESET_URL_TEMPLATE` da API monta no link do e-mail. */
export const RESET_PASSWORD_PATH = '/reset-password';

export const RESET_TOKEN_QUERY_KEY = 'token';

/**
 * Espelha `ERROR_CODES.agent.RESET_TOKEN_INVALID` da API.
 *
 * O codigo e o contrato entre os dois lados; a `message` do servidor nao esta traduzida para quem
 * le a tela, e casar por texto quebraria na primeira revisao de copy.
 */
export const AGENT_RESET_TOKEN_INVALID = 'AGENT_RESET_TOKEN_INVALID';
