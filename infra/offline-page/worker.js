/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import offlinePage from './index.html';
import { buildOfflineResponse, isRailwayStoppedResponse } from './offlineResponse.js';

export default {
  async fetch(request, environment) {
    const response = await fetch(request);
    if (!isRailwayStoppedResponse(response)) return response;

    return buildOfflineResponse({ pageHtml: offlinePage, environmentName: environment.ENVIRONMENT_NAME });
  },
};
