import { useState } from 'react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export function SafeImage({ src, alt, className = '', fallbackLabel = 'Product image' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={`${className} safe-image-fallback`} role="img" aria-label={alt}><span>{fallbackLabel}</span></div>;
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}
