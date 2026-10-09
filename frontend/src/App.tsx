import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent, ReactNode } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Activity, AlertCircle, ArrowDownRight, ArrowLeft, ArrowRight, BarChart3,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  Clock3, CloudUpload, Eye, FileImage, FlaskConical, History, House,
  Info, Layers3, Menu, Microscope, MoreHorizontal, Search, Settings2, ShieldCheck,
  Sparkles, Trash2, X,
} from 'lucide-react'
import {
  CLASS_CODES, CLASS_DETAILS, clearPredictions, deletePrediction, demoScores, ensureDemoSeed,
  inspectImage, listPredictions, savePrediction, topClass,
} from './demoData'
import type { ClassCode, DemoPrediction, Scores } from './demoData'
import { AuthPage, SettingsPage } from './AdditionalPages'

type IconType = typeof House

const navItems: { to: string; label: string; icon: IconType; end?: boolean }[] = [
  { to: '/', label: 'Tổng quan', icon: House, end: true },
  { to: '/prediction', label: 'Dự đoán ảnh', icon: Microscope },
  { to: '/history', label: 'Lịch sử', icon: History },
  { to: '/model', label: 'Thông tin mô hình', icon: Layers3 },
]

function formatDate(value: string, includeTime = true): string {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1).replace('.', ',')}%`
}

function formatBytes(value: number): string {
  if (!value) return 'Ảnh minh họa'
  return value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <div className="brand-mark" aria-hidden="true">
        <Eye size={23} strokeWidth={2.2} />
      </div>
      <div className="brand-wordmark">
        <strong>OCT<span>VISION</span></strong>
        <small>NGHIÊN CỨU OCT</small>
      </div>
    </div>
  )
}

function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  return (
    <>
      {open && <button className="mobile-backdrop" aria-label="Đóng menu" onClick={close} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <Brand />
          <button className="icon-button sidebar-close" aria-label="Đóng menu" onClick={close}><X size={20} /></button>
        </div>
        <div className="sidebar-section-label">KHÔNG GIAN LÀM VIỆC</div>
        <nav className="sidebar-nav" aria-label="Điều hướng chính">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
              <Icon size={19} strokeWidth={1.9} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <NavLink to="/settings" onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
            <Settings2 size={19} strokeWidth={1.9} /><span>Cài đặt</span>
          </NavLink>
        </div>
      </aside>
    </>
  )
}

function ClassBadge({ code, subtle = false }: { code: ClassCode; subtle?: boolean }) {
  return <span className={`class-badge class-${CLASS_DETAILS[code].tone} ${subtle ? 'class-badge-subtle' : ''}`}><span className="badge-dot" />{code}</span>
}

function DemoPill() {
  return <span className="demo-pill"><span className="demo-pulse" /> DỮ LIỆU DEMO</span>
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      {action && <div className="page-heading-action">{action}</div>}
    </div>
  )
}

function ResearchNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`research-notice ${compact ? 'research-notice-compact' : ''}`}>
      <ShieldCheck size={20} />
      <div><strong>Chỉ phục vụ nghiên cứu và giáo dục</strong><span>Kết quả cần được chuyên gia đánh giá; không dùng để chẩn đoán hoặc quyết định điều trị.</span></div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, action }: { icon: IconType; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={26} strokeWidth={1.7} /></div>
      <h3>{title}</h3><p>{description}</p>{action}
    </div>
  )
}

function ScoreList({ scores, large = false }: { scores: Scores; large?: boolean }) {
  return (
    <div className={`score-list ${large ? 'score-list-large' : ''}`}>
      {CLASS_CODES.map((code) => (
        <div className="score-row" key={code}>
          <div className="score-row-top"><span className="score-label"><span className={`score-dot dot-${CLASS_DETAILS[code].tone}`} />{code}</span><strong>{formatPercent(scores[code])}</strong></div>
          <div className="score-track"><div className={`score-fill fill-${CLASS_DETAILS[code].tone}`} style={{ width: `${Math.max(scores[code] * 100, 1)}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ label, value, code, icon: Icon, helper }: { label: string; value: number; code?: ClassCode; icon: IconType; helper?: string }) {
  return (
    <div className="metric-card">
      <div className="metric-top"><span className={`metric-icon ${code ? `metric-${CLASS_DETAILS[code].tone}` : ''}`}><Icon size={19} strokeWidth={1.9} /></span><MoreHorizontal size={17} className="metric-more" /></div>
      <div className="metric-value">{value.toLocaleString('vi-VN')}</div>
      <div className="metric-label">{label}</div>
      {helper && <span className="metric-helper">{helper}</span>}
    </div>
  )
}

function DashboardPage({ records, loading, error }: { records: DemoPrediction[]; loading: boolean; error: string }) {
  const counts = useMemo(() => Object.fromEntries(CLASS_CODES.map((code) => [code, records.filter((record) => record.predictedClass === code).length])) as Record<ClassCode, number>, [records])
  const total = records.length
  return (
    <div className="page-content">
      <PageHeading eyebrow="KHÔNG GIAN / TỔNG QUAN" title="Tổng quan nghiên cứu" description="Một không gian rõ ràng để quản lý và theo dõi các lần phân tích OCT." action={<DemoPill />} />
      <section className="hero-card">
        <div className="hero-copy"><div className="hero-kicker"><Sparkles size={15} /> OCT VISION AI</div><h2>Quan sát rõ hơn.<br /><em>Nghiên cứu sâu hơn.</em></h2><p>Tải ảnh OCT, xem kết quả phân loại bốn lớp và theo dõi từng lần phân tích trong một luồng làm việc trực quan.</p><Link className="button button-white" to="/prediction">Bắt đầu phân tích <ArrowRight size={17} /></Link></div>
        <div className="hero-visual" aria-hidden="true"><div className="orb orb-one" /><div className="orb orb-two" /><div className="scan-ring scan-ring-outer" /><div className="scan-ring scan-ring-middle" /><div className="scan-ring scan-ring-inner" /><div className="scan-eye"><Eye size={78} strokeWidth={1.2} /></div><span className="scan-line scan-line-one" /><span className="scan-line scan-line-two" /><span className="scan-label scan-label-top">OCT / 04 LỚP</span><span className="scan-label scan-label-bottom">GIAO DIỆN · NGHIÊN CỨU</span></div>
      </section>
      <div className="section-heading"><div><span className="section-kicker">DỮ LIỆU TRÊN TRÌNH DUYỆT NÀY</span><h2>Hoạt động tổng quan</h2></div><span className="section-note">Số liệu minh họa</span></div>
      {error && <div className="inline-error"><AlertCircle size={18} />{error}</div>}
      <div className="metrics-grid">
        <MetricCard label="Tổng lượt phân tích" value={total} icon={Activity} helper="Dữ liệu demo" />
        <MetricCard label="CNV" value={counts.CNV} code="CNV" icon={Activity} />
        <MetricCard label="DME" value={counts.DME} code="DME" icon={Activity} />
        <MetricCard label="DRUSEN" value={counts.DRUSEN} code="DRUSEN" icon={Activity} />
        <MetricCard label="NORMAL" value={counts.NORMAL} code="NORMAL" icon={CheckCircle2} />
      </div>
      <div className="dashboard-grid">
        <section className="surface recent-surface"><div className="surface-heading"><div><span className="section-kicker">DÒNG HOẠT ĐỘNG</span><h2>Phân tích gần đây</h2></div><Link className="text-link" to="/history">Xem tất cả <ArrowRight size={16} /></Link></div>
          {loading ? <div className="loading-lines"><span /><span /><span /></div> : records.length ? <div className="recent-list">{records.slice(0, 5).map((record) => <Link key={record.id} className="recent-item" to={`/history/${record.id}`}><img src={record.imageDataUrl} alt="Ảnh minh họa cho bản ghi demo" /><div className="recent-name"><strong>{record.displayName}</strong><span>{formatDate(record.createdAt)}</span></div><ClassBadge code={record.predictedClass} /><span className="recent-score">{formatPercent(record.classScores[record.predictedClass])}</span><ChevronRight size={17} className="recent-chevron" /></Link>)}</div> : <EmptyState icon={FileImage} title="Chưa có lần phân tích nào" description="Tải ảnh OCT để bắt đầu trải nghiệm giao diện dự đoán." action={<Link className="button button-primary" to="/prediction">Tải ảnh đầu tiên <ArrowRight size={17} /></Link>} />}
        </section>
        <section className="surface distribution-surface"><div className="surface-heading"><div><span className="section-kicker">PHÂN BỔ</span><h2>Kết quả theo lớp</h2></div><BarChart3 size={19} className="surface-heading-icon" /></div><p className="surface-subtitle">Tỷ lệ các nhãn trong lịch sử demo hiện tại.</p><div className="distribution-total"><strong>{total}</strong><span>lượt phân tích</span></div><div className="distribution-bars">{CLASS_CODES.map((code) => <div className="distribution-row" key={code}><div><ClassBadge code={code} subtle /><span>{counts[code]}</span></div><div className="distribution-track"><span className={`fill-${CLASS_DETAILS[code].tone}`} style={{ width: `${total ? counts[code] / total * 100 : 0}%` }} /></div></div>)}</div><div className="surface-footnote"><Info size={15} /> Đây là dữ liệu minh họa, chưa phải thống kê nghiên cứu.</div></section>
      </div>
      <ResearchNotice />
    </div>
  )
}

type SelectedImage = { file: File; dataUrl: string; width: number; height: number }

function PredictionPage({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestVersion = useRef(0)
  const [selected, setSelected] = useState<SelectedImage | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<DemoPrediction | null>(null)

  useEffect(() => () => { requestVersion.current += 1 }, [])

  async function chooseFile(file?: File) {
    requestVersion.current += 1
    const version = requestVersion.current
    setSelected(null); setResult(null); setError(''); setBusy(false)
    if (!file) return
    try {
      const image = await inspectImage(file)
      if (version === requestVersion.current) setSelected({ file, ...image })
    } catch (cause) {
      if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : 'Không thể đọc ảnh.')
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    void chooseFile(event.target.files?.[0])
    event.target.value = ''
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); setDragging(false)
    void chooseFile(event.dataTransfer.files?.[0])
  }

  async function runDemo() {
    if (!selected || busy) return
    const version = ++requestVersion.current
    setBusy(true); setError(''); setResult(null)
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1100))
      if (version !== requestVersion.current) return
      const scores = demoScores(selected.file)
      const record: DemoPrediction = {
        id: crypto.randomUUID(),
        displayName: `OCT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        imageDataUrl: selected.dataUrl,
        imageWidth: selected.width,
        imageHeight: selected.height,
        sizeBytes: selected.file.size,
        predictedClass: topClass(scores),
        classScores: scores,
        createdAt: new Date().toISOString(),
        isSeed: false,
      }
      await savePrediction(record)
      if (version !== requestVersion.current) return
      setResult(record)
      await onRefresh()
    } catch {
      if (version === requestVersion.current) setError('Không thể lưu kết quả demo trên trình duyệt. Hãy thử lại hoặc kiểm tra dung lượng lưu trữ.')
    } finally {
      if (version === requestVersion.current) setBusy(false)
    }
  }

  return (
    <div className="page-content">
      <PageHeading eyebrow="KHÔNG GIAN / DỰ ĐOÁN" title="Phân tích ảnh OCT" description="Chọn một ảnh, xem trước và trải nghiệm cách kết quả sẽ được trình bày." action={<DemoPill />} />
      <div className="prediction-intro"><div className="intro-number">01</div><div><strong>Một luồng làm việc đơn giản</strong><span>Chọn ảnh → kiểm tra → xem kết quả minh họa.</span></div><div className="intro-end"><span>JPG / PNG</span><span>Tối đa 10 MB</span></div></div>
      <div className="prediction-grid">
        <section className="surface upload-surface"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 01 · ĐẦU VÀO</span><h2>Ảnh OCT của bạn</h2></div><span className="step-indicator">01 / 02</span></div><p className="surface-subtitle">Chỉ chọn ảnh OCT phù hợp với mô hình. Giao diện demo chưa xác minh loại ảnh OCT.</p>
          <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="visually-hidden" onChange={onFileChange} aria-label="Chọn ảnh OCT" disabled={busy} />
          {selected ? <div className="preview-wrap"><div className="preview-image"><img src={selected.dataUrl} alt="Ảnh bạn đã chọn để xem trước" /><span className="preview-label"><Eye size={13} /> XEM TRƯỚC</span></div><div className="preview-info"><span className="preview-file-icon"><FileImage size={19} /></span><div><strong title={selected.file.name}>{selected.file.name}</strong><span>{selected.width} × {selected.height} px · {formatBytes(selected.file.size)}</span></div><button className="icon-button" aria-label="Bỏ ảnh đã chọn" disabled={busy} onClick={() => void chooseFile()}><X size={18} /></button></div><button className="button button-secondary button-full" disabled={busy} onClick={() => fileInputRef.current?.click()}><CloudUpload size={17} /> Thay ảnh khác</button></div> : <div className={`dropzone ${dragging ? 'dropzone-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><div className="dropzone-art"><div className="dropzone-ring"><CloudUpload size={30} strokeWidth={1.6} /></div><span className="dropzone-spark dropzone-spark-one" /><span className="dropzone-spark dropzone-spark-two" /></div><h3>Kéo thả ảnh OCT vào đây</h3><p>hoặc chọn ảnh từ thiết bị của bạn</p><button className="button button-secondary" onClick={() => fileInputRef.current?.click()}><CloudUpload size={17} /> Chọn ảnh</button><span className="dropzone-hint">Hỗ trợ JPG, JPEG, PNG · tối đa 10 MB</span></div>}
          {error && <div className="inline-error" role="alert"><AlertCircle size={18} />{error}</div>}
          <div className="upload-actions"><button className="button button-primary button-full" disabled={!selected || busy} onClick={() => void runDemo()}>{busy ? <><span className="button-spinner" /> Đang tạo kết quả minh họa...</> : <>Xem kết quả demo <ArrowRight size={17} /></>}</button><p><Info size={14} /> Kết quả demo được tạo từ thông tin file, không phân tích nội dung ảnh. Ảnh và kết quả được lưu cục bộ trong trình duyệt này.</p></div>
        </section>
        <section className="surface result-surface"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 02 · KẾT QUẢ</span><h2>Kết quả phân loại</h2></div><span className="step-indicator">02 / 02</span></div>
          {result ? <div className="result-content"><div className="result-demo-callout"><FlaskConical size={18} /><span><strong>Đây là kết quả mô phỏng.</strong> Chưa kết nối mô hình AI; các con số không phản ánh ảnh bạn tải lên.</span></div><div className="result-primary"><div className="result-label">NHÃN MINH HỌA</div><div className="result-class"><ClassBadge code={result.predictedClass} /><strong>{CLASS_DETAILS[result.predictedClass].name}</strong></div><div className="result-score"><span>Điểm mô hình giả lập</span><strong>{formatPercent(result.classScores[result.predictedClass])}</strong></div></div><div className="result-distribution"><div className="mini-heading"><h3>Điểm của bốn lớp</h3><span>MINH HỌA</span></div><ScoreList scores={result.classScores} large /></div><div className="result-bottom"><ResearchNotice compact /><div className="result-links"><Link className="button button-secondary" to={`/history/${result.id}`}>Xem chi tiết <ArrowRight size={16} /></Link><button className="button button-quiet" onClick={() => void chooseFile()}>Phân tích ảnh khác</button></div></div></div> : busy ? <div className="result-placeholder result-loading"><div className="result-orbit"><Activity size={34} /></div><h3>Đang tạo kết quả demo</h3><p>Giao diện đang mô phỏng trạng thái xử lý. Chưa có mô hình AI chạy trên ảnh này.</p><div className="loading-progress"><span /></div></div> : <div className="result-placeholder"><div className="result-orbit"><Activity size={34} strokeWidth={1.5} /></div><h3>Kết quả sẽ xuất hiện ở đây</h3><p>Chọn ảnh ở bên trái và nhấn “Xem kết quả demo” để khám phá giao diện phân loại.</p><div className="placeholder-steps"><span><Check size={14} /> Chọn ảnh</span><span><ArrowRight size={14} /> Xem kết quả</span></div></div>}
        </section>
      </div>
      <ResearchNotice />
    </div>
  )
}

function HistoryPage({ records, loading, error }: { records: DemoPrediction[]; loading: boolean; error: string }) {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const classFilter = params.get('class') ?? 'ALL'
  const period = params.get('period') ?? 'all'
  const sort = params.get('sort') ?? 'newest'
  const currentPage = Math.max(1, Number(params.get('page') ?? '1') || 1)
  const pageSize = 8

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (!value || value === 'ALL' || value === 'all' || value === 'newest') next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  const filtered = useMemo(() => {
    const lowerQuery = query.toLocaleLowerCase('vi-VN').trim()
    const now = Date.now()
    return records.filter((record) => {
      if (classFilter !== 'ALL' && record.predictedClass !== classFilter) return false
      if (lowerQuery && !`${record.displayName} ${record.predictedClass} ${record.id}`.toLocaleLowerCase('vi-VN').includes(lowerQuery)) return false
      if (period !== 'all' && now - Date.parse(record.createdAt) > Number(period) * 24 * 3_600_000) return false
      return true
    }).sort((a, b) => sort === 'oldest' ? Date.parse(a.createdAt) - Date.parse(b.createdAt) : Date.parse(b.createdAt) - Date.parse(a.createdAt))
  }, [records, query, classFilter, period, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(currentPage, pageCount)
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="page-content"><PageHeading eyebrow="KHÔNG GIAN / LỊCH SỬ" title="Lịch sử phân tích" description="Tìm lại từng ảnh và xem chi tiết kết quả trong không gian demo này." action={<Link className="button button-primary" to="/prediction"><CloudUpload size={17} /> Phân tích ảnh mới</Link>} />
      <div className="history-summary"><div className="history-summary-icon"><History size={22} /></div><div><strong>{records.length} kết quả trong lịch sử demo</strong><span>Dữ liệu chỉ được lưu trong trình duyệt này, chưa đồng bộ với máy chủ.</span></div><DemoPill /></div>
      <section className="surface history-surface"><div className="surface-heading history-heading"><div><span className="section-kicker">THƯ VIỆN KẾT QUẢ</span><h2>Tất cả lần phân tích</h2></div><span className="result-count">{filtered.length} kết quả</span></div>
        <div className="history-toolbar"><label className="search-box"><Search size={18} /><span className="visually-hidden">Tìm theo tên hoặc lớp</span><input value={query} onChange={(event) => updateParam('q', event.target.value)} placeholder="Tìm theo tên, mã hoặc lớp..." /></label><div className="filter-group"><label className="select-wrap"><span className="visually-hidden">Lọc theo lớp</span><select value={classFilter} onChange={(event) => updateParam('class', event.target.value)}><option value="ALL">Tất cả lớp</option>{CLASS_CODES.map((code) => <option key={code} value={code}>{code}</option>)}</select><ChevronDown size={15} /></label><label className="select-wrap"><CalendarDays size={16} /><span className="visually-hidden">Lọc theo thời gian</span><select value={period} onChange={(event) => updateParam('period', event.target.value)}><option value="all">Mọi thời gian</option><option value="7">7 ngày qua</option><option value="30">30 ngày qua</option></select><ChevronDown size={15} /></label><label className="select-wrap"><span className="visually-hidden">Sắp xếp</span><select value={sort} onChange={(event) => updateParam('sort', event.target.value)}><option value="newest">Mới nhất</option><option value="oldest">Cũ nhất</option></select><ChevronDown size={15} /></label></div></div>
        {error && <div className="inline-error"><AlertCircle size={18} />{error}</div>}
        {loading ? <div className="loading-lines history-loading"><span /><span /><span /><span /></div> : visible.length ? <><div className="history-table-wrap"><table className="history-table"><thead><tr><th>ẢNH OCT</th><th>PHÂN LOẠI</th><th>ĐIỂM DEMO</th><th>THỜI GIAN</th><th><span className="visually-hidden">Chi tiết</span></th></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><Link className="table-image-cell" to={`/history/${record.id}`}><img src={record.imageDataUrl} alt="Ảnh minh họa của kết quả demo" /><span><strong>{record.displayName}</strong><small>{record.isSeed ? 'Ảnh minh họa' : `${record.imageWidth} × ${record.imageHeight} px`}</small></span></Link></td><td><ClassBadge code={record.predictedClass} /></td><td className="table-score">{formatPercent(record.classScores[record.predictedClass])}</td><td className="table-date">{formatDate(record.createdAt)}</td><td><Link className="table-action" aria-label={`Xem chi tiết ${record.displayName}`} to={`/history/${record.id}`}><ArrowRight size={18} /></Link></td></tr>)}</tbody></table></div><div className="history-mobile-list">{visible.map((record) => <Link className="history-mobile-card" key={record.id} to={`/history/${record.id}`}><img src={record.imageDataUrl} alt="Ảnh minh họa của kết quả demo" /><div><strong>{record.displayName}</strong><span>{formatDate(record.createdAt)}</span><div><ClassBadge code={record.predictedClass} /><b>{formatPercent(record.classScores[record.predictedClass])}</b></div></div><ChevronRight size={17} /></Link>)}</div><div className="table-footer"><span>Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} trong {filtered.length} kết quả</span><div className="pagination"><button aria-label="Trang trước" disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}><ChevronLeft size={17} /></button><span>{page} / {pageCount}</span><button aria-label="Trang sau" disabled={page >= pageCount} onClick={() => updateParam('page', String(page + 1))}><ChevronRight size={17} /></button></div></div></> : <EmptyState icon={Search} title={records.length ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có kết quả nào'} description={records.length ? 'Hãy thay đổi từ khóa hoặc bộ lọc để xem thêm.' : 'Bắt đầu bằng cách tải ảnh lên ở trang Dự đoán.'} action={records.length ? <button className="button button-secondary" onClick={() => setParams(new URLSearchParams())}>Xóa bộ lọc</button> : <Link className="button button-primary" to="/prediction">Bắt đầu phân tích <ArrowRight size={17} /></Link>} />}
      </section><ResearchNotice />
    </div>
  )
}

function ConfirmDialog({ onClose, onConfirm, busy }: { onClose: () => void; onConfirm: () => void; busy: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const deleteRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => previousFocus?.focus()
  }, [])
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); deleteRef.current?.focus() }
        else if (!event.shiftKey && document.activeElement === deleteRef.current) { event.preventDefault(); cancelRef.current?.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}><div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><div className="dialog-icon"><Trash2 size={23} /></div><h2 id="confirm-title">Xóa kết quả demo?</h2><p id="confirm-description">Bản ghi và ảnh lưu trong trình duyệt này sẽ bị xóa. Bạn không thể hoàn tác thao tác này.</p><div className="dialog-actions"><button ref={cancelRef} className="button button-secondary" disabled={busy} onClick={onClose}>Giữ lại</button><button ref={deleteRef} className="button button-danger" disabled={busy} onClick={onConfirm}>{busy ? 'Đang xóa...' : 'Xóa kết quả'}</button></div></div></div>
}

function DetailPage({ records, loading, onDelete }: { records: DemoPrediction[]; loading: boolean; onDelete: (id: string) => Promise<void> }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const record = records.find((item) => item.id === id)
  if (loading) return <div className="page-content"><div className="loading-lines"><span /><span /><span /></div></div>
  if (!record) return <div className="page-content"><Link className="back-link" to="/history"><ArrowLeft size={17} /> Trở về lịch sử</Link><section className="surface"><EmptyState icon={FileImage} title="Không tìm thấy kết quả" description="Bản ghi có thể đã bị xóa hoặc đường dẫn không còn hợp lệ." action={<Link className="button button-primary" to="/history">Xem lịch sử <ArrowRight size={17} /></Link>} /></section></div>
  async function remove() {
    if (!record) return
    setDeleting(true); setError('')
    try { await onDelete(record.id); navigate('/history') }
    catch { setError('Không thể xóa kết quả. Vui lòng thử lại.'); setConfirming(false) }
    finally { setDeleting(false) }
  }
  return <div className="page-content"><Link className="back-link" to="/history"><ArrowLeft size={17} /> Trở về lịch sử</Link><PageHeading eyebrow="KHÔNG GIAN / LỊCH SỬ / CHI TIẾT" title="Chi tiết phân tích" description={`Bản ghi demo ${record.displayName} · ${formatDate(record.createdAt)}`} action={<DemoPill />} />{error && <div className="inline-error" role="alert"><AlertCircle size={18} />{error}</div>}<div className="detail-grid"><section className="surface detail-image-surface"><div className="surface-heading"><div><span className="section-kicker">ẢNH ĐẦU VÀO</span><h2>Ảnh đã lưu</h2></div><FileImage size={20} className="surface-heading-icon" /></div><div className="detail-image"><img src={record.imageDataUrl} alt="Ảnh đầu vào được lưu trong bản ghi demo" /></div><div className="image-caption"><span><FileImage size={16} /> {record.displayName}</span><span>{record.imageWidth} × {record.imageHeight} px</span></div></section><section className="surface detail-result-surface"><div className="surface-heading"><div><span className="section-kicker">KẾT QUẢ MINH HỌA</span><h2>Phân loại bốn lớp</h2></div><Activity size={20} className="surface-heading-icon" /></div><div className="detail-result-lead"><ClassBadge code={record.predictedClass} /><strong>{CLASS_DETAILS[record.predictedClass].name}</strong><span>Điểm demo cao nhất <b>{formatPercent(record.classScores[record.predictedClass])}</b></span></div><div className="detail-score-heading">Điểm từng lớp <span>MINH HỌA</span></div><ScoreList scores={record.classScores} large /><div className="detail-warning"><Info size={17} /> Kết quả được mô phỏng từ thông tin file, không phản ánh nội dung ảnh.</div></section></div><div className="detail-lower"><section className="surface metadata-surface"><div className="surface-heading"><div><span className="section-kicker">THÔNG TIN BẢN GHI</span><h2>Chi tiết kỹ thuật</h2></div></div><dl className="metadata-grid"><div><dt>Mã kết quả</dt><dd className="mono">{record.id}</dd></div><div><dt>Thời gian</dt><dd>{formatDate(record.createdAt)}</dd></div><div><dt>Nguồn kết quả</dt><dd>Giao diện demo · chưa kết nối mô hình</dd></div><div><dt>Kích thước file</dt><dd>{formatBytes(record.sizeBytes)}</dd></div></dl></section><section className="surface detail-actions-surface"><span className="section-kicker">THAO TÁC</span><h2>Tiếp tục nghiên cứu</h2><p>Bắt đầu với ảnh khác hoặc quản lý bản ghi hiện tại.</p><Link className="button button-primary button-full" to="/prediction">Phân tích ảnh khác <ArrowRight size={17} /></Link><button className="button button-outline-danger button-full" onClick={() => setConfirming(true)}><Trash2 size={16} /> Xóa kết quả demo</button></section></div><ResearchNotice />{confirming && <ConfirmDialog onClose={() => setConfirming(false)} onConfirm={() => void remove()} busy={deleting} />}</div>
}

function ModelPage() {
  return <div className="page-content"><PageHeading eyebrow="KHÔNG GIAN / MÔ HÌNH" title="Thông tin mô hình" description="Hiểu phạm vi sử dụng và các lớp kết quả trước khi kết nối mô hình thật." action={<DemoPill />} /><div className="model-hero surface"><div className="model-hero-icon"><Layers3 size={30} /></div><div><span className="section-kicker">TRẠNG THÁI HỆ THỐNG</span><h2>Mô hình AI chưa được kết nối</h2><p>Giao diện hiện dùng dữ liệu mô phỏng để kiểm tra trải nghiệm. Tên kiến trúc, phiên bản và hiệu năng sẽ chỉ xuất hiện sau khi được xác minh từ artifact và báo cáo đánh giá.</p></div><span className="model-status"><span /> CHƯA KẾT NỐI</span></div><div className="model-grid"><section className="surface model-section"><div className="surface-heading"><div><span className="section-kicker">PHÂN LOẠI</span><h2>Bốn lớp đầu ra</h2></div><span className="small-count">04</span></div><p className="surface-subtitle">Các nhãn dự kiến cho mô hình phân loại ảnh OCT võng mạc.</p><div className="class-info-list">{CLASS_CODES.map((code) => <div className="class-info-item" key={code}><ClassBadge code={code} /><div><strong>{CLASS_DETAILS[code].name}</strong><span>{CLASS_DETAILS[code].short}</span></div><ArrowDownRight size={17} /></div>)}</div></section><section className="surface model-section"><div className="surface-heading"><div><span className="section-kicker">PHẠM VI ĐẦU VÀO</span><h2>Ảnh được hỗ trợ</h2></div><FileImage size={20} className="surface-heading-icon" /></div><div className="model-format-list"><div><span><Check size={17} /></span><div><strong>JPG / JPEG</strong><small>Ảnh OCT đã khử định danh</small></div></div><div><span><Check size={17} /></span><div><strong>PNG</strong><small>Ảnh OCT đã khử định danh</small></div></div></div><div className="model-limit"><AlertCircle size={19} /><div><strong>Giới hạn cần xác minh</strong><p>Độ phân giải, thiết bị chụp và quy trình tiền xử lý cuối cùng phụ thuộc vào model thật.</p></div></div></section></div><div className="model-principles"><div><span className="principle-icon"><ShieldCheck size={20} /></span><strong>Con người kiểm tra</strong><p>Mọi kết quả cần được chuyên gia đánh giá trong bối cảnh nghiên cứu.</p></div><div><span className="principle-icon"><Eye size={20} /></span><strong>Minh bạch nguồn dữ liệu</strong><p>Kết quả demo luôn được gắn nhãn rõ ràng và tách khỏi kết quả thật.</p></div><div><span className="principle-icon"><Clock3 size={20} /></span><strong>Truy vết phiên bản</strong><p>Khi tích hợp, mỗi bản ghi sẽ gắn với phiên bản model và tiền xử lý.</p></div></div><ResearchNotice /></div>
}

export default function App() {
  const [records, setRecords] = useState<DemoPrediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  async function refresh() {
    setRecords(await listPredictions())
  }

  useEffect(() => {
    let active = true
    async function initialize() {
      try {
        await ensureDemoSeed()
        const all = await listPredictions()
        if (active) setRecords(all)
      } catch {
        if (active) setError('Không thể đọc dữ liệu demo trên trình duyệt. Hãy kiểm tra quyền lưu trữ của trình duyệt.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void initialize()
    return () => { active = false }
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  async function onDelete(id: string) {
    await deletePrediction(id)
    await refresh()
  }

  async function onClear() {
    await clearPredictions()
    await refresh()
  }

  const pageName = location.pathname.startsWith('/prediction') ? 'Dự đoán ảnh'
    : location.pathname.startsWith('/history/') ? 'Chi tiết phân tích'
      : location.pathname.startsWith('/history') ? 'Lịch sử'
        : location.pathname.startsWith('/model') ? 'Thông tin mô hình'
          : location.pathname.startsWith('/settings') ? 'Cài đặt' : 'Tổng quan'

  if (location.pathname === '/signin') return <AuthPage mode="signin" />
  if (location.pathname === '/signup') return <AuthPage mode="signup" />

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} close={() => setMenuOpen(false)} />
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button menu-toggle" aria-label="Mở menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
            <div className="topbar-context"><span>OCT VISION AI</span><i aria-hidden="true" /><strong>{pageName}</strong></div>
          </div>
          <div className="topbar-right">
            <span className="topbar-date"><CalendarDays size={16} /> {new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date())}</span>
            <Link className="topbar-signin" to="/signin">Đăng nhập</Link>
            <Link className="topbar-signup" to="/signup">Đăng ký <ArrowRight size={15} /></Link>
          </div>
        </header>
        <div className="global-demo-banner"><FlaskConical size={17} /><span><strong>Giao diện demo.</strong> Mô hình AI chưa được kết nối; mọi điểm số và dữ liệu mẫu chỉ dùng để xem trước sản phẩm.</span><Link to="/model">Tìm hiểu thêm <ArrowRight size={15} /></Link></div>
        <main id="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage records={records} loading={loading} error={error} />} />
            <Route path="/prediction" element={<PredictionPage onRefresh={refresh} />} />
            <Route path="/history" element={<HistoryPage records={records} loading={loading} error={error} />} />
            <Route path="/history/:id" element={<DetailPage records={records} loading={loading} onDelete={onDelete} />} />
            <Route path="/model" element={<ModelPage />} />
            <Route path="/settings" element={<SettingsPage count={records.length} onClear={onClear} />} />
            <Route path="*" element={<div className="page-content"><section className="surface"><EmptyState icon={AlertCircle} title="Trang không tồn tại" description="Đường dẫn này không có trong ứng dụng demo." action={<Link className="button button-primary" to="/">Về tổng quan <ArrowRight size={17} /></Link>} /></section></div>} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
