import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, LogOut, Settings2, UserRound } from 'lucide-react'
import { initials } from './profile'
import type { Account } from './api'

export function AccountMenu({ account, onLogout }: { account: Account; onLogout: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const displayName = account.name

  async function signOut() {
    setError('')
    try { await onLogout() }
    catch { setError('Không thể đăng xuất. Vui lòng thử lại.') }
  }

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return <div className="account-menu" ref={root}>
    <button className="account-trigger" aria-label={`Mở menu tài khoản ${displayName}`} aria-expanded={open} aria-controls="account-popover" onClick={() => setOpen((value) => !value)}>
      <span className="account-avatar" aria-hidden="true">{initials(displayName)}</span>
      <span className="account-identity"><strong>{displayName}</strong><small>{account.email}</small></span>
      <ChevronDown size={16} className={open ? 'account-chevron-open' : ''} />
    </button>
    {open && <div id="account-popover" className="account-popover">
      <div className="account-popover-head"><span className="account-avatar account-avatar-large" aria-hidden="true">{initials(displayName)}</span><div><strong>{displayName}</strong><span>{account.email}</span></div></div>
      <nav aria-label="Tài khoản">
        <Link to="/profile" onClick={() => setOpen(false)}><UserRound size={17} /> Hồ sơ</Link>
        <Link to="/settings" onClick={() => setOpen(false)}><Settings2 size={17} /> Cài đặt</Link>
        <span className="account-popover-divider" />
        <button className="account-logout" onClick={() => void signOut()}><LogOut size={17} /> Đăng xuất</button>
      </nav>
      {error && <div className="auth-feedback auth-feedback-error" role="alert">{error}</div>}
    </div>}
  </div>
}
