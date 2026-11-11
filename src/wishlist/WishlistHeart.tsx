import { useLocation } from 'react-router-dom';
import { useLanguage } from '../i18n';
import { uiText } from '../uiCopy';
import { useWishlist } from './WishlistContext';

export function WishlistHeart({ productId, className = 'heart' }: { productId: number; className?: string }) {
  const location = useLocation();
  const { language } = useLanguage();
  const { status, ids, busyIds, signInBusy, toggle } = useWishlist();
  const liked = ids.has(productId);
  const busy = status === 'loading' || status === 'error' || signInBusy || busyIds.has(productId);
  const safeReturnTo = `${location.pathname}${location.search}${location.hash}`;
  return <button
    className={`${className}${liked ? ' liked' : ''}`}
    type="button"
    onClick={() => void toggle(productId, safeReturnTo)}
    disabled={busy}
    aria-busy={busyIds.has(productId)}
    aria-pressed={liked}
    aria-label={uiText(language, liked ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích')}
  >{liked ? '♥' : '♡'}</button>;
}
