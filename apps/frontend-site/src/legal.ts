/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Entrada das paginas legais: a folha e o botao de tema.
 *
 * A folha entra pelo bundle em vez de por um `<link rel="stylesheet">` no HTML porque assim ganha
 * hash no nome — sem isso o `Cache-Control: immutable` de `/assets/*` serviria a versao velha depois
 * de um deploy. O indice continua sendo ancora HTML pura, sem JS.
 */

import './legal.css';
import { mountThemeToggle } from './theme';

mountThemeToggle();
