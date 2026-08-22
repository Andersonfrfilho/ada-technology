/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { SchedulingProvider, SchedulingWorkspace } from '@adatechnology/scheduling-ui';

import { schedulingApi } from '@/modules/scheduling/scheduling.api';
import { useSchedulingArea } from '@/modules/scheduling/schedulingArea.hook';
import schedulingLocale from '@/modules/scheduling/scheduling.locale.json';
import { SCHEDULING_UI_CONFIG } from '@/modules/scheduling/scheduling.constant';

/**
 * A agenda inteira vem do pacote; o painel so diz onde ela fala com a API e como o time chama as
 * coisas — aqui o recurso da agenda e uma pessoa, e a aba se chama atendentes.
 */
export function SchedulingPage() {
  const { area, setArea } = useSchedulingArea();

  return (
    <section className="h-full min-h-0">
      <SchedulingProvider api={schedulingApi} config={SCHEDULING_UI_CONFIG}>
        <SchedulingWorkspace area={area} labels={schedulingLocale.workspace} onAreaChange={setArea} />
      </SchedulingProvider>
    </section>
  );
}
