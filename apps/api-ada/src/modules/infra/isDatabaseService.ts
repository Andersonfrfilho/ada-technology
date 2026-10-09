/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { INFRA_DATABASE_IMAGE_NAMES, INFRA_DATABASE_NAME_PATTERN } from '@/modules/infra/infra.constant';
import type { RailwayServiceInstance } from '@/modules/infra/types/railwayInventory.types';

const DATABASE_IMAGE_NAMES: ReadonlySet<string> = new Set(INFRA_DATABASE_IMAGE_NAMES);

function extractImageName(sourceImage: string): string {
  const lastSegment = sourceImage.split('/').pop() ?? sourceImage;
  return (lastSegment.split(/[:@]/)[0] ?? lastSegment).toLowerCase();
}

export function isDatabaseService(service: RailwayServiceInstance): boolean {
  if (service.sourceImage === undefined || service.sourceImage === '') {
    return INFRA_DATABASE_NAME_PATTERN.test(service.serviceName);
  }
  const imageName = extractImageName(service.sourceImage);
  return DATABASE_IMAGE_NAMES.has(imageName);
}
