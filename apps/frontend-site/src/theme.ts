/*
 * Copyright (c) 2026 Ada Technology. All rights reserved.
 *
 * This source code is proprietary and confidential. Unauthorized copying,
 * modification, distribution, or use of this file, via any medium, is
 * strictly prohibited without prior written permission from Ada Technology.
 */

/**
 * Alternancia de tema claro/escuro nas paginas do site.
 *
 * Quem pinta o tema antes da primeira pintura e `public/theme-boot.js`; aqui fica so a reacao ao
 * clique. A chave de armazenamento esta duplicada nos dois arquivos de proposito — `public/` e
 * copiado cru, fora do bundle, e constante nao atravessa essa fronteira.
 *
 * Qual icone aparece nao passa por aqui: e CSS espelhando a cascata da paleta em `base.css`, para o
 * botao nao mostrar sol num tema escuro no intervalo entre a pintura e a carga deste modulo.
 */

const STORAGE_KEY = 'ada-theme';
const THEME_ATTRIBUTE = 'data-theme';
const TOGGLE_ELEMENT_ID = 'themeToggle';
const DARK_SCHEME_QUERY = '(prefers-color-scheme: dark)';

const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;
type Theme = (typeof Theme)[keyof typeof Theme];

function isTheme(value: unknown): value is Theme {
  return value === Theme.LIGHT || value === Theme.DARK;
}

function readStoredTheme(): Theme | undefined {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    return isTheme(stored) ? stored : undefined;
  } catch (error) {
    return undefined;
  }
}

function persistTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    // Sem armazenamento a escolha vale so para esta navegacao; escurecer a pagina importa mais.
  }
}

/** O que esta na tela agora: a escolha explicita quando existe, o tema do sistema quando nao. */
function resolveActiveTheme(): Theme {
  const explicit = document.documentElement.getAttribute(THEME_ATTRIBUTE);

  if (isTheme(explicit)) return explicit;

  return window.matchMedia(DARK_SCHEME_QUERY).matches ? Theme.DARK : Theme.LIGHT;
}

function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme);
}

function reflectPressedState(toggle: HTMLElement): void {
  toggle.setAttribute('aria-pressed', String(resolveActiveTheme() === Theme.DARK));
}

export function mountThemeToggle(): void {
  const toggle = document.getElementById(TOGGLE_ELEMENT_ID);

  if (toggle === null) return;

  const stored = readStoredTheme();
  if (stored !== undefined) applyTheme(stored);

  reflectPressedState(toggle);

  toggle.addEventListener('click', () => {
    const next = resolveActiveTheme() === Theme.DARK ? Theme.LIGHT : Theme.DARK;

    applyTheme(next);
    persistTheme(next);
    reflectPressedState(toggle);
  });

  // Sem escolha explicita o CSS acompanha o sistema sozinho; o que fica velho e o `aria-pressed`.
  window.matchMedia(DARK_SCHEME_QUERY).addEventListener('change', () => {
    reflectPressedState(toggle);
  });
}
