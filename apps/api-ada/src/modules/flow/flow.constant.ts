/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/** A chave vira segmento de URL e nome de salto `flow:` — sem espaco, sem acento, sem maiuscula. */
export const FLOW_KEY_PATTERN = /^[a-z0-9_-]+$/;

export const FLOW_KEY_MAX_LENGTH = 60;
export const FLOW_LABEL_MAX_LENGTH = 120;

/**
 * Teto de nos por grafo.
 *
 * O grafo inteiro viaja em cada salvamento e e interpretado a cada mensagem; um fluxo maior que isso
 * nao e um fluxo, e um programa, e devia estar quebrado em varios com salto entre eles.
 */
export const FLOW_MAX_NODES = 200;

export const NEW_FLOW_START_NODE_ID = 'inicio';
