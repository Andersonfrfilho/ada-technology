/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type {
  TemplateSettings,
  WhatsAppCreateTemplateResult,
  WhatsAppCreateTemplateState,
  WhatsAppTemplateSummary,
} from '@adatechnology/conversations-ui';

import {
  createTemplate,
  fetchTemplateSettings,
  listTemplates,
  saveTemplateSettings,
} from '@/modules/settings/settings.api';
import {
  EMPTY_TEMPLATE_DRAFT,
  EMPTY_TEMPLATE_SETTINGS,
  SAVE_FEEDBACK_MS,
} from '@/modules/settings/settings.constant';
import settingsLocale from '@/modules/settings/settings.locale.json';
import type { TemplateSettingsState } from '@/modules/settings/types/settings.types';

export function useTemplateSettings(): TemplateSettingsState {
  const [templates, setTemplates] = useState<WhatsAppTemplateSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState(false);

  const [settings, setSettings] = useState<TemplateSettings>(EMPTY_TEMPLATE_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [draft, setDraft] = useState<WhatsAppCreateTemplateState>(EMPTY_TEMPLATE_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<WhatsAppCreateTemplateResult | null>(null);

  const refreshTemplates = useCallback(async (): Promise<void> => {
    setLoadingTemplates(true);
    setTemplatesError(false);
    try {
      setTemplates(await listTemplates());
    } catch {
      setTemplatesError(true);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    void refreshTemplates();
  }, [refreshTemplates]);

  /**
   * A lista da Meta e o nome salvo sao buscas independentes.
   *
   * Sem WhatsApp configurado a listagem responde 503, e ainda assim a tela precisa abrir para
   * mostrar (e permitir corrigir) o nome que ja esta gravado.
   */
  useEffect(() => {
    let active = true;

    void fetchTemplateSettings()
      .then((loaded) => {
        if (active) setSettings(loaded);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  function flashSaved(): void {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), SAVE_FEEDBACK_MS);
  }

  /**
   * Escolher template com variaveis e deixar a lista vazia manda o envio a Meta sem parametro, e
   * ela rejeita. Abrir os campos evita isso — so quando ninguem preencheu nada ainda.
   */
  function selectTemplate(name: string, template: WhatsAppTemplateSummary | undefined): void {
    setSettings((previous) => {
      if (!template) return { ...previous, templateName: name };

      const shouldSeed = template.variableCount > 0 && previous.variables.length === 0;

      return {
        templateName: template.name,
        templateLanguage: template.language,
        variables: shouldSeed ? Array.from({ length: template.variableCount }, () => '') : previous.variables,
      };
    });
  }

  function changeVariables(variables: string[]): void {
    setSettings((previous) => ({ ...previous, variables }));
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSaving(true);
    try {
      await saveTemplateSettings(settings);
      flashSaved();
    } finally {
      setSaving(false);
    }
  }

  async function submitDraft(event: FormEvent): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const created = await createTemplate(draft);
      setSubmitResult({ ok: true, message: settingsLocale.templates.createSucceeded, status: created.status });
      setDraft(EMPTY_TEMPLATE_DRAFT);
      void refreshTemplates();
    } catch (error) {
      const message = error instanceof Error ? error.message : settingsLocale.templates.createFailed;
      setSubmitResult({ ok: false, message });
    } finally {
      setSubmitting(false);
    }
  }

  return {
    templates,
    loadingTemplates,
    templatesError,
    refreshTemplates: () => void refreshTemplates(),
    settings,
    selectTemplate,
    changeVariables,
    saving,
    saveSuccess,
    save: (event) => void save(event),
    draft,
    changeDraft: setDraft,
    submitDraft: (event) => void submitDraft(event),
    submitting,
    submitResult,
  };
}
