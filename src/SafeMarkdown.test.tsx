// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { SafeMarkdown } from './SafeMarkdown';

it('renders headings, fenced code, ordered and unordered lists, and safe images', () => {
  const { container } = render(<SafeMarkdown content={'#### A deeper heading\n\n```ts\nconst value = 1;\n```\n\n- first\n- second\n\n1. third\n2. fourth\n\n![Chart](https://example.com/chart.png)'} />);
  expect(container.querySelector('h5')?.textContent).toBe('A deeper heading');
  expect(container.querySelector('pre code')?.textContent).toBe('const value = 1;');
  expect(container.querySelectorAll('ul li')).toHaveLength(2);
  expect(container.querySelectorAll('ol li')).toHaveLength(2);
  expect(container.querySelector('figure img')?.getAttribute('src')).toBe('https://example.com/chart.png');
  expect(container.querySelector('figcaption')?.textContent).toBe('Chart');
});

it('keeps unsafe links and images inert while rendering link text', () => {
  const { container } = render(<SafeMarkdown content={'[unsafe](javascript:alert(1))\n\n![x](data:text/html,alert(1))'} />);
  expect(container.querySelector('a')).toBeNull();
  expect(container.querySelector('img')).toBeNull();
  expect(container.textContent).toContain('unsafe');
});

it('renders headings without executing HTML and supports unterminated fenced code', () => {
  const { container } = render(<SafeMarkdown content={'###### Last heading\n\n```\n<script>no</script>'} />);
  expect(container.querySelector('h6')?.textContent).toBe('Last heading');
  expect(container.querySelector('pre code')?.textContent).toBe('<script>no</script>');
  expect(container.querySelector('script')).toBeNull();
});
