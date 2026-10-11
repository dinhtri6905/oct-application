import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Eye, EyeOff,
  LockKeyhole, Mail, Moon, Sun, UserRound,
} from 'lucide-react'
import type { Theme } from './theme'
import { api } from './api'
import type { Account } from './api'

export function AuthPage({ mode, theme, onThemeToggle, onAuthenticated }: { mode: 'signin' | 'signup'; theme: Theme; onThemeToggle: () => void; onAuthenticated: (account: Account) => void }) {
  const isSignUp = mode === 'signup'
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const form = event.currentTarget
    const values = new FormData(form)
    if (isSignUp && values.get('password') !== values.get('confirmPassword')) {
      setError('Mật khẩu xác nhận chưa khớp. Hãy kiểm tra lại.')
      return
    }
    setBusy(true)
    try {
      const email = String(values.get('email') ?? '')
      const password = String(values.get('password') ?? '')
      const account = isSignUp
        ? await api.register(String(values.get('fullName') ?? ''), email, password)
        : await api.login(email, password)
      onAuthenticated(account)
      navigate('/', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.')
    } finally { setBusy(false) }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="Giới thiệu OCT Vision AI">
        <Link to="/" className="auth-brand" aria-label="Về trang tổng quan OCT Vision AI">
          <span className="auth-brand-mark"><Eye size={25} strokeWidth={2.1} /></span>
          <span><strong>OCT<span>VISION</span></strong><small>NGHIÊN CỨU OCT</small></span>
        </Link>
        <div className="auth-story-content">
          <span className="auth-kicker"><span /> KHÔNG GIAN NGHIÊN CỨU</span>
          <h1>Hình ảnh rõ ràng.<br /><em>Quy trình mạch lạc.</em></h1>
          <p>Một giao diện tập trung để xem ảnh OCT, theo dõi kết quả và quản lý quá trình phân tích trong cùng một nơi.</p>
          <div className="auth-story-points">
            <span><CheckCircle2 size={18} /> Luồng thao tác trực quan</span>
            <span><CheckCircle2 size={18} /> Kết quả trình bày rõ ràng</span>
            <span><CheckCircle2 size={18} /> Thông tin nghiên cứu có thể truy lại</span>
          </div>
        </div>
        <div className="auth-story-art" aria-hidden="true"><div className="auth-art-ring auth-art-ring-one" /><div className="auth-art-ring auth-art-ring-two" /><div className="auth-art-ring auth-art-ring-three" /><Eye size={86} strokeWidth={1.1} /></div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top"><div className="auth-panel-top-right"><button className="theme-toggle" aria-label={theme === 'light' ? 'Chuyển sang giao diện tối' : 'Chuyển sang giao diện sáng'} title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} aria-pressed={theme === 'dark'} onClick={onThemeToggle}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><span className="auth-panel-caption">OCT VISION AI</span></div></div>
        <div className="auth-form-wrap">
          <div className="auth-form-icon">{isSignUp ? <UserRound size={27} /> : <LockKeyhole size={27} />}</div>
          <span className="section-kicker">{isSignUp ? 'TÀI KHOẢN MỚI' : 'CHÀO MỪNG TRỞ LẠI'}</span>
          <h2>{isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>
          <p className="auth-description">{isSignUp ? 'Thiết lập tài khoản để chuẩn bị cho không gian nghiên cứu cá nhân.' : 'Truy cập không gian làm việc dành cho nghiên cứu OCT.'}</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && <label className="auth-field"><span>Họ và tên</span><div className="auth-input-wrap"><UserRound size={18} /><input name="fullName" type="text" placeholder="Nhập họ và tên" autoComplete="name" required maxLength={80} /></div></label>}
            <label className="auth-field"><span>Email</span><div className="auth-input-wrap"><Mail size={18} /><input name="email" type="email" placeholder="ten@donvi.edu.vn" autoComplete="email" required /></div></label>
            <label className="auth-field"><span>Mật khẩu</span><div className="auth-input-wrap"><LockKeyhole size={18} /><input name="password" aria-label="Mật khẩu" type={showPassword ? 'text' : 'password'} placeholder={isSignUp ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu'} autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={8} required /><button type="button" className="auth-visibility" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {isSignUp && <label className="auth-field"><span>Xác nhận mật khẩu</span><div className="auth-input-wrap"><LockKeyhole size={18} /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Nhập lại mật khẩu" autoComplete="new-password" minLength={8} required /></div></label>}
            {error && <div className="auth-feedback auth-feedback-error" role="alert">{error}</div>}
            <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'} <ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">{isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <Link to={isSignUp ? '/signin' : '/signup'}>{isSignUp ? 'Đăng nhập' : 'Đăng ký ngay'}</Link></p>
        </div>
      </section>
    </main>
  )
}
