/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import type {
  InfraOperationRecord,
  PowerEnvironmentParams,
} from '@/modules/infra/types/infraOperation.types';
import type { RailwayGatewayInterface } from '@/modules/infra/types/railwayGateway.interface';
import type { RailwayEnvironment, RailwayProject } from '@/modules/infra/types/railwayInventory.types';

export type AdmitParams = {
  readonly params: PowerEnvironmentParams;
  readonly railwayGateway: RailwayGatewayInterface;
};

export type Admission = {
  readonly project: RailwayProject;
  readonly environment: RailwayEnvironment;
  readonly keepOnUntilChange: Date | null | undefined;
  readonly lockOwner: string;
};

export type RegisterParams = Pick<Admission, 'project' | 'keepOnUntilChange' | 'lockOwner'> & {
  readonly params: PowerEnvironmentParams;
};

export type DispatchParams = {
  readonly params: PowerEnvironmentParams;
  readonly admission: Admission;
  readonly operation: InfraOperationRecord;
};
