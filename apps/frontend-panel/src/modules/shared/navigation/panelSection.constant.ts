/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import {
  FileText,
  Package,
  LayoutTemplate,
  MessageSquare,
  Send,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

/**
 * O valor da secao e o proprio caminho da URL.
 *
 * Uma tabela caminho -> secao existiria so para ser esquecida ao adicionar a proxima tela; aqui um
 * termo em portugues serve as duas coisas, e o atendente que cola a URL manda junto onde estava.
 */
export const PANEL_SECTION = {
  CONVERSATIONS: 'conversas',
  FLOWS: 'fluxos',
  MESSAGES: 'mensagens',
  TEMPLATES: 'templates',
  CATALOG: 'catalogo',
  DOCUMENTS: 'documentos',
  LEADS: 'clientes',
} as const;

export type PanelSection = (typeof PANEL_SECTION)[keyof typeof PANEL_SECTION];

export const DEFAULT_PANEL_SECTION: PanelSection = PANEL_SECTION.CONVERSATIONS;

export type PanelSectionItem = {
  readonly section: PanelSection;
  readonly icon: LucideIcon;
};

/**
 * A ordem e a do trabalho, nao a do alfabeto: a fila primeiro, o que se manda depois, e o cadastro
 * por ultimo. O rotulo nao mora aqui — vem do `shared.locale.json` pela chave da secao.
 */
export const PANEL_SECTION_ITEMS: readonly PanelSectionItem[] = [
  { section: PANEL_SECTION.CONVERSATIONS, icon: MessageSquare },
  { section: PANEL_SECTION.FLOWS, icon: Workflow },
  { section: PANEL_SECTION.MESSAGES, icon: Send },
  { section: PANEL_SECTION.TEMPLATES, icon: LayoutTemplate },
  { section: PANEL_SECTION.CATALOG, icon: Package },
  { section: PANEL_SECTION.DOCUMENTS, icon: FileText },
  { section: PANEL_SECTION.LEADS, icon: Users },
];

/** Escrita por Clientes ao abrir um lead e lida pela fila para ja selecionar aquela conversa. */
export const CONVERSATION_URL_KEY = 'conversa';

const SECTIONS: readonly string[] = Object.values(PANEL_SECTION);

export function isPanelSection(value: string): value is PanelSection {
  return SECTIONS.includes(value);
}
