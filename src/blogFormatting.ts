export function formatBlogDate(value: string, language: string) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language === 'id' ? 'id-ID' : 'vi-VN', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(value));
}
