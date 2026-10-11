/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

export const ACTOR_TYPE = {
  AGENT: 'agent',
  SYSTEM: 'system',
} as const;
export type ActorType = (typeof ACTOR_TYPE)[keyof typeof ACTOR_TYPE];

export const AUDIT_ACTION = {
  AGENT_SIGNED_IN: 'agent.signed_in',
  AGENT_SIGNED_OUT: 'agent.signed_out',
  AGENT_SIGN_IN_FAILED: 'agent.sign_in_failed',
  CONVERSATION_TAKEN_OVER: 'conversation.taken_over',
  CONVERSATION_RELEASED: 'conversation.released',
  CONVERSATION_FINISHED: 'conversation.finished',
  CONVERSATION_EXPORTED: 'conversation.exported',
  CONVERSATION_SIMULATED: 'conversation.simulated',
  FLOW_CREATED: 'flow.created',
  FLOW_CHANGED: 'flow.changed',
  FLOW_DELETED: 'flow.deleted',
  KNOWLEDGE_ITEM_CHANGED: 'knowledge.item_changed',
  LEAD_CHANGED: 'lead.changed',
  SCHEDULE_CHANGED: 'schedule.changed',
  APPOINTMENT_BOOKED: 'appointment.booked',
  APPOINTMENT_CANCELED: 'appointment.canceled',
  SETTINGS_CHANGED: 'settings.changed',
  TEMPLATE_CREATED: 'template.created',
  INFRA_ENVIRONMENT_POWERED_OFF: 'infra.environment_powered_off',
  INFRA_ENVIRONMENT_POWERED_ON: 'infra.environment_powered_on',
  INFRA_SCHEDULE_CHANGED: 'infra.schedule_changed',
  INFRA_ENVIRONMENT_POWER_REQUESTED: 'infra.environment_power_requested',
  INFRA_ENVIRONMENT_POWER_DENIED: 'infra.environment_power_denied',
  INFRA_OPERATION_INTERRUPTED: 'infra.operation_interrupted',
  INFRA_INTEGRATION_CONFIGURED: 'infra.integration_configured',
  INFRA_INTEGRATION_REPLACED: 'infra.integration_replaced',
  INFRA_INTEGRATION_REMOVED: 'infra.integration_removed',
  INFRA_INTEGRATION_VERIFIED: 'infra.integration_verified',
  INFRA_INTEGRATION_DENIED: 'infra.integration_denied',
  INFRA_INTEGRATION_LOCKED: 'infra.integration_locked',
} as const;
export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_TARGET = {
  AGENT: 'agent',
  APPOINTMENT: 'appointment',
  CONVERSATION: 'conversation',
  FLOW: 'flow',
  INFRA_ENVIRONMENT: 'infra_environment',
  INFRA_INTEGRATION: 'infra_integration',
  KNOWLEDGE_ITEM: 'knowledge_item',
  LEAD: 'lead',
  SCHEDULE: 'schedule',
  SETTINGS: 'settings',
  TEMPLATE: 'template',
} as const;
export type AuditTarget = (typeof AUDIT_TARGET)[keyof typeof AUDIT_TARGET];
