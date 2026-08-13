/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const CATALOG_WEBHOOK_PATH = '/v1/meta/catalog/webhook';

export const CATALOG_WEBHOOK_FIELD = {
  PRODUCT_CATALOGS: 'product_catalogs',
} as const;

export const CATALOG_REVIEW_STATUS = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
