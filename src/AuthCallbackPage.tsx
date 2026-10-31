import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeSignInCallback, getPendingReturnPath, startSignIn } from './auth/authClient';

type CallbackState = 'processing' | 'success' | 'failure';

export function AuthCallbackPage() {
  const [state, setState] = useState<CallbackState>('processing');
  const [retrying, setRetrying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    completeSignInCallback().then(returnTo => {
      if (!active) return;
      setState('success');
      timer = window.setTimeout(() => navigate(returnTo, { replace: true }), 700);
    }).catch(() => {
      if (active) setState('failure');
    });
    return () => { active = false; if (timer !== undefined) window.clearTimeout(timer); };
  }, [navigate]);

  const retry = async () => {
    setRetrying(true);
    try {
      await startSignIn(getPendingReturnPath());
    } catch {
      setRetrying(false);
    }
  };

  return <main className="auth-callback" aria-live="polite">
    <section className="auth-callback-card" aria-busy={state === 'processing'}>
      <div className="auth-callback-brand"><span className="auth-callback-mark">G</span><span>GiaTot CompareShop</span></div>
      {state === 'processing' && <>
        <div className="auth-callback-spinner" role="status" aria-label="Đang xử lý đăng nhập" />
        <h1>Đang hoàn tất đăng nhập…</h1>
        <p>Vui lòng chờ trong giây lát. Bạn sẽ được đưa trở lại trang trước đó sau khi đăng nhập thành công.</p>
      </>}
      {state === 'success' && <>
        <div className="auth-callback-spinner" role="status" aria-label="Đang chuyển hướng" />
        <h1>Đăng nhập thành công, đang chuyển hướng…</h1>
        <p>Quay lại trang bạn đang xem trước đó. Nếu không có đường dẫn quay lại hợp lệ, bạn sẽ được đưa về trang chủ (/).</p>
      </>}
      {state === 'failure' && <>
        <div className="auth-callback-error" aria-hidden="true">!</div>
        <h1>Không thể hoàn tất đăng nhập</h1>
        <p>Phiên đăng nhập chưa được xác nhận. Hãy thử lại để tiếp tục an toàn — danh sách Wishlist của bạn chưa bị ảnh hưởng.</p>
        <button className="auth-callback-button" type="button" onClick={() => void retry()} disabled={retrying}>
          {retrying ? 'Đang chuyển đến đăng nhập…' : 'Thử đăng nhập lại'}
        </button>
      </>}
    </section>
  </main>;
}
