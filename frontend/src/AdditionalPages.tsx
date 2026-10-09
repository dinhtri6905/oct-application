import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Database, Eye, EyeOff,
  Info, LockKeyhole, Mail, Settings2, Trash2, UserRound,
} from 'lucide-react'

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const isSignUp = mode === 'signup'
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    const form = event.currentTarget
    const values = new FormData(form)
    if (isSignUp && values.get('password') !== values.get('confirmPassword')) {
      setError('Mật khẩu xác nhận chưa khớp. Hãy kiểm tra lại.')
      return
    }
    form.reset()
    setMessage(isSignUp
      ? 'Giao diện đăng ký đã sẵn sàng. Tài khoản chưa được tạo vì hệ thống xác thực chưa kết nối.'
      : 'Giao diện đăng nhập đã sẵn sàng. Phiên đăng nhập chưa được tạo vì hệ thống xác thực chưa kết nối.')
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
        <div className="auth-panel-top"><Link to="/" className="auth-back"><ArrowLeft size={17} /> Về ứng dụng</Link><span className="auth-panel-caption">OCT VISION AI</span></div>
        <div className="auth-form-wrap">
          <div className="auth-form-icon">{isSignUp ? <UserRound size={27} /> : <LockKeyhole size={27} />}</div>
          <span className="section-kicker">{isSignUp ? 'TÀI KHOẢN MỚI' : 'CHÀO MỪNG TRỞ LẠI'}</span>
          <h2>{isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'}</h2>
          <p className="auth-description">{isSignUp ? 'Thiết lập tài khoản để chuẩn bị cho không gian nghiên cứu cá nhân.' : 'Truy cập không gian làm việc dành cho nghiên cứu OCT.'}</p>

          <div className="auth-preview-notice"><Info size={18} /><span>Đây là bản xem trước giao diện. Tài khoản chưa hoạt động; vui lòng không nhập mật khẩu thật.</span></div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && <label className="auth-field"><span>Họ và tên</span><div className="auth-input-wrap"><UserRound size={18} /><input name="fullName" type="text" placeholder="Nhập họ và tên" autoComplete="off" required /></div></label>}
            <label className="auth-field"><span>Email</span><div className="auth-input-wrap"><Mail size={18} /><input name="email" type="email" placeholder="ten@donvi.edu.vn" autoComplete="off" required /></div></label>
            <label className="auth-field"><span>Mật khẩu</span><div className="auth-input-wrap"><LockKeyhole size={18} /><input name="password" type={showPassword ? 'text' : 'password'} placeholder={isSignUp ? 'Tối thiểu 8 ký tự' : 'Nhập mật khẩu'} autoComplete="off" minLength={8} required /><button type="button" className="auth-visibility" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword((current) => !current)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {isSignUp && <label className="auth-field"><span>Xác nhận mật khẩu</span><div className="auth-input-wrap"><LockKeyhole size={18} /><input name="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Nhập lại mật khẩu" autoComplete="off" minLength={8} required /></div></label>}
            {error && <div className="auth-feedback auth-feedback-error" role="alert">{error}</div>}
            {message && <div className="auth-feedback auth-feedback-info" role="status">{message}</div>}
            <button className="button button-primary auth-submit" type="submit">{isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'} <ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">{isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <Link to={isSignUp ? '/signin' : '/signup'}>{isSignUp ? 'Đăng nhập' : 'Đăng ký ngay'}</Link></p>
          <div className="auth-demo-divider"><span>HOẶC</span></div>
          <Link to="/" className="button button-secondary auth-demo-link">Tiếp tục xem bản demo <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  )
}

function ClearDataDialog({ count, onClose, onConfirm, busy }: { count: number; onClose: () => void; onConfirm: () => void; busy: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const clearRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => previousFocus?.focus()
  }, [])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); clearRef.current?.focus() }
        else if (!event.shiftKey && document.activeElement === clearRef.current) { event.preventDefault(); cancelRef.current?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-description"><div className="dialog-icon"><Trash2 size={23} /></div><h2 id="clear-title">Xóa toàn bộ dữ liệu demo?</h2><p id="clear-description">{count} kết quả và các ảnh đã lưu trong trình duyệt này sẽ bị xóa. Bạn không thể hoàn tác.</p><div className="dialog-actions"><button ref={cancelRef} className="button button-secondary" disabled={busy} onClick={onClose}>Giữ lại</button><button ref={clearRef} className="button button-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xóa...' : 'Xóa dữ liệu'}</button></div></div></div>
}

export function SettingsPage({ count, onClear }: { count: number; onClear: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function clearAll() {
    setBusy(true); setMessage(''); setError('')
    try {
      await onClear()
      setMessage('Đã xóa toàn bộ dữ liệu demo trên trình duyệt này.')
      setConfirming(false)
    } catch {
      setError('Không thể xóa dữ liệu lúc này. Vui lòng thử lại.')
      setConfirming(false)
    } finally {
      setBusy(false)
    }
  }

  return <div className="page-content settings-page"><div className="page-heading"><div><div className="eyebrow">KHÔNG GIAN / CÀI ĐẶT</div><h1>Cài đặt ứng dụng</h1><p>Quản lý dữ liệu minh họa và xem trạng thái hiện tại của ứng dụng.</p></div></div><div className="settings-grid"><section className="surface settings-card"><div className="settings-card-icon"><Database size={23} /></div><span className="section-kicker">DỮ LIỆU TRÌNH DUYỆT</span><h2>Thư viện demo</h2><p>Ảnh và kết quả minh họa chỉ được lưu cục bộ trong trình duyệt đang dùng. Chúng không được gửi đến máy chủ.</p><div className="settings-data-count"><strong>{count}</strong><span>kết quả đang lưu</span></div>{error && <div className="auth-feedback auth-feedback-error" role="alert">{error}</div>}{message && <div className="auth-feedback auth-feedback-info" role="status">{message}</div>}<button className="button button-outline-danger" disabled={count === 0} onClick={() => setConfirming(true)}><Trash2 size={16} /> Xóa dữ liệu demo</button></section><section className="surface settings-card"><div className="settings-card-icon"><Settings2 size={23} /></div><span className="section-kicker">THÔNG TIN ỨNG DỤNG</span><h2>Trạng thái hệ thống</h2><p>Giao diện hiện ở giai đoạn xem trước. Mô hình dự đoán và hệ thống tài khoản sẽ được kết nối ở giai đoạn tiếp theo.</p><div className="settings-status-list"><div><span>Giao diện</span><strong>Đã sẵn sàng</strong></div><div><span>Mô hình AI</span><strong>Chưa kết nối</strong></div><div><span>Tài khoản</span><strong>Chưa kết nối</strong></div></div><Link className="settings-inline-link" to="/model">Xem thông tin mô hình <ArrowRight size={16} /></Link></section></div><section className="surface settings-account"><div className="settings-account-icon"><UserRound size={21} /></div><div><h2>Tài khoản nghiên cứu</h2><p>Xem trước giao diện đăng nhập và đăng ký. Thông tin nhập vào chưa được gửi hoặc lưu.</p></div><div className="settings-account-actions"><Link className="button button-secondary" to="/signin">Đăng nhập</Link><Link className="button button-primary" to="/signup">Đăng ký</Link></div></section>{confirming && <ClearDataDialog count={count} onClose={() => setConfirming(false)} onConfirm={() => void clearAll()} busy={busy} />}</div>
}
