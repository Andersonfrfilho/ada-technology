import { describe, expect, it } from 'bun:test';

import { buildEmailHtml } from '@/emailLayout.factory';
import { EMAIL_HTML_PROBLEM } from '@/emailValidation.constant';
import { validateEmailHtml } from '@/emailLayout.validator';

const RECIPIENT = {
  name: 'Anderson Filho',
  email: 'anderson@adatechnology.com.br',
  role: 'Administrador',
  companyName: 'Ada Technology',
  lastAccessLabel: '24/08/2026 as 17:12',
} as const;

function buildSample(overrides: Partial<Parameters<typeof buildEmailHtml>[0]> = {}): string {
  return buildEmailHtml({
    subject: 'Redefinicao de senha',
    bodyHtml: 'Recebemos um pedido.<br><br>Se nao foi voce, ignore.',
    recipient: RECIPIENT,
    action: { label: 'Escolher nova senha', url: 'https://painel.adatechnology.com.br/redefinir' },
    reason: 'Voce recebeu porque alguem pediu a redefinicao desta conta.',
    ...overrides,
  });
}

function codesOf(html: string): readonly string[] {
  return validateEmailHtml(html).problems.map((problem) => problem.code);
}

describe('buildEmailHtml', () => {
  it('produz um documento que o proprio validador aprova', () => {
    const result = validateEmailHtml(buildSample({ logoUrl: 'https://cdn.adatechnology.com.br/ada-logo.png' }));

    expect(result.problems).toEqual([]);
    expect(result.isValid).toBe(true);
  });

  it('escapa nome e empresa: o cadastro e entrada de usuario', () => {
    const html = buildSample({
      recipient: { ...RECIPIENT, name: '<img src=x onerror=alert(1)>' },
    });

    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x');
  });

  it('nao escapa o corpo, que ja chega escapado com <br> do renderTemplate', () => {
    expect(buildSample()).toContain('Recebemos um pedido.<br><br>');
  });

  it('omite a linha do cartao quando o dado nao veio', () => {
    const html = buildSample({ recipient: { name: 'Ana', email: 'ana@ada.com' } });

    expect(html).toContain('ana@ada.com');
    expect(html).not.toContain('Ultimo acesso');
  });

  it('cai na marca tipografica sem logoUrl, e nao deixa <img> vazio', () => {
    const html = buildSample();

    expect(html).not.toContain('<img');
    expect(html).toContain('>ADA<');
  });

  it('sem acao, nenhum botao e desenhado', () => {
    const html = buildEmailHtml({
      subject: 'Aviso',
      bodyHtml: 'Sem acao aqui.',
      recipient: RECIPIENT,
      reason: 'Voce recebeu porque assina este aviso.',
    });

    expect(html).not.toContain('Se o botao nao abrir');
  });
});

describe('validateEmailHtml', () => {
  it('reprova script, folha externa, imagem em data: e URL relativa', () => {
    expect(codesOf('<script>alert(1)</script>')).toContain(EMAIL_HTML_PROBLEM.SCRIPT);
    expect(codesOf('<link rel="stylesheet" href="https://x/a.css">')).toContain(
      EMAIL_HTML_PROBLEM.EXTERNAL_STYLESHEET,
    );
    expect(codesOf('<img alt="a" src="data:image/png;base64,AAA">')).toContain(EMAIL_HTML_PROBLEM.DATA_URI_IMAGE);
    expect(codesOf('<a href="/painel">ir</a>')).toContain(EMAIL_HTML_PROBLEM.RELATIVE_URL);
  });

  it('erro reprova, aviso nao', () => {
    expect(validateEmailHtml('<script></script>').isValid).toBe(false);
    expect(validateEmailHtml('<img src="https://x/a.png">').isValid).toBe(true);
  });

  it('avisa imagem sem alt, layout moderno e ausencia de title', () => {
    const codes = codesOf('<div style="display:flex"><img src="https://x/a.png"></div>');

    expect(codes).toContain(EMAIL_HTML_PROBLEM.IMAGE_WITHOUT_ALT);
    expect(codes).toContain(EMAIL_HTML_PROBLEM.MODERN_LAYOUT);
    expect(codes).toContain(EMAIL_HTML_PROBLEM.MISSING_TITLE);
  });

  it('acha tabela desbalanceada, que some inteira no Outlook', () => {
    expect(codesOf('<title>a</title><table><tr><td>x</td></tr>')).toContain(EMAIL_HTML_PROBLEM.UNBALANCED_TAGS);
  });

  it('avisa o corte do Gmail acima de 102KB', () => {
    const codes = codesOf(`<title>a</title>${'x'.repeat(110_000)}`);

    expect(codes).toContain(EMAIL_HTML_PROBLEM.GMAIL_CLIP);
  });

  it('mailto, tel e ancora nao sao URL relativa', () => {
    expect(codesOf('<title>a</title><a href="mailto:a@b.c">x</a><a href="#topo">y</a>')).toEqual([]);
  });
});
