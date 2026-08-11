/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { API_BASE_ATTRIBUTE, WIDGET_TAG_NAME } from '@adatechnology/web-chat-widget';

import { environment } from '@/modules/shared/config/environment';

/**
 * O elemento nasce daqui, e nao do HTML, para a origem da API vir do env validado.
 *
 * Atributo escrito a mao no `index.html` seria o mesmo dominio nos tres ambientes — e o servidor
 * confere o `Origin`, entao o erro so apareceria depois do deploy.
 */
const widget = document.createElement(WIDGET_TAG_NAME);
widget.setAttribute(API_BASE_ATTRIBUTE, environment.VITE_API_BASE_URL);
document.body.append(widget);
