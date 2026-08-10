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
  FLOW_CREATED: 'flow.created',
  FLOW_CHANGED: 'flow.changed',
  FLOW_DELETED: 'flow.deleted',
  KNOWLEDGE_ITEM_CHANGED: 'knowledge.item_changed',
  LEAD_CHANGED: 'lead.changed',
  SETTINGS_CHANGED: 'settings.changed',
  TEMPLATE_CREATED: 'template.created',
} as const;
export type AuditAction = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

export const AUDIT_TARGET = {
  AGENT: 'agent',
  CONVERSATION: 'conversation',
  FLOW: 'flow',
  KNOWLEDGE_ITEM: 'knowledge_item',
  LEAD: 'lead',
  SETTINGS: 'settings',
  TEMPLATE: 'template',
} as const;
export type AuditTarget = (typeof AUDIT_TARGET)[keyof typeof AUDIT_TARGET];
