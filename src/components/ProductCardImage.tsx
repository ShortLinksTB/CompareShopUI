import { SafeImage } from './SafeImage';

interface ProductCardImageProps {
  imageUrl: string | null;
  productName: string;
  noImageLabel: string;
  imageClassName?: string;
  placeholderClassName?: string;
  placeholderTextClassName?: string;
  placeholderTag?: 'div' | 'span';
  placeholderAriaLabel?: string;
}

/** Renders the public card image projection without depending on image metadata. */
export function ProductCardImage({
  imageUrl,
  productName,
  noImageLabel,
  imageClassName,
  placeholderClassName = '',
  placeholderTextClassName = '',
  placeholderTag = 'div',
  placeholderAriaLabel = noImageLabel,
}: ProductCardImageProps) {
  if (imageUrl) {
    return <SafeImage className={imageClassName} src={imageUrl} alt={productName} fallbackLabel={noImageLabel} />;
  }

  const Placeholder = placeholderTag;
  return <Placeholder className={placeholderClassName} role="img" aria-label={placeholderAriaLabel}>
    <span className={placeholderTextClassName}>{noImageLabel}</span>
  </Placeholder>;
}
