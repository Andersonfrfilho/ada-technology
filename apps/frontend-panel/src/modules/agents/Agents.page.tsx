/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { UserPlus } from 'lucide-react';

import { useAgentList } from '@/modules/agents/agentList.hook';
import { AGENT_PASSWORD_MIN_LENGTH, AGENT_ROLES } from '@/modules/agents/agents.constant';
import agentsLocale from '@/modules/agents/agents.locale.json';

const FIELD = 'w-full rounded-panel border border-ink-200 px-3 py-2 text-sm';
const LABEL = 'mb-1 block text-sm font-medium text-ink-900';

export function AgentsPage() {
  const list = useAgentList();

  return (
    <section className="flex h-full flex-col gap-4 overflow-y-auto p-4 desktop:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-900">{agentsLocale.title}</h1>
          <p className="mt-1 text-sm text-ink-500">{agentsLocale.subtitle}</p>
        </div>

        {!list.isFormOpen && (
          <button
            className="flex min-h-9 items-center gap-2 rounded-panel bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-500"
            onClick={list.openForm}
            type="button"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            {agentsLocale.newAgent}
          </button>
        )}
      </header>

      {list.createdName && (
        <p className="rounded-panel bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {agentsLocale.created}: {list.createdName}
        </p>
      )}

      {list.isFormOpen && (
        <form className="grid gap-4 rounded-panel border border-ink-200 p-4 tablet:grid-cols-2" onSubmit={list.handleSubmit}>
          <div>
            <label className={LABEL} htmlFor="name">
              {agentsLocale.name}
            </label>
            <input className={FIELD} id="name" name="name" required type="text" />
          </div>

          <div>
            <label className={LABEL} htmlFor="email">
              {agentsLocale.email}
            </label>
            <input autoComplete="off" className={FIELD} id="email" name="email" required type="email" />
          </div>

          <div>
            <label className={LABEL} htmlFor="password">
              {agentsLocale.password}
            </label>
            {/* `new-password` e nao `off`: `off` faz o gerenciador oferecer a senha de QUEM ESTA
                logado, e ela acabaria virando a senha da pessoa nova. */}
            <input
              autoComplete="new-password"
              className={FIELD}
              id="password"
              minLength={AGENT_PASSWORD_MIN_LENGTH}
              name="password"
              required
              type="password"
            />
            <p className="mt-1 text-xs text-ink-500">{agentsLocale.passwordHint}</p>
          </div>

          <div>
            <label className={LABEL} htmlFor="role">
              {agentsLocale.role}
            </label>
            <select className={FIELD} defaultValue="agent" id="role" name="role">
              {AGENT_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {agentsLocale[role.labelKey]}
                </option>
              ))}
            </select>
          </div>

          {list.errorMessage && (
            <p className="tablet:col-span-2 rounded-panel bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {list.errorMessage}
            </p>
          )}

          <div className="flex items-center gap-3 tablet:col-span-2">
            <button
              className="min-h-10 rounded-panel bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
              disabled={list.isCreating}
              type="submit"
            >
              {list.isCreating ? agentsLocale.submitting : agentsLocale.submit}
            </button>
            <button className="text-sm text-ink-600" onClick={list.closeForm} type="button">
              {agentsLocale.cancel}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-panel border border-ink-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">{agentsLocale.columnName}</th>
              <th className="px-4 py-3">{agentsLocale.columnRole}</th>
            </tr>
          </thead>
          <tbody>
            {list.agents.map((agent) => (
              <tr className="border-t border-ink-100 odd:bg-ink-50/40" key={agent.id}>
                <td className="px-4 py-3">{agent.name}</td>
                <td className="px-4 py-3">
                  {agent.role === 'admin' ? agentsLocale.roleAdmin : agentsLocale.roleAgent}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {list.isLoading && <p className="px-4 py-8 text-center text-sm text-ink-500">{agentsLocale.loading}</p>}
        {!list.isLoading && list.agents.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-500">{agentsLocale.empty}</p>
        )}
      </div>
    </section>
  );
}
