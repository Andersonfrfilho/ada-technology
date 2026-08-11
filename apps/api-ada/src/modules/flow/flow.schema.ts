/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  WHATSAPP_CHOICE_LIMIT,
  flowGraphNodesSchema,
  type FlowGraphData,
} from '@adatechnology/meta-whatsapp-contracts';
import { z } from 'zod';

import {
  FLOW_KEY_MAX_LENGTH,
  FLOW_KEY_PATTERN,
  FLOW_LABEL_MAX_LENGTH,
  FLOW_MAX_NODES,
} from '@/modules/flow/flow.constant';

export const flowKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(FLOW_KEY_MAX_LENGTH)
  .regex(FLOW_KEY_PATTERN, 'Use apenas minusculas, digitos, hifen e sublinhado');

const flowLabelSchema = z.string().trim().min(1).max(FLOW_LABEL_MAX_LENGTH);

/**
 * O grafo chega inteiro do editor, e nao parcialmente.
 *
 * `flowGraphNodesSchema` vem do proprio pacote que interpreta o grafo: validar com uma copia local
 * significaria aceitar hoje o que o interpretador rejeita em producao amanha.
 */
export const flowGraphSchema = z.object({
  key: flowKeySchema,
  label: flowLabelSchema,
  startNodeId: z.string().trim().min(1),
  version: z.number().int().nonnegative(),
  nodes: flowGraphNodesSchema
    .refine(
      (nodes) => Object.keys(nodes).length <= FLOW_MAX_NODES,
      `Um fluxo aceita no maximo ${FLOW_MAX_NODES} nos`,
    )
    .superRefine(addChoiceLimitIssues),
});

/**
 * Recusa na publicacao o titulo que a Meta recusaria no envio.
 *
 * Passar do teto nao degrada a mensagem: a Graph API rejeita o envio inteiro e o cliente ve
 * silencio — erro que so apareceria em producao, com o lead do outro lado. Aqui ele aparece para
 * quem editou, na hora de salvar.
 *
 * A contagem e a de `length`, entao um emoji custa dois. Se a Meta contar por grafema, a regra
 * apenas recusa antes dela — errar para o lado seguro e o ponto.
 */
function addChoiceLimitIssues(
  nodes: z.infer<typeof flowGraphNodesSchema>,
  ctx: z.RefinementCtx,
): void {
  for (const [nodeId, node] of Object.entries(nodes)) {
    const options = node.options ?? [];
    if (options.length === 0) continue;

    if (options.length > WHATSAPP_CHOICE_LIMIT.LIST_ROWS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [nodeId, 'options'],
        message: `O no "${nodeId}" passa de ${WHATSAPP_CHOICE_LIMIT.LIST_ROWS} opcoes — quebre em dois nos`,
      });
      continue;
    }

    addTitleLengthIssues({ nodeId, options, ctx });
  }
}

function addTitleLengthIssues(params: {
  nodeId: string;
  options: readonly (readonly [string, string])[];
  ctx: z.RefinementCtx;
}): void {
  const isButton = params.options.length <= WHATSAPP_CHOICE_LIMIT.BUTTONS;
  const maxLength = isButton
    ? WHATSAPP_CHOICE_LIMIT.BUTTON_TITLE_LENGTH
    : WHATSAPP_CHOICE_LIMIT.LIST_ROW_TITLE_LENGTH;
  const format = isButton ? 'botao' : 'lista';

  params.options.forEach(([, title], index) => {
    if (title.length <= maxLength) return;

    params.ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [params.nodeId, 'options', index, 1],
      message: `"${title}" tem ${title.length} caracteres e sai como ${format}, que aceita ${maxLength}`,
    });
  });
}

/**
 * Le o grafo do corpo da requisicao ja no formato que o interpretador consome.
 *
 * O `zod` tipa todo campo opcional como `string | undefined`, e `exactOptionalPropertyTypes` recusa
 * isso onde o contrato declara `campo?: string`. Nenhum desses campos chega com valor `undefined` —
 * JSON so tem ausencia — entao remove-los faz o objeto e o tipo voltarem a descrever a mesma coisa.
 */
export function parseFlowGraph(input: unknown): FlowGraphData {
  const graph = flowGraphSchema.parse(input);

  const nodes = Object.fromEntries(
    Object.entries(graph.nodes).map(([id, node]) => [id, pruneUndefinedValues(node)]),
  ) as FlowGraphData['nodes'];

  return {
    key: graph.key,
    label: graph.label,
    startNodeId: graph.startNodeId,
    version: graph.version,
    nodes,
  };
}

function pruneUndefinedValues(node: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(node).filter(([, value]) => value !== undefined));
}

export const createFlowSchema = z.object({
  key: flowKeySchema,
  label: flowLabelSchema,
  showInMenu: z.boolean(),
  menuOptionLabel: flowLabelSchema.optional(),
});
