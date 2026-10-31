import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { beginSignIn, consumeReturnPath, initializeAuthCallback } from './auth/authClient';

type CallbackState = 'processing' | 'redirecting' | 'failed';

export function AuthCallbackPage() {
  const [state, setState] = useState<CallbackState>('processing');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    Promise.resolve().then(initializeAuthCallback)
      .then(authenticated => {
        if (!active) return;
        if (!authenticated) throw new Error('The sign-in response was not authenticated.');
        setState('redirecting');
        const destination = consumeReturnPath();
        window.setTimeout(() => { if (active) navigate(destination, { replace: true }); }, 450);
      })
      .catch(() => { if (active) setState('failed'); });
    return () => { active = false; };
  }, [location.search, navigate]);

  const retry = () => {
    void beginSignIn(consumeReturnPath()).catch(() => setState('failed'));
  };

  return <main className="auth-callback-page">
    <section className="auth-callback-card" aria-live="polite">
      <div className="auth-callback-brand"><span className="brand-mark">G</span><strong>GiaTot CompareShop</strong></div>
      {state === 'failed' ? <>
        <span className="auth-callback-error" aria-hidden="true">!</span>
        <h1>Không thể hoàn tất đăng nhập</h1>
        <p>Phiên đăng nhập chưa được xác nhận. Hãy thử lại để tiếp tục an toàn — danh sách Wishlist của bạn chưa bị ảnh hưởng.</p>
        <button className="button button-primary" type="button" onClick={retry}>Thử đăng nhập lại</button>
      </> : <>
        <span className="auth-callback-spinner" role="status" aria-label={state === 'processing' ? 'Đang xử lý đăng nhập' : 'Đang chuyển hướng'} />
        <h1>{state === 'processing' ? 'Đang hoàn tất đăng nhập…' : 'Đăng nhập thành công, đang chuyển hướng…'}</h1>
        <p>{state === 'processing' ? 'Vui lòng chờ trong giây lát. Bạn sẽ được đưa trở lại trang trước đó sau khi đăng nhập thành công.' : 'Quay lại trang bạn đang xem trước đó. Nếu không có đường dẫn quay lại hợp lệ, bạn sẽ được đưa về trang chủ (/).'}</p>
      </>}
    </section>
  </main>;
}
