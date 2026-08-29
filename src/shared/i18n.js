import en from './locales/en.js';
import pt from './locales/pt.js';

export const LOCALES = { en, pt };
export const DEFAULT_LANG = 'en';

export function translate(lang, key, vars) {
  const dict = LOCALES[lang] || LOCALES[DEFAULT_LANG];
  let str = dict[key] ?? LOCALES[DEFAULT_LANG][key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) str = str.replaceAll(`{${k}}`, v);
  }
  return str;
}
