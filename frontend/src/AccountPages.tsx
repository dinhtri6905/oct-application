import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Database, Info, ListFilter, Settings2, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import type { Account } from './api'
import type { PageSize } from './preferences'
import { initials } from './profile'

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
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="clear-title" aria-describedby="clear-description"><div className="dialog-icon"><Trash2 size={23} /></div><h2 id="clear-title">Xóa toàn bộ dữ liệu?</h2><p id="clear-description">{count} kết quả cùng ảnh của tài khoản này sẽ bị xóa khỏi máy chủ. Bạn không thể hoàn tác.</p><div className="dialog-actions"><button ref={cancelRef} className="button button-secondary" disabled={busy} onClick={onClose}>Giữ lại</button><button ref={clearRef} className="button button-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xóa...' : 'Xóa dữ liệu'}</button></div></div></div>
}

export function SettingsPage({ count, onClear, pageSize, onPageSizeChange, modelReady, account }: { count: number; onClear: () => Promise<void>; pageSize: PageSize; onPageSizeChange: (value: PageSize) => void; modelReady: boolean; account: Account }) {
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function clearAll() {
    setBusy(true); setMessage(''); setError('')
    try {
      await onClear()
      setMessage('Đã xóa dữ liệu phân tích của tài khoản này.')
      setConfirming(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể xóa dữ liệu lúc này.')
      setConfirming(false)
    } finally { setBusy(false) }
  }

  return <div className="page-content settings-page"><div className="page-heading"><div><div className="eyebrow">KHÔNG GIAN / CÀI ĐẶT</div><h1>Cài đặt ứng dụng</h1><p>Quản lý dữ liệu, tài khoản và các tùy chọn của ứng dụng.</p></div></div><div className="settings-grid"><section className="surface settings-card"><div className="settings-card-icon"><Database size={23} /></div><span className="section-kicker">DỮ LIỆU TÀI KHOẢN</span><h2>Dữ liệu phân tích</h2><p>Kết quả và ảnh được lưu riêng cho tài khoản của bạn trên máy chủ.</p><div className="settings-data-count"><strong>{count}</strong><span>kết quả đang lưu</span></div>{error && <div className="auth-feedback auth-feedback-error" role="alert">{error}</div>}{message && <div className="auth-feedback auth-feedback-info" role="status">{message}</div>}<button className="button button-outline-danger" onClick={() => setConfirming(true)} disabled={!count}><Trash2 size={16} /> Xóa dữ liệu</button></section><section className="surface settings-card"><div className="settings-card-icon"><Settings2 size={23} /></div><span className="section-kicker">THÔNG TIN ỨNG DỤNG</span><h2>Trạng thái hệ thống</h2><p>Theo dõi các dịch vụ cần thiết cho quá trình phân tích ảnh OCT.</p><div className="settings-status-list"><div><span>Giao diện</span><strong>Đã sẵn sàng</strong></div><div><span>Mô hình AI</span><strong>{modelReady ? 'Đã sẵn sàng' : 'Chưa sẵn sàng'}</strong></div><div><span>Tài khoản</span><strong>Đã đăng nhập</strong></div></div><Link className="settings-inline-link" to="/model">Xem thông tin mô hình <ArrowRight size={16} /></Link></section></div><section className="surface settings-preferences"><div className="settings-card-icon"><ListFilter size={22} /></div><div><span className="section-kicker">TÙY CHỌN HIỂN THỊ</span><h2>Lịch sử phân tích</h2><p>Số bản ghi hiển thị trên mỗi trang. Tùy chọn được lưu trong trình duyệt này.</p></div><label className="settings-page-size">Kết quả mỗi trang<select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}><option value={8}>8 kết quả</option><option value={16}>16 kết quả</option><option value={32}>32 kết quả</option></select></label></section><section className="surface settings-account"><div className="settings-account-icon"><UserRound size={21} /></div><div><h2>Tài khoản nghiên cứu</h2><p>{account.name} · {account.email}</p></div><div className="settings-account-actions"><Link className="button button-secondary" to="/profile">Xem hồ sơ</Link></div></section>{confirming && <ClearDataDialog count={count} onClose={() => setConfirming(false)} onConfirm={() => void clearAll()} busy={busy} />}</div>
}

export function ProfilePage({ account, onDisplayNameChange, count }: { account: Account; onDisplayNameChange: (value: string) => Promise<void>; count: number }) {
  const [name, setName] = useState(account.name)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = name.trim().replace(/\s+/g, ' ')
    if (value.length < 2) { setError('Tên phải có ít nhất hai ký tự.'); return }
    setBusy(true); setError(''); setSaved(false)
    try { await onDisplayNameChange(value); setName(value); setSaved(true) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không thể lưu tên.') }
    finally { setBusy(false) }
  }

  return <div className="page-content profile-page"><div className="page-heading"><div><div className="eyebrow">TÀI KHOẢN / HỒ SƠ</div><h1>Hồ sơ của bạn</h1><p>Thông tin cá nhân và quyền truy cập không gian nghiên cứu.</p></div></div><section className="surface profile-card"><div className="profile-cover" aria-hidden="true"><span /><span /><span /></div><div className="profile-content"><span className="profile-avatar">{initials(account.name)}</span><div className="profile-heading"><div><span className="section-kicker">TÀI KHOẢN NGHIÊN CỨU</span><h2>{account.name}</h2><p>{account.email}</p></div><span className="profile-status">Đã đăng nhập</span></div><form className="profile-name-form" onSubmit={(event) => void saveName(event)}><label htmlFor="profile-display-name">Tên hiển thị</label><div><input id="profile-display-name" value={name} onChange={(event) => { setName(event.target.value); setSaved(false) }} maxLength={80} minLength={2} required /><button className="button button-secondary" type="submit" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu tên'}</button></div><span>Tên được đồng bộ với tài khoản của bạn.</span>{saved && <strong role="status">Đã cập nhật tên hiển thị.</strong>}{error && <div className="inline-error" role="alert">{error}</div>}</form><div className="profile-message"><ShieldCheck size={19} /><div><strong>{count} kết quả phân tích</strong><p>Thành viên từ {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(new Date(account.createdAt))}. Ảnh và lịch sử chỉ có thể xem khi đăng nhập tài khoản này.</p></div></div><div className="profile-actions"><Link className="button button-primary" to="/history">Xem lịch sử <ArrowRight size={16} /></Link><Link className="button button-secondary" to="/settings">Cài đặt</Link></div></div></section><div className="research-notice"><Info size={20} /><div><strong>Chỉ phục vụ nghiên cứu và giáo dục</strong><span>Kết quả cần được chuyên gia đánh giá; không dùng để chẩn đoán hoặc quyết định điều trị.</span></div></div></div>
}
