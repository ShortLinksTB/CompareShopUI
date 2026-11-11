import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthSession } from '../auth/AuthSession';
import { addWishlistItem, getWishlist, removeWishlistItem, WishlistApiError, type WishlistItemDto } from '../wishlistApi';
import { useLanguage } from '../i18n';
import { uiText } from '../uiCopy';

type WishlistStatus = 'loading' | 'anonymous' | 'loaded' | 'error';
type WishlistError = 'load' | 'mutation' | 'sign-in' | null;

interface WishlistContextValue {
  status: WishlistStatus;
  ids: ReadonlySet<number>;
  items: WishlistItemDto[];
  busyIds: ReadonlySet<number>;
  signInBusy: boolean;
  error: WishlistError;
  retry: () => Promise<void>;
  toggle: (productId: number, safeReturnTo: string) => Promise<void>;
  remove: (productId: number) => Promise<void>;
  reload: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);
const emptyWishlistContext: WishlistContextValue = {
  status: 'loading',
  ids: new Set<number>(),
  items: [],
  busyIds: new Set<number>(),
  signInBusy: false,
  error: null,
  retry: async () => undefined,
  toggle: async () => undefined,
  remove: async () => undefined,
  reload: () => undefined,
};

export function WishlistProvider({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const { status: sessionStatus, user, getAccessToken, signIn } = session;
  const [status, setStatus] = useState<WishlistStatus>('loading');
  const [items, setItems] = useState<WishlistItemDto[]>([]);
  const [busyIds, setBusyIds] = useState<Set<number>>(() => new Set());
  const [signInBusy, setSignInBusy] = useState(false);
  const [error, setError] = useState<WishlistError>(null);
  const [failedMutation, setFailedMutation] = useState<{ productId: number; remove: boolean } | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const signInStarted = useRef(false);
  const busyIdsRef = useRef(new Set<number>());
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const ids = useMemo(() => new Set(items.map(item => item.productId)), [items]);

  useEffect(() => {
    let active = true;
    busyIdsRef.current.clear();
    setBusyIds(new Set());
    setFailedMutation(null);
    if (sessionStatus !== 'authenticated' || !user) {
      setItems([]);
      setError(null);
      setStatus(sessionStatus === 'loading' ? 'loading' : 'anonymous');
      return () => { active = false; };
    }

    setItems([]);
    setError(null);
    setStatus('loading');
    void getAccessToken().then(token => {
      if (!token) return null;
      return getWishlist(token);
    }).then(result => {
      if (!active) return;
      if (!result) return;
      setItems(result);
      setStatus('loaded');
    }).catch(reason => {
      if (!active) return;
      if (reason instanceof WishlistApiError && reason.status === 401) {
        setError(null);
        setStatus('anonymous');
      } else {
        setError('load');
        setStatus('error');
      }
    });
    return () => { active = false; };
  }, [sessionStatus, user?.id, getAccessToken, reloadVersion]);

  const requestSignIn = useCallback(async (safeReturnTo: string) => {
    if (signInStarted.current) return;
    signInStarted.current = true;
    setSignInBusy(true);
    setError(null);
    try {
      await signIn(safeReturnTo);
    } catch {
      setError('sign-in');
    } finally {
      signInStarted.current = false;
      setSignInBusy(false);
    }
  }, [signIn]);

  const mutate = useCallback(async (productId: number, safeReturnTo: string, forceRemove = false) => {
    if (sessionStatus !== 'authenticated' || !user) {
      if (sessionStatus === 'anonymous' || sessionStatus === 'error') await requestSignIn(safeReturnTo);
      return;
    }
    if (status !== 'loaded' || busyIdsRef.current.has(productId)) return;

    const wasSaved = ids.has(productId);
    const adding = !forceRemove && !wasSaved;
    const userId = user.id;
    busyIdsRef.current.add(productId);
    setBusyIds(current => new Set(current).add(productId));
    setError(null);
    setFailedMutation(null);
    let mutationSucceeded = false;
    try {
      let token: string | null;
      try {
        token = await getAccessToken();
      } catch {
        await requestSignIn(safeReturnTo);
        return;
      }
      if (!token) {
        await requestSignIn(safeReturnTo);
        return;
      }
      if (sessionRef.current.status !== 'authenticated' || sessionRef.current.user?.id !== userId) return;
      try {
        if (adding) await addWishlistItem(token, productId);
        else await removeWishlistItem(token, productId);
        mutationSucceeded = true;
        const refreshed = await getWishlist(token);
        if (sessionRef.current.status !== 'authenticated' || sessionRef.current.user?.id !== userId) return;
        setItems(refreshed);
      } catch (reason) {
        if (reason instanceof WishlistApiError && reason.status === 401) {
          if (mutationSucceeded) {
            setItems([]);
            setError(null);
            setStatus('anonymous');
          }
          await requestSignIn(safeReturnTo);
          return;
        }
        if (mutationSucceeded) {
          setItems([]);
          setStatus('error');
          setError('load');
        } else {
          setError('mutation');
          setFailedMutation({ productId, remove: !adding });
        }
      }
    } finally {
      busyIdsRef.current.delete(productId);
      setBusyIds(current => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }, [sessionStatus, user, status, ids, getAccessToken, requestSignIn]);

  const toggle = useCallback((productId: number, safeReturnTo: string) => mutate(productId, safeReturnTo), [mutate]);
  const remove = useCallback((productId: number) => mutate(productId, '/wishlist', true), [mutate]);
  const reload = useCallback(() => setReloadVersion(value => value + 1), []);
  const retry = useCallback(async () => {
    if (!failedMutation) return;
    await mutate(failedMutation.productId, '/wishlist', failedMutation.remove);
  }, [failedMutation, mutate]);
  const value = useMemo(() => ({ status, ids, items, busyIds, signInBusy, error, retry, toggle, remove, reload }), [status, ids, items, busyIds, signInBusy, error, retry, toggle, remove, reload]);

  return <WishlistContext.Provider value={value}>{children}<WishlistFeedback /></WishlistContext.Provider>;
}

export function useWishlist() {
  const value = useContext(WishlistContext);
  return value ?? emptyWishlistContext;
}

export function WishlistFeedback() {
  const { error, reload, retry } = useWishlist();
  const location = useLocation();
  const { language } = useLanguage();
  if (!error || (error === 'load' && location.pathname === '/wishlist')) return null;
  const message = error === 'load'
    ? uiText(language, 'Không thể tải sản phẩm yêu thích.')
    : error === 'sign-in'
      ? uiText(language, 'Không thể mở đăng nhập. Vui lòng thử lại.')
      : uiText(language, 'Không thể cập nhật sản phẩm yêu thích. Vui lòng thử lại.');
  return <div className="wishlist-global-feedback" role="alert"><span>{message}</span>{error === 'load' ? <button type="button" onClick={reload}>{uiText(language, 'Thử lại')}</button> : error === 'mutation' && <button type="button" onClick={() => void retry()}>{uiText(language, 'Thử lại')}</button>}</div>;
}
