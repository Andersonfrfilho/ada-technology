/**
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Folha unica do shadow root, com os tokens declarados em `:host`.
 *
 * O shadow DOM e o que permite embutir o widget em qualquer site sem herdar nem vazar CSS. Os tokens
 * ficam em `:host` de proposito: sao a superficie de customizacao do host, que sobrescreve a variavel
 * sem tocar em nada aqui dentro.
 */
export const WIDGET_STYLE = `
:host {
  --ada-navy: #0d1b3e;
  --ada-blue: #1a4fd6;
  --ada-cyan: #06b6d4;
  --ada-surface: #ffffff;
  --ada-bg: #f5f8ff;
  --ada-text: #1e2a4a;
  --ada-muted: #64748b;
  --ada-danger: #b42318;
  --ada-border: #e2e8f0;
  --ada-radius: 12px;
  --ada-touch: 44px;
  --ada-font: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;

  position: fixed;
  right: 12px;
  bottom: 12px;
  left: 12px;
  z-index: 2147483000;
  font-family: var(--ada-font);
  color: var(--ada-text);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; }

.launcher {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--ada-touch);
  padding: 0 20px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--ada-blue), var(--ada-cyan));
  color: var(--ada-surface);
  font-weight: 600;
  box-shadow: 0 10px 30px rgba(13, 27, 62, 0.28);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.launcher:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(13, 27, 62, 0.34); }
/* O host ocupa a largura toda no celular; sem isto o botao ficaria colado na borda esquerda. */
.launcher { margin-left: auto; }
.launcher:focus-visible { outline: 3px solid var(--ada-navy); outline-offset: 3px; }
.launcher[hidden] { display: none; }

.panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: min(70vh, calc(100vh - 96px));
  border-radius: var(--ada-radius);
  background: var(--ada-surface);
  border: 1px solid var(--ada-border);
  box-shadow: 0 24px 60px rgba(13, 27, 62, 0.24);
  overflow: hidden;
}

.panel[hidden] { display: none; }

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  background: var(--ada-navy);
  color: var(--ada-surface);
}

.header-title { font-weight: 600; letter-spacing: -0.01em; }
.header-subtitle { font-size: 0.78rem; opacity: 0.72; }

.close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--ada-touch);
  height: var(--ada-touch);
  margin-right: -10px;
  border-radius: 50%;
  font-size: 1.4rem;
  line-height: 1;
}

.close:hover { background: rgba(255, 255, 255, 0.14); }
.close:focus-visible { outline: 2px solid var(--ada-cyan); outline-offset: -2px; }

.transcript {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  overflow-y: auto;
  background: var(--ada-bg);
}

.bubble {
  max-width: 82%;
  padding: 10px 14px;
  border-radius: var(--ada-radius);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.bubble-bot { align-self: flex-start; background: var(--ada-surface); border: 1px solid var(--ada-border); }
.bubble-visitor { align-self: flex-end; background: var(--ada-blue); color: var(--ada-surface); }

.options { display: flex; flex-wrap: wrap; gap: 8px; padding: 0 16px 12px; background: var(--ada-bg); }
.options[hidden] { display: none; }

.option {
  min-height: var(--ada-touch);
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--ada-blue);
  color: var(--ada-blue);
  background: var(--ada-surface);
  font-size: 0.9rem;
  font-weight: 500;
}

.option:hover { background: var(--ada-blue); color: var(--ada-surface); }
.option:focus-visible { outline: 3px solid var(--ada-cyan); outline-offset: 2px; }
.option:disabled { opacity: 0.55; cursor: not-allowed; }

.status {
  padding: 0 16px 10px;
  font-size: 0.82rem;
  color: var(--ada-muted);
  background: var(--ada-bg);
}

.status[hidden] { display: none; }
.status-error { color: var(--ada-danger); }

.composer {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-top: 1px solid var(--ada-border);
  background: var(--ada-surface);
}

.input {
  flex: 1;
  min-height: var(--ada-touch);
  padding: 0 14px;
  border: 1px solid var(--ada-border);
  border-radius: 999px;
  font: inherit;
  color: inherit;
  background: var(--ada-surface);
}

.input:focus-visible { outline: 2px solid var(--ada-blue); outline-offset: 0; border-color: var(--ada-blue); }

.send {
  min-width: var(--ada-touch);
  min-height: var(--ada-touch);
  padding: 0 18px;
  border-radius: 999px;
  background: var(--ada-blue);
  color: var(--ada-surface);
  font-weight: 600;
}

.send:hover { background: var(--ada-navy); }
.send:focus-visible { outline: 3px solid var(--ada-cyan); outline-offset: 2px; }
.send:disabled { opacity: 0.55; cursor: not-allowed; }

/* Mobile e a base: o widget ocupa a faixa inteira. A partir de tablet ele volta a ser um cartao. */
@media (min-width: 640px) {
  :host { right: 20px; bottom: 20px; left: auto; }
  .panel { width: 380px; height: min(560px, calc(100vh - 120px)); }
}

@media (prefers-reduced-motion: reduce) {
  .launcher { transition: none; }
  .launcher:hover { transform: none; }
}
`;

/** Folha construida: `adoptedStyleSheets` nao passa por `style-src`, entao o host pode manter um
 *  CSP sem `'unsafe-inline'`. Uma folha por documento, compartilhada entre instancias do widget. */
let sharedSheet: CSSStyleSheet | undefined;

export function applyWidgetStyle(root: ShadowRoot): void {
  if (typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
    if (sharedSheet === undefined) {
      sharedSheet = new CSSStyleSheet();
      sharedSheet.replaceSync(WIDGET_STYLE);
    }
    root.adoptedStyleSheets = [sharedSheet];
    return;
  }

  // Navegador sem folha construida (Safari < 16.4). O `<style>` so passa onde o host permite
  // inline — e onde nao permite, o widget ja nao teria como se estilizar mesmo.
  const style = document.createElement('style');
  style.textContent = WIDGET_STYLE;
  root.append(style);
}
