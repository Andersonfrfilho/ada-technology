/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

import { EMAIL_GMAIL_CLIP_BYTES, EMAIL_HTML_PROBLEM } from './emailValidation.constant';
import type { EmailHtmlProblem, ValidateEmailHtmlResult } from './types/emailValidation.types';

/**
 * Confere o HTML contra o que cliente de e-mail realmente faz.
 *
 * Nao e validacao de HTML: um documento pode ser perfeitamente valido e ainda assim chegar
 * quebrado, porque Outlook desenha com o motor do Word, Gmail remove `<style>` no encaminhamento e
 * imagem remota chega bloqueada. O que se valida aqui e a distancia entre "HTML correto" e "HTML
 * que sobrevive a entrega" — e essa distancia so aparece na caixa de entrada de quem recebeu, tarde
 * demais para consertar.
 *
 * `error` reprova o envio; `warning` degrada o e-mail sem impedi-lo.
 */
export function validateEmailHtml(html: string): ValidateEmailHtmlResult {
  const problems: EmailHtmlProblem[] = [];
  const byteSize = new TextEncoder().encode(html).length;

  if (/<script[\s>]/i.test(html)) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.SCRIPT,
      severity: 'error',
      message: 'Script no e-mail: todo cliente remove, e a presenca sozinha aumenta a chance de cair em spam.',
    });
  }

  if (/<link[^>]+stylesheet/i.test(html)) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.EXTERNAL_STYLESHEET,
      severity: 'error',
      message: 'Folha de estilo externa nao carrega em e-mail. Use estilo inline no proprio elemento.',
    });
  }

  if (/<img[^>]+src\s*=\s*["']?data:/i.test(html)) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.DATA_URI_IMAGE,
      severity: 'error',
      message: 'Imagem em `data:` e descartada pelo Gmail e pelo Outlook. Publique o arquivo e use URL absoluta.',
    });
  }

  const imagesWithoutAlt = [...html.matchAll(/<img\b[^>]*>/gi)].filter((match) => !/\balt\s*=/i.test(match[0]));
  if (imagesWithoutAlt.length > 0) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.IMAGE_WITHOUT_ALT,
      severity: 'warning',
      message: `${imagesWithoutAlt.length} imagem(ns) sem \`alt\`. Imagem remota chega bloqueada por padrao: sem o texto, o lugar dela fica vazio.`,
    });
  }

  // `src`/`href` que nao seja absoluto, `mailto:`, `tel:` ou ancora: em e-mail nao existe base.
  if (/\b(?:src|href)\s*=\s*["'](?!https?:|mailto:|tel:|#|cid:|data:)[^"']+["']/i.test(html)) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.RELATIVE_URL,
      severity: 'error',
      message: 'URL relativa no e-mail. Sem pagina de origem, o cliente nao tem como resolver o caminho.',
    });
  }

  if (/(?:display\s*:\s*(?:flex|grid)|position\s*:\s*(?:absolute|fixed))/i.test(html)) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.MODERN_LAYOUT,
      severity: 'warning',
      message: 'Flex, grid ou posicionamento absoluto: o Outlook ignora e o bloco desmonta. Use tabela.',
    });
  }

  if (byteSize > EMAIL_GMAIL_CLIP_BYTES) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.GMAIL_CLIP,
      severity: 'warning',
      message: `${Math.round(byteSize / 1024)}KB: acima de 102KB o Gmail corta e esconde o fim atras de "ver mensagem inteira".`,
    });
  }

  if (!/<title\b/i.test(html)) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.MISSING_TITLE,
      severity: 'warning',
      message: 'Sem `<title>`: alguns clientes usam esse texto como rotulo ao abrir o e-mail numa aba.',
    });
  }

  const unbalanced = findUnbalancedTag(html);
  if (unbalanced) {
    problems.push({
      code: EMAIL_HTML_PROBLEM.UNBALANCED_TAGS,
      severity: 'error',
      message: `Tag \`<${unbalanced}>\` sem fechamento correspondente. Tabela desbalanceada some inteira no Outlook.`,
    });
  }

  return {
    isValid: problems.every((problem) => problem.severity !== 'error'),
    problems,
    byteSize,
  };
}

/**
 * So os elementos estruturais, e so contagem: parser de HTML completo nao cabe aqui, e o que
 * derruba e-mail e `<table>`/`<tr>`/`<td>` fora de par — o Outlook engole a tabela inteira.
 */
const BALANCED_TAGS = ['table', 'tr', 'td', 'html', 'body'] as const;

function findUnbalancedTag(html: string): string | undefined {
  for (const tag of BALANCED_TAGS) {
    const opened = html.match(new RegExp(`<${tag}\\b`, 'gi'))?.length ?? 0;
    const closed = html.match(new RegExp(`</${tag}\\s*>`, 'gi'))?.length ?? 0;
    if (opened !== closed) return tag;
  }
  return undefined;
}
