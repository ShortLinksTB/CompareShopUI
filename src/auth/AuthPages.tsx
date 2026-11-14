import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { uiText } from '../uiCopy';
import { useLanguage } from '../i18n';
import { AuthApiError, authApi, getSafeReturnPath } from './authApi';
import { useAuthSession, setAuthSessionUser } from './AuthSession';
import { getAuthConfig } from './runtimeConfig';

type View = 'login' | 'register' | 'verify-sent' | 'verify-ok' | 'verify-bad' | 'forgot' | 'forgot-code' | 'code-locked' | 'reset' | 'reset-ok' | 'reset-bad' | 'unverified' | 'locked' | 'expired' | 'signedin';
type TurnstileApi = { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; 'error-callback': () => void; 'expired-callback': () => void; theme: 'light' }) => string; reset: (id?: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }

function Turnstile({ onToken, clearToken, token }: { onToken: (value: string) => void; clearToken: () => void; token: string }) {
  const config = getAuthConfig();
  const { language } = useLanguage();
  const target = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const callbacks = useRef({ onToken, clearToken });
  callbacks.current = { onToken, clearToken };
  useEffect(() => {
    if (!config.turnstileEnabled || !config.turnstileSiteKey || !target.current) return;
    const render = () => { if (target.current && window.turnstile && !widget.current) widget.current = window.turnstile.render(target.current, { sitekey: config.turnstileSiteKey, theme: 'light', callback: value => callbacks.current.onToken(value), 'error-callback': () => callbacks.current.clearToken(), 'expired-callback': () => callbacks.current.clearToken() }); };
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (window.turnstile) render();
    else if (existing) existing.addEventListener('load', render, { once: true });
    else { const script = document.createElement('script'); script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; script.async = true; script.defer = true; script.dataset.turnstile = 'true'; script.addEventListener('load', render, { once: true }); document.head.append(script); }
    return () => { if (widget.current) window.turnstile?.reset(widget.current); };
  }, [config.turnstileEnabled, config.turnstileSiteKey]);
  useEffect(() => { if (!token && widget.current) window.turnstile?.reset(widget.current); }, [token]);
  if (!config.turnstileEnabled) return null;
  return <div className="auth-captcha"><div ref={target} />{!config.turnstileSiteKey && <span role="alert">{uiText(language, 'Xác minh bảo mật chưa được cấu hình.')}</span>}{config.turnstileSiteKey && !token && <span className="auth-hint">{uiText(language, 'Hoàn tất xác minh bảo mật để tiếp tục.')}</span>}</div>;
}

function passwordRules(password: string, email: string) {
  const common = new Set(['12345678', 'password', '11111111', '123456789', 'qwertyui', 'matkhau123', 'iloveyou']);
  const local = email.split('@')[0]?.toLowerCase() ?? '';
  return [
    { label: 'Ít nhất 8 ký tự', valid: password.length >= 8 },
    { label: 'Không quá phổ biến', valid: !!password && !common.has(password.toLowerCase()) },
    { label: 'Không chứa phần trước @ trong email', valid: !!password && (!local || local.length < 3 || !password.toLowerCase().includes(local)) },
  ];
}
function AuthBrand() { const { language } = useLanguage(); return <Link className="auth-brand" to="/" aria-label={uiText(language, 'GiaTot — trang chủ')}><span className="brand-mark">G</span><span>GiaTot</span></Link>; }
function Promo() { const { language } = useLanguage(); const deals = [{ tag: 'M5', name: 'MacBook Air M5 13 inch', stores: '5 cửa hàng đang bán', price: '24.990.000 ₫', badge: 'Rẻ nhất' }, { tag: 'X15', name: 'ASUS Vivobook 15', stores: '3 cửa hàng đang bán', price: '13.290.000 ₫', badge: 'Giảm 8%' }, { tag: 'I15', name: 'Dell Inspiron 15', stores: '4 cửa hàng đang bán', price: '14.190.000 ₫', badge: 'Rẻ nhất' }]; return <aside className="auth-promo"><h2>{uiText(language, 'Mua sắm thông minh, tiết kiệm hơn.')}</h2><p>{uiText(language, 'So sánh giá của nhiều cửa hàng, lưu sản phẩm bạn quan tâm và biết ngay khi giá giảm.')}</p><div className="auth-deals">{deals.map(deal => <div className="auth-deal" key={deal.tag}><span className="auth-deal-tag">{deal.tag}</span><div className="auth-deal-name"><b>{deal.name}</b><small>{uiText(language, deal.stores)}</small></div><div className="auth-deal-price">{deal.price}<em>{uiText(language, deal.badge)}</em></div></div>)}</div></aside>; }
function AuthField({ id, label, error, children, hint }: { id: string; label: string; error?: string; children: ReactNode; hint?: ReactNode }) { return <div className="auth-field"><label htmlFor={id}>{label}</label>{children}{hint && <div className="auth-hint">{hint}</div>}{error && <p className="auth-field-error" id={`${id}-error`} role="alert">{error}</p>}</div>; }

export function AuthPages() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useAuthSession();
  const { language } = useLanguage();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const initial: View = location.pathname === '/register' ? 'register' : location.pathname === '/verify-email' ? 'verify-ok' : location.pathname === '/forgot-password' ? (query.get('step') === 'code' ? 'forgot-code' : query.get('step') === 'reset' ? 'reset' : 'forgot') : query.get('state') === 'expired' ? 'expired' : 'login';
  const [view, setView] = useState<View>(initial);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [remaining, setRemaining] = useState(5);
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const verificationStarted = useRef(false);
  const safeReturnTo = getSafeReturnPath(query.get('returnTo'));
  const rules = passwordRules(password, email);

  useEffect(() => { setView(initial); }, [initial]);
  useEffect(() => { if (countdown <= 0) return; const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000); return () => window.clearTimeout(timer); }, [countdown]);
  useEffect(() => {
    if (location.pathname !== '/verify-email' || view !== 'verify-ok' || verificationStarted.current) return;
    verificationStarted.current = true;
    const token = query.get('token');
    window.history.replaceState({}, '', '/verify-email');
    if (!token) { setView('verify-bad'); return; }
    setBusy(true);
    authApi.verifyEmail(token).then(() => setView('verify-ok')).catch(() => setView('verify-bad')).finally(() => setBusy(false));
  // A verification link is intentionally consumed only once; the secret is removed from history immediately.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (session.status === 'authenticated' && session.user && (view === 'login' || view === 'expired')) setView('signedin');
  }, [session.status, session.user, view]);

  const clearFeedback = () => { setError(''); setMessage(''); };
  const resetCaptcha = () => setCaptchaToken('');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return; clearFeedback();
    const normalizedEmail = email.trim().toLowerCase();
    if (['login', 'expired', 'register', 'forgot', 'verify-bad', 'unverified'].includes(view) && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) { setError(text('Nhập địa chỉ email hợp lệ.')); return; }
    if (getAuthConfig().turnstileEnabled && ['login', 'expired', 'register', 'forgot'].includes(view) && !captchaToken) { setError(text('Hoàn tất xác minh bảo mật để tiếp tục.')); return; }
    setBusy(true);
    try {
      if (view === 'login' || view === 'expired') {
        const result = await authApi.login({ email: normalizedEmail, password, ...(captchaToken ? { captchaToken } : {}) });
        try {
          const user = result.user ?? await authApi.me();
          setAuthSessionUser(user);
          navigate(safeReturnTo, { replace: true });
        } catch (reason) {
          authApi.clear();
          if (reason instanceof AuthApiError) throw reason;
          throw new AuthApiError(502, 'profile_unavailable', 'Không thể xác nhận phiên đăng nhập. Vui lòng thử lại.');
        }
      } else if (view === 'register') {
        if (!rules.every(rule => rule.valid)) throw new Error('Mật khẩu chưa đạt các yêu cầu bên dưới.');
        await authApi.register({ email: normalizedEmail, password, ...(displayName.trim() ? { displayName: displayName.trim() } : {}), ...(captchaToken ? { captchaToken } : {}) });
        setEmail(normalizedEmail); setView('verify-sent'); setCountdown(30); setMessage('Nếu địa chỉ email có thể đăng ký, chúng tôi đã gửi thư xác minh.');
      } else if (view === 'forgot') {
        await authApi.forgotPassword(normalizedEmail, captchaToken || undefined);
        setEmail(normalizedEmail); setView('forgot-code'); setCountdown(30); setRemaining(5); setMessage('Nếu email đã đăng ký, mã đặt lại đã được gửi.');
      } else if (view === 'forgot-code') {
        if (!/^\d{6}$/.test(pin)) throw new Error('Nhập đủ 6 chữ số trong thư.');
        const result = await authApi.verifyResetCode(email, pin); setResetToken(result.resetToken); setView('reset'); setPin('');
      } else if (view === 'reset') {
        if (password.length > 128 || !rules.every(rule => rule.valid)) throw new Error('Mật khẩu chưa đạt các yêu cầu bên dưới.');
        if (password !== confirmPassword) throw new Error('Hai mật khẩu chưa khớp.');
        await authApi.resetPassword(resetToken, password); setView('reset-ok'); setPassword(''); setConfirmPassword(''); setResetToken('');
      }
    } catch (reason) {
      if (reason instanceof AuthApiError) {
        if (reason.code === 'email_not_verified') { setView('unverified'); setEmail(normalizedEmail); setError(reason.message); }
        else if (reason.code === 'account_locked' || reason.code === 'temporarily_locked' || ((view === 'login' || view === 'expired') && reason.status === 429)) setView('locked');
        else if (reason.code === 'reset_session_expired' || reason.code === 'reset_token_invalid') {
          setResetToken(''); setPassword(''); setConfirmPassword(''); setView('reset-bad');
        }
        else if (view === 'forgot-code') { const next = remaining - 1; setRemaining(next); if (next <= 0) setView('code-locked'); else setError(`${text(reason.message)} Còn ${next} lần thử.`); }
        else setError(reason.message);
      } else setError(text(reason instanceof Error ? reason.message : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'));
    } finally { setBusy(false); resetCaptcha(); }
  };
  const resend = async () => {
    if (busy || countdown > 0) return;
    setBusy(true); clearFeedback();
    try {
      if (getAuthConfig().turnstileEnabled && !captchaToken) throw new Error('Hoàn tất xác minh bảo mật để tiếp tục.');
      if (view === 'verify-sent' || view === 'unverified' || view === 'verify-bad') {
        const result = await authApi.resendVerification(email, captchaToken || undefined);
        if (result.accepted !== true) throw new Error('Không thể gửi lại. Vui lòng thử lại.');
      } else {
        await authApi.forgotPassword(email, captchaToken || undefined);
      }
      setCountdown(30); setMessage('Nếu email có thể nhận yêu cầu, thư mới đã được gửi.');
    } catch (reason) { setError(text(reason instanceof Error ? reason.message : 'Không thể gửi lại. Vui lòng thử lại.')); }
    finally { setBusy(false); resetCaptcha(); }
  };
  const go = (next: View, path?: string) => { clearFeedback(); setView(next); if (path) navigate(path); };
  const text = (value: string) => uiText(language, value);
  const title = view === 'expired' ? 'Đăng nhập lại' : view === 'login' ? 'Đăng nhập để trải nghiệm tốt hơn' : view === 'register' ? 'Tạo tài khoản GiaTot' : view === 'verify-sent' ? 'Kiểm tra email của bạn' : view === 'verify-ok' ? 'Email đã được xác minh' : view === 'verify-bad' || view === 'reset-bad' ? 'Liên kết không còn hiệu lực' : view === 'forgot' ? 'Quên mật khẩu?' : view === 'forgot-code' ? 'Nhập mã 6 số' : view === 'code-locked' ? 'Yêu cầu mã mới' : view === 'reset' ? 'Đặt mật khẩu mới' : view === 'reset-ok' ? 'Đã đổi mật khẩu' : view === 'unverified' ? 'Xác minh email để tiếp tục' : view === 'locked' ? 'Thử lại sau ít phút' : 'Bạn đã đăng nhập';
  const socialNote = 'Lưu sản phẩm, theo dõi giá và nhận ưu đãi từ các cửa hàng.';
  const passwordInput = (id: string, label: string, value: string, change: (value: string) => void) => <AuthField id={id} label={text(label)}><div className="auth-password-wrap"><input id={id} type={showPassword ? 'text' : 'password'} aria-label={text(label)} value={value} onChange={event => change(event.target.value)} autoComplete={id === 'password' ? (view === 'login' ? 'current-password' : 'new-password') : 'new-password'} required maxLength={128} aria-describedby={id === 'password' && (view === 'register' || view === 'reset') ? 'auth-password-rules' : undefined} /><button className="auth-show-password" type="button" aria-label={text(showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu')} onClick={() => setShowPassword(show => !show)}>{text(showPassword ? 'Ẩn' : 'Hiện')}</button></div></AuthField>;
  const emailField = <AuthField id="email" label={text('Email')}><input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} /></AuthField>;
  const passwordFeedback = (id = 'auth-password-rules') => <ul className="auth-password-rules" id={id}>{rules.map(rule => <li className={rule.valid ? 'is-valid' : ''} key={rule.label}><span aria-hidden="true">{rule.valid ? '✓' : '○'}</span>{text(rule.label)}</li>)}</ul>;
  const strength = !password ? 0 : Math.max(1, rules.filter(rule => rule.valid).length + 1);
  const strengthLabel = strength ? ['', 'Yếu', 'Tạm được', 'Mạnh', 'Rất mạnh'][strength] : 'Nhập mật khẩu để xem độ mạnh';
  const action = (label: string, onClick: () => void, variant = 'secondary') => <button className={`auth-button auth-button-${variant}`} type="button" onClick={onClick}>{text(label)}</button>;
  const signOut = async () => { setSignOutError(''); try { await session.signOut(); } catch { setSignOutError('Không thể đăng xuất. Vui lòng thử lại.'); } };

  return <div className="auth-page"><section className="auth-panel" aria-labelledby="auth-title"><AuthBrand /><div className="auth-content">{view === 'expired' ? <div className="auth-alert auth-expired-alert is-warning" role="alert"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><span><b>{text('Phiên đăng nhập đã hết hạn')}.</b> <span>{text('Vui lòng đăng nhập lại.')} {text('Danh sách yêu thích của bạn vẫn được giữ nguyên.')}</span></span></div> : null}{view === 'reset-bad' || view === 'verify-bad' ? <div className="auth-state-icon is-warning" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></div> : null}<h1 id="auth-title">{text(title)}</h1>{view !== 'reset-bad' && view !== 'verify-bad' ? <p className="auth-lead">{text(view === 'expired' ? 'Bạn sẽ quay về trang đang xem sau khi đăng nhập.' : view === 'login' ? socialNote : view === 'register' ? 'Đăng ký miễn phí để lưu sản phẩm và nhận thông báo giá tốt.' : view === 'forgot' ? 'Nhập email đã đăng ký. Chúng tôi sẽ gửi mã 6 số để bạn đặt lại mật khẩu.' : view === 'forgot-code' ? 'Nhập mã 6 số được gửi qua email. Mã có hiệu lực trong 10 phút.' : view === 'reset' ? 'Chọn mật khẩu mà bạn chưa dùng ở nơi khác. Sau khi đổi, bạn sẽ được đăng xuất khỏi các thiết bị khác.' : view === 'verify-sent' ? 'Mở thư xác minh để kích hoạt tài khoản. Liên kết có hiệu lực trong 24 giờ.' : 'Làm theo hướng dẫn bên dưới để tiếp tục.')}</p> : null}
    {(error || message) && <div className={`auth-alert ${error ? 'is-error' : 'is-success'}`} role={error ? 'alert' : 'status'}>{text(error || message)}</div>}
    {view === 'login' || view === 'expired' ? <form onSubmit={submit} aria-busy={busy}>{emailField}{passwordInput('password', 'Mật khẩu', password, setPassword)}<div className="auth-inline-links"><Link to="/forgot-password">{text('Quên mật khẩu?')}</Link></div><Turnstile token={captchaToken} onToken={setCaptchaToken} clearToken={resetCaptcha} /><button className="auth-button auth-button-primary" disabled={busy}>{busy ? text('Đang xử lý…') : text(view === 'expired' ? 'Đăng nhập lại' : 'Đăng nhập')}</button><p className="auth-switch">{text('Chưa có tài khoản?')} <Link to="/register">{text('Đăng ký ngay')}</Link></p></form> : null}
    {view === 'register' ? <form onSubmit={submit} aria-busy={busy}>{emailField}<AuthField id="displayName" label={text('Tên hiển thị (tuỳ chọn)')}><input id="displayName" autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={100} /></AuthField>{passwordInput('password', 'Mật khẩu', password, setPassword)}<div className="auth-strength" aria-label={`${text('Độ mạnh mật khẩu')}: ${text(strengthLabel)}`}><div className="auth-strength-bars" data-strength={strength}>{[1, 2, 3, 4].map(level => <span key={level} />)}</div><span>{text(strengthLabel)}</span></div>{passwordFeedback()}<Turnstile token={captchaToken} onToken={setCaptchaToken} clearToken={resetCaptcha} /><button className="auth-button auth-button-primary" disabled={busy}>{busy ? text('Đang xử lý…') : text('Tạo tài khoản')}</button><p className="auth-terms">{text('Khi tạo tài khoản, bạn đồng ý với Điều khoản sử dụng và Chính sách quyền riêng tư của GiaTot.')}</p><p className="auth-switch">{text('Đã có tài khoản?')} <Link to="/login">{text('Đăng nhập')}</Link></p></form> : null}
    {view === 'verify-sent' ? <><div className="auth-state-icon">✉</div><p className="auth-email-chip">{email}</p><p className="auth-supporting">{text('Kiểm tra cả thư mục Spam hoặc Quảng cáo nếu bạn chưa thấy thư.')}</p><Turnstile token={captchaToken} onToken={setCaptchaToken} clearToken={resetCaptcha} /><button className="auth-button auth-button-primary" onClick={() => void resend()} disabled={busy || countdown > 0}>{countdown ? `${text('Gửi lại thư xác minh')} (${countdown}s)` : text('Gửi lại thư xác minh')}</button>{action('Dùng email khác', () => go('register', '/register'))}</> : null}
    {view === 'verify-ok' ? <><div className="auth-state-icon is-success">✓</div><p className="auth-supporting">{text('Tài khoản của bạn đã sẵn sàng. Đăng nhập để lưu sản phẩm và theo dõi giá.')}</p>{action('Đăng nhập', () => go('login', '/login'), 'primary')}</> : null}
    {view === 'verify-bad' ? <><p className="auth-supporting">{text('Liên kết xác minh đã hết hạn hoặc đã được dùng. Nhập email để nhận liên kết mới.')}</p><form onSubmit={event => { event.preventDefault(); void resend(); }}>{emailField}<Turnstile token={captchaToken} onToken={setCaptchaToken} clearToken={resetCaptcha} /><button className="auth-button auth-button-primary" disabled={busy || countdown > 0}>{countdown ? `${text('Gửi liên kết mới')} (${countdown}s)` : text('Gửi liên kết mới')}</button></form>{action('Quay lại đăng nhập', () => go('login', '/login'))}</> : null}
    {view === 'forgot' ? <form onSubmit={submit}>{emailField}<Turnstile token={captchaToken} onToken={setCaptchaToken} clearToken={resetCaptcha} /><button className="auth-button auth-button-primary" disabled={busy}>{busy ? text('Đang xử lý…') : text('Gửi mã')}</button><p className="auth-switch"><Link to="/login">{text('Quay lại đăng nhập')}</Link></p></form> : null}
    {view === 'forgot-code' ? <form onSubmit={submit}><AuthField id="pin" label={text('Mã xác nhận')} hint={text('Mã có hiệu lực trong 10 phút.')}><input id="pin" className="auth-pin" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-label={text('Mã xác nhận gồm 6 chữ số')} required /></AuthField><p className="auth-attempts">{text('Còn')} {remaining} {text('lần thử')}</p><button className="auth-button auth-button-primary" disabled={busy}>{text('Tiếp tục')}</button><Turnstile token={captchaToken} onToken={setCaptchaToken} clearToken={resetCaptcha} /><button className="auth-button auth-button-secondary" type="button" disabled={busy || countdown > 0} onClick={() => void resend()}>{countdown ? `${text('Gửi lại mã')} (${countdown}s)` : text('Gửi lại mã')}</button><p className="auth-switch">{text('Sai email?')} <Link to="/forgot-password">{text('Nhập lại')}</Link></p></form> : null}
    {view === 'code-locked' ? <><div className="auth-alert is-error" role="alert">{text('Mã đã bị huỷ sau 5 lần nhập sai. Yêu cầu mã mới để tiếp tục.')}</div>{action('Yêu cầu mã mới', () => go('forgot', '/forgot-password'), 'primary')}{action('Quay lại đăng nhập', () => go('login', '/login'))}</> : null}
    {view === 'reset' ? <form onSubmit={submit}>{passwordInput('password', 'Mật khẩu mới', password, setPassword)}<div className="auth-strength" aria-label={`${text('Độ mạnh mật khẩu')}: ${text(strengthLabel)}`}><div className="auth-strength-bars" data-strength={strength}>{[1, 2, 3, 4].map(level => <span key={level} />)}</div><span>{text(strengthLabel)}</span></div>{passwordFeedback()}<AuthField id="confirmPassword" label={text('Nhập lại mật khẩu')}><input id="confirmPassword" type={showPassword ? 'text' : 'password'} aria-label={text('Nhập lại mật khẩu')} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required maxLength={128} /></AuthField><button className="auth-button auth-button-primary" disabled={busy}>{text('Đổi mật khẩu')}</button></form> : null}
    {view === 'reset-ok' ? <><div className="auth-state-icon is-success">✓</div><p className="auth-supporting">{text('Mật khẩu mới đã có hiệu lực. Các phiên khác đã bị đăng xuất.')}</p>{action('Đăng nhập', () => go('login', '/login'), 'primary')}</> : null}
    {view === 'reset-bad' ? <><p className="auth-supporting">{text('Phiên đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Bạn có thể yêu cầu mã mới.')}</p>{action('Yêu cầu mã mới', () => go('forgot', '/forgot-password'), 'primary')}{action('Quay lại đăng nhập', () => go('login', '/login'))}</> : null}
    {view === 'unverified' ? <><div className="auth-alert is-warning" role="status">{text('Bạn chưa xác minh email. Hãy kiểm tra thư đã gửi tới')} {email}.</div><Turnstile token={captchaToken} onToken={setCaptchaToken} clearToken={resetCaptcha} /><button className="auth-button auth-button-primary" onClick={() => void resend()} disabled={busy || countdown > 0}>{countdown ? `${text('Gửi lại thư xác minh')} (${countdown}s)` : text('Gửi lại thư xác minh')}</button>{action('Quay lại đăng nhập', () => go('login', '/login'))}</> : null}
    {view === 'locked' ? <><div className="auth-alert is-error" role="alert"><b>{text('Tạm khoá đăng nhập')}</b> {text('Có quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút, hoặc đặt lại mật khẩu ngay.')}</div><p className="auth-supporting">{text('Việc tạm khoá giúp bảo vệ tài khoản của bạn khỏi người lạ.')}</p>{action('Đặt lại mật khẩu', () => go('forgot', '/forgot-password'), 'primary')}{action('Quay lại đăng nhập', () => go('login', '/login'))}</> : null}
    {view === 'signedin' ? <>{signOutError && <div className="auth-alert is-error" role="alert">{text(signOutError)}</div>}<div className="auth-alert is-success" role="status">{text('Không cần đăng nhập lại.')}</div><p className="auth-email-chip">{session.user?.displayName} · {session.user?.email}</p><Link className="auth-button auth-button-secondary" to={safeReturnTo}>{text('Tiếp tục mua sắm')}</Link><Link className="auth-button auth-button-secondary" to="/wishlist">{text('Sản phẩm yêu thích')}</Link><Link className="auth-button auth-button-secondary" to="/account">{text('Tài khoản của tôi')}</Link><button className="auth-button auth-button-secondary" onClick={() => void signOut()}>{text('Đăng xuất')}</button></> : null}
    </div></section><Promo /></div>;
}
