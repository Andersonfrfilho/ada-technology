/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { USER_ROLE } from '@ada/user-sdk';

import { CatalogPage } from '@/modules/catalog/Catalog.page';
import { DocumentsPage } from '@/modules/documents/Documents.page';
import { FlowsPage } from '@/modules/flows/Flows.page';
import { InboxPage } from '@/modules/inbox/Inbox.page';
import { AgentsPage } from '@/modules/agents/Agents.page';
import { LeadsPage } from '@/modules/leads/Leads.page';
import { NotificationPage } from '@/modules/notification/Notification.page';
import { SchedulingPage } from '@/modules/scheduling/Scheduling.page';
import { useSessionStore } from '@/modules/shared/session/session.store';
import sharedLocale from '@/modules/shared/shared.locale.json';
import { MessagesPage } from '@/modules/settings/Messages.page';
import { TemplatesPage } from '@/modules/settings/Templates.page';
import { canSeeSection, PANEL_SECTION, type PanelSection } from '@/modules/shared/navigation/panelSection.constant';

type PanelSectionViewProps = {
  readonly section: PanelSection;
};

/**
 * O `switch` e exaustivo de proposito.
 *
 * Item novo na barra lateral sem tela por tras nao compila — e o que impede a secao vazia com
 * "em breve" de chegar ao operador.
 */
export function PanelSectionView({ section }: PanelSectionViewProps) {
  const isAdmin = useSessionStore((state) => state.agent?.role === USER_ROLE.ADMIN);

  /**
   * Esconder o item do menu nao impede ninguem de digitar a URL. Isto tambem NAO e a barreira — a
   * API recusa de qualquer forma —, mas evita a tela abrir, carregar e so entao falhar em cada
   * chamada, que e pior de entender do que nao abrir.
   */
  if (!canSeeSection(section, isAdmin)) return <SectionNotAllowed />;

  switch (section) {
    case PANEL_SECTION.CONVERSATIONS:
      return <InboxPage />;
    case PANEL_SECTION.SCHEDULE:
      return <SchedulingPage />;
    case PANEL_SECTION.FLOWS:
      return <FlowsPage />;
    case PANEL_SECTION.MESSAGES:
      return <MessagesPage />;
    case PANEL_SECTION.TEMPLATES:
      return <TemplatesPage />;
    case PANEL_SECTION.CATALOG:
      return <CatalogPage />;
    case PANEL_SECTION.DOCUMENTS:
      return <DocumentsPage />;
    case PANEL_SECTION.LEADS:
      return <LeadsPage />;
    case PANEL_SECTION.NOTIFICATIONS:
      return <NotificationPage />;
    case PANEL_SECTION.AGENTS:
      return <AgentsPage />;
  }
}

/** Nao diz "voce nao tem permissao para USUARIOS": nomear a secao confirma que ela existe. */
function SectionNotAllowed() {
  return (
    <section className="flex h-full items-center justify-center p-6">
      <p className="text-sm text-ink-500">{sharedLocale.nav.sectionNotAllowed}</p>
    </section>
  );
}
