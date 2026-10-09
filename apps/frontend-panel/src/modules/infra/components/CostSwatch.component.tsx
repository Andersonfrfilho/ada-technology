/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { COST_PRODUCTION_FILL } from '@/modules/infra/infraStyle.constant';
import { COST_KIND, COST_STAGING_PATTERN_ID, type CostKind } from '@/modules/infra/infraUi.constant';

type CostSwatchProps = {
  readonly kind: CostKind;
};

/** Amostra de cor da legenda. Homologacao e listrada, producao e lisa: a diferenca nao depende so do matiz. */
export function CostSwatch({ kind }: CostSwatchProps) {
  const isStaging = kind === COST_KIND.STAGING;

  return (
    <svg aria-hidden="true" className="inline-block size-3.5 shrink-0 rounded-sm" height="14" width="14">
      {isStaging ? (
        <rect fill={`url(#${COST_STAGING_PATTERN_ID})`} height="14" width="14" />
      ) : (
        <rect className={COST_PRODUCTION_FILL} height="14" width="14" />
      )}
    </svg>
  );
}
