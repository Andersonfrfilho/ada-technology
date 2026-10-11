/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useState } from 'react';

import { Trash2 } from 'lucide-react';

import { RemoveIntegrationDialog } from '@/modules/infra/components/RemoveIntegrationDialog.component';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INFRA_BUTTON_DANGER } from '@/modules/infra/infraStyle.constant';

type RemoveIntegrationSectionProps = {
  readonly onRemoved: () => void;
};

export function RemoveIntegrationSection({ onRemoved }: RemoveIntegrationSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div>
      <button className={INFRA_BUTTON_DANGER} onClick={() => setIsDialogOpen(true)} type="button">
        <Trash2 aria-hidden="true" className="size-4" />
        {infraLocale.integration.remove.open}
      </button>
      {isDialogOpen ? <RemoveIntegrationDialog onClose={() => setIsDialogOpen(false)} onRemoved={onRemoved} /> : null}
    </div>
  );
}
