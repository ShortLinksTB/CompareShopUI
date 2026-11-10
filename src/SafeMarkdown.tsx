import { createElement, type ReactNode } from 'react';

function safeUrl(value: string, image = false): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001f]/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, window.location.origin);
    if (image ? !['http:', 'https:'].includes(url.protocol) : !['http:', 'https:', 'mailto:'].includes(url.protocol)) return null;
    return trimmed;
  } catch {
    return null;
  }
}

function inline(markdown: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;
  let offset = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown))) {
    if (match.index > offset) nodes.push(markdown.slice(offset, match.index));
    const key = `${match.index}-${nodes.length}`;
    if (match[1] === '!') {
      const src = safeUrl(match[3], true);
      nodes.push(src ? <img key={key} src={src} alt={match[2]} loading="lazy" /> : match[2]);
    } else if (match[2] !== undefined) {
      const href = safeUrl(match[3]);
      nodes.push(href ? <a key={key} href={href} target="_blank" rel="noreferrer">{match[2]}</a> : match[2]);
    } else if (match[5] !== undefined) nodes.push(<code key={key}>{match[5]}</code>);
    else if (match[6] !== undefined || match[7] !== undefined) nodes.push(<strong key={key}>{match[6] ?? match[7]}</strong>);
    else nodes.push(<em key={key}>{match[8] ?? match[9]}</em>);
    offset = pattern.lastIndex;
  }
  if (offset < markdown.length) nodes.push(markdown.slice(offset));
  return nodes;
}

export function SafeMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let index = 0;
  let blockId = 0;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={`p-${blockId++}`}>{paragraph.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}{inline(line)}</span>)}</p>);
    paragraph = [];
  };
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { flushParagraph(); index += 1; continue; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      const level = Math.min(Number(heading[1].length) + 1, 6);
      blocks.push(createElement(`h${level}`, { key: `h-${index++}` }, inline(heading[2])));
      continue;
    }
    if (/^```/.test(line)) {
      flushParagraph();
      index += 1;
      const code: string[] = [];
      while (index < lines.length && !/^```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    if (line.trimStart().startsWith('>')) {
      flushParagraph();
      const quote: string[] = [];
      while (index < lines.length && lines[index].trimStart().startsWith('>')) quote.push(lines[index++].trimStart().slice(1).trimStart());
      blocks.push(<blockquote key={`quote-${index}`}>{quote.map((part, i) => <p key={i}>{inline(part)}</p>)}</blockquote>);
      continue;
    }
    const listMatch = /^\s*(?:([-+*])|(\d+)\.)\s+/.exec(line);
    if (listMatch) {
      flushParagraph();
      const ordered = Boolean(listMatch[2]);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = /^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/.exec(lines[index]);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(<li key={index}>{inline(item[3])}</li>);
        index += 1;
      }
      blocks.push(ordered ? <ol key={`list-${index}`}>{items}</ol> : <ul key={`list-${index}`}>{items}</ul>);
      continue;
    }
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line.trim());
    if (image) {
      flushParagraph();
      const src = safeUrl(image[2], true);
      blocks.push(src ? <figure key={`img-${index}`}><img src={src} alt={image[1]} loading="lazy" />{image[1] && <figcaption>{image[1]}</figcaption>}</figure> : null);
      index += 1;
      continue;
    }
    paragraph.push(line);
    index += 1;
  }
  flushParagraph();
  return <>{blocks}</>;
}
