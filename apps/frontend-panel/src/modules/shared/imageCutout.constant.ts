/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type { BackgroundRemovalConfig } from '@adatechnology/image-cutout';

/**
 * Onde o painel serve o modelo e o runtime do recorte de fundo.
 *
 * Duas telas usam os mesmos arquivos — foto de produto e foto de perfil — e um caminho divergindo
 * entre elas quebraria uma das duas em silencio, so no clique.
 *
 * Tudo servido pelo proprio painel: a foto nunca sai da maquina de quem sobe, e nao ha CDN de
 * terceiro no CSP. `u2netp` e a variante leve do U2-Net (Apache-2.0); a `u2net_portrait`, que seria
 * a melhor para rosto, tem dataset nao-comercial e nao pode entrar aqui.
 */
export const IMAGE_CUTOUT: BackgroundRemovalConfig = {
  modelUrl: '/models/u2netp.onnx',
  runtimeUrl: '/ort/ort.wasm.min.js',
  wasmPaths: '/ort/',
};
