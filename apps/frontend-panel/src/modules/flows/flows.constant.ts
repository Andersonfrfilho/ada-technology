/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * A chave do fluxo por onde toda conversa comeca — a mesma que a API recusa excluir.
 *
 * O editor a usa para abrir esse fluxo primeiro e esconder o botao de excluir. As duas pontas
 * precisam concordar: se divergirem, a tela ofereceria excluir o que o servidor sempre recusa.
 */
export const DEFAULT_FLOW_KEY = 'atendimento';
