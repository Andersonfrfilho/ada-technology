/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Entrada das paginas legais. Existe so para a folha entrar pelo bundle.
 *
 * A alternativa seria um `<link rel="stylesheet">` no HTML, mas ai o arquivo nao ganharia hash no
 * nome e o `Cache-Control: immutable` de `/assets/*` serviria a versao velha depois de um deploy.
 * Nao ha interacao nesta pagina: o indice e ancora HTML pura.
 */

import './legal.css';
