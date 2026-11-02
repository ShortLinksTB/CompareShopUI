import type { Language } from './i18n';

export function getApplicationTitle(language: Language) {
  return language === 'en' ? 'GiaTot - Smart Price Comparison' : 'GiaTot - So sánh giá thông minh';
}
