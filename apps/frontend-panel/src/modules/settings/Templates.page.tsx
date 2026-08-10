/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { WhatsAppTemplatesSettings } from '@adatechnology/conversations-ui';

import settingsLocale from '@/modules/settings/settings.locale.json';
import { useTemplateSettings } from '@/modules/settings/templateSettings.hook';

export function TemplatesPage() {
  const state = useTemplateSettings();

  return (
    <section className="h-full overflow-y-auto p-4 desktop:p-6">
      <header className="mb-4 space-y-0.5">
        <h1 className="text-lg font-semibold text-ink-900 dark:text-white">{settingsLocale.templates.title}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{settingsLocale.templates.subtitle}</p>
      </header>

      <WhatsAppTemplatesSettings
        templates={state.templates}
        loadingTemplates={state.loadingTemplates}
        templatesError={state.templatesError}
        onRefreshTemplates={state.refreshTemplates}
        selectedTemplateName={state.settings.templateName}
        onSelectTemplate={state.selectTemplate}
        variables={state.settings.variables}
        onVariablesChange={state.changeVariables}
        saving={state.saving}
        saveSuccess={state.saveSuccess}
        onSave={state.save}
        create={{
          value: state.draft,
          onChange: state.changeDraft,
          onSubmit: state.submitDraft,
          submitting: state.submitting,
          result: state.submitResult,
        }}
      />
    </section>
  );
}
