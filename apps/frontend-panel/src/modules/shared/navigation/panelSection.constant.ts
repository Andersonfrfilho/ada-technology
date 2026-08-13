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

export const PANEL_GROUP = {
  SERVICE: 'atendimento',
  CONTENT: 'conteudo',
  REGISTRY: 'cadastros',
} as const;

export type PanelGroup = (typeof PANEL_GROUP)[keyof typeof PANEL_GROUP];

export type PanelSectionGroup = {
  readonly group: PanelGroup;
  readonly items: readonly PanelSectionItem[];
};

/**
 * O menu e agrupado pelo que a pessoa esta fazendo, nao pelo alfabeto.
 *
 * Sete itens seguidos viraram uma lista que se le inteira toda vez para achar um. Em tres blocos o
 * olho para no titulo do bloco: quem esta atendendo nunca desce ate os cadastros, e quem vai mexer
 * em produto nao passa pela fila. A ordem dentro do bloco continua sendo a do trabalho.
 *
 * O rotulo nao mora aqui — vem do `shared.locale.json`, pela chave da secao e do grupo.
 */
export const PANEL_SECTION_GROUPS: readonly PanelSectionGroup[] = [
  {
    group: PANEL_GROUP.SERVICE,
    items: [
      { section: PANEL_SECTION.CONVERSATIONS, icon: MessageSquare },
      { section: PANEL_SECTION.FLOWS, icon: Workflow },
      { section: PANEL_SECTION.MESSAGES, icon: Send },
      { section: PANEL_SECTION.TEMPLATES, icon: LayoutTemplate },
    ],
  },
  {
    group: PANEL_GROUP.CONTENT,
    items: [
      { section: PANEL_SECTION.CATALOG, icon: Package },
      { section: PANEL_SECTION.DOCUMENTS, icon: FileText },
    ],
  },
  {
    group: PANEL_GROUP.REGISTRY,
    items: [{ section: PANEL_SECTION.LEADS, icon: Users }],
  },
];

/** Lista plana, para quem so precisa percorrer as secoes sem se importar com o agrupamento. */
export const PANEL_SECTION_ITEMS: readonly PanelSectionItem[] = PANEL_SECTION_GROUPS.flatMap(
  (group) => group.items,
);

/** Escrita por Clientes ao abrir um lead e lida pela fila para ja selecionar aquela conversa. */
export const CONVERSATION_URL_KEY = 'conversa';

const SECTIONS: readonly string[] = Object.values(PANEL_SECTION);

export function isPanelSection(value: string): value is PanelSection {
  return SECTIONS.includes(value);
}
