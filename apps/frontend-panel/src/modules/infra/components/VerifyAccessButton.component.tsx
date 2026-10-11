/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { RefreshCw } from 'lucide-react';

import { IntegrationNotice } from '@/modules/infra/components/IntegrationNotice.component';
import { useCooldown } from '@/modules/infra/cooldown.hook';
import { INFRA_ERROR_CODE, type InfraAccessStatus } from '@/modules/infra/infra.constant';
import infraLocale from '@/modules/infra/infra.locale.json';
import { INTEGRATION_VERIFY_COOLDOWN_MS } from '@/modules/infra/infraIntegration.constant';
import { useResetMutationOnUnmount, useVerifyInfraIntegration } from '@/modules/infra/infraIntegration.hook';
import { resolveIntegrationErrorMessage } from '@/modules/infra/infraIntegration.util';
import { INFRA_BUTTON_SECONDARY } from '@/modules/infra/infraStyle.constant';
import { PanelApiError } from '@/modules/shared/http/http.error';

type VerifyAccessButtonProps = {
  readonly onVerified: (access: InfraAccessStatus) => void;
};

const locale = infraLocale.integration.status;

function isRateLimited(error: unknown): boolean {
  return (
    error instanceof PanelApiError &&
    (error.code === INFRA_ERROR_CODE.RATE_LIMITED || error.code === INFRA_ERROR_CODE.RAILWAY_RATE_LIMITED)
  );
}

export function VerifyAccessButton({ onVerified }: VerifyAccessButtonProps) {
  const { mutate, reset, isPending, isError, error } = useVerifyInfraIntegration();
  const { isCoolingDown, startCooldown } = useCooldown(INTEGRATION_VERIFY_COOLDOWN_MS);
  useResetMutationOnUnmount(reset);

  function handleVerify() {
    mutate(undefined, {
      onSuccess: (result) => onVerified(result.access),
      onError: (failure) => {
        if (isRateLimited(failure)) startCooldown();
      },
    });
  }

  return (
    <div className="space-y-2">
      <button
        className={INFRA_BUTTON_SECONDARY}
        disabled={isPending || isCoolingDown}
        onClick={handleVerify}
        type="button"
      >
        <RefreshCw aria-hidden="true" className={`size-4 ${isPending ? 'motion-safe:animate-spin' : ''}`} />
        {isPending ? locale.verifying : locale.verify}
      </button>
      {isCoolingDown ? <IntegrationNotice isInformational message={locale.verifyCooldown} /> : null}
      {isError && !isCoolingDown ? (
        <IntegrationNotice isInformational={false} message={resolveIntegrationErrorMessage(error)} />
      ) : null}
    </div>
  );
}
