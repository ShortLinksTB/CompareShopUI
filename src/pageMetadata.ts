import type { Language } from './i18n';

const VIETNAMESE_APPLICATION_TITLE = 'GiaTot - So sánh giá thông minh';

export function getApplicationTitle(language: Language): string {
  return language === 'en' ? 'GiaTot - Smart Price Comparison' : VIETNAMESE_APPLICATION_TITLE;
}
