import { useState } from 'react';

export function BlogImage({ title, src, className = '' }: { title: string; src?: string | null; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(src && failedSrc === src);
  if (src && !failed) return <img className={`blog-cover-image ${className}`} src={src} alt={title} loading="lazy" onError={() => setFailedSrc(src)} />;
  return <div className={`blog-image-placeholder ${className}`} role="img" aria-label={title}>
    <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
  </div>;
}
