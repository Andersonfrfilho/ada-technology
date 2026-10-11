/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { describe, expect, it } from 'bun:test';

import {
  canSeeSection,
  PANEL_GROUP,
  PANEL_SECTION,
  visibleSectionGroups,
  type PanelSection,
} from '@/modules/shared/navigation/panelSection.constant';

const INFRA_SECTIONS = [PANEL_SECTION.INFRA_ENVIRONMENTS, PANEL_SECTION.INFRA_COSTS, PANEL_SECTION.INFRA_INTEGRATION];

describe('navegacao de infraestrutura', () => {
  it('mostra o grupo de infra com as tres secoes para admin', () => {
    const group = visibleSectionGroups(true).find((candidate) => candidate.group === PANEL_GROUP.INFRA);

    expect(group?.items.map((item) => item.section)).toEqual(INFRA_SECTIONS);
  });

  it('esconde o grupo de infra do agente', () => {
    const groups = visibleSectionGroups(false);

    expect(groups.some((group) => group.group === PANEL_GROUP.INFRA)).toBe(false);
  });

  it('so o admin alcanca as secoes de infra por URL direta', () => {
    for (const section of INFRA_SECTIONS) {
      expect(canSeeSection(section, true)).toBe(true);
      expect(canSeeSection(section, false)).toBe(false);
    }
  });
});

describe('navegacao da integracao de infraestrutura', () => {
  it('usa o caminho integracao', () => {
    expect(PANEL_SECTION.INFRA_INTEGRATION).toBe('integracao');
  });

  it('admin ve a integracao e o agente nao', () => {
    const sectionsOf = (isAdmin: boolean): PanelSection[] =>
      visibleSectionGroups(isAdmin).flatMap((group) => group.items.map((item) => item.section));

    expect(sectionsOf(true)).toContain(PANEL_SECTION.INFRA_INTEGRATION);
    expect(sectionsOf(false)).not.toContain(PANEL_SECTION.INFRA_INTEGRATION);
  });
});
