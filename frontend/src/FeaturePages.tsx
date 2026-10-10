import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertCircle, ArrowRight, BarChart3, Check, CheckCircle2,
  ChevronDown, CloudUpload, Download, FileImage, Files,
  FlaskConical, Info, Layers3, Search, ShieldCheck, Trash2, X,
} from 'lucide-react'
import {
  CLASS_CODES, CLASS_DETAILS, demoScores, inspectImage, savePrediction, topClass,
} from './demoData'
import type { ClassCode, DemoPrediction } from './demoData'

function percent(value: number): string {
  return `${(value * 100).toFixed(1).replace('.', ',')}%`
}

function formatDay(value: Date): string {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(value)
}

function ClassTag({ code }: { code: ClassCode }) {
  return <span className={`class-badge class-${CLASS_DETAILS[code].tone}`}><span className="badge-dot" />{code}</span>
}

function FeatureHeading({ breadcrumb, title, description }: { breadcrumb: string; title: string; description: string }) {
  return <div className="page-heading"><div><div className="eyebrow">{breadcrumb}</div><h1>{title}</h1><p>{description}</p></div><div className="page-heading-action"><span className="demo-pill"><span className="demo-pulse" /> DỮ LIỆU DEMO</span></div></div>
}

export function AnalyticsPage({ records }: { records: DemoPrediction[] }) {
  const total = records.length
  const counts = Object.fromEntries(CLASS_CODES.map((code) => [code, records.filter((record) => record.predictedClass === code).length])) as Record<ClassCode, number>
  const averageScore = total ? records.reduce((sum, record) => sum + record.classScores[record.predictedClass], 0) / total : 0
  const common = total ? CLASS_CODES.reduce((best, next) => counts[next] > counts[best] ? next : best) : null
  const bands = [
    { label: '90–100%', count: records.filter((record) => record.classScores[record.predictedClass] >= .9).length },
    { label: '70–89%', count: records.filter((record) => record.classScores[record.predictedClass] >= .7 && record.classScores[record.predictedClass] < .9).length },
    { label: 'Dưới 70%', count: records.filter((record) => record.classScores[record.predictedClass] < .7).length },
  ]

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - (6 - index))
    const next = new Date(day)
    next.setDate(next.getDate() + 1)
    return { date: day, count: records.filter((record) => {
      const time = Date.parse(record.createdAt)
      return time >= day.getTime() && time < next.getTime()
    }).length }
  }), [records])
  const maximum = Math.max(1, ...days.map((day) => day.count))
  const chartPoints = days.map((day, index) => `${38 + index * 91},${178 - day.count / maximum * 125}`).join(' ')
  let cumulative = 0
  const donutSegments = CLASS_CODES.map((code, index) => {
    const colors = ['#ce7881', '#e3a960', '#a58bce', '#6dbb91']
    const start = cumulative
    cumulative += total ? counts[code] / total * 100 : 0
    return `${colors[index]} ${start}% ${cumulative}%`
  }).join(', ')

  return <div className="page-content"><FeatureHeading breadcrumb="KHÔNG GIAN / PHÂN TÍCH" title="Phân tích dữ liệu" description="Quan sát xu hướng và phân bố các kết quả trong lịch sử demo của bạn." /><div className="analytics-note"><FlaskConical size={18} /><span>Toàn bộ số liệu bên dưới là <strong>dữ liệu minh họa</strong>. Không dùng các biểu đồ này để đánh giá hiệu năng mô hình.</span></div><div className="analytics-stats"><div className="surface analytics-stat"><span><Files size={19} /></span><small>TỔNG KẾT QUẢ</small><strong>{total}</strong><p>Trong trình duyệt hiện tại</p></div><div className="surface analytics-stat"><span><Activity size={19} /></span><small>ĐIỂM DEMO TRUNG BÌNH</small><strong>{total ? percent(averageScore) : '—'}</strong><p>Điểm cao nhất của mỗi kết quả</p></div><div className="surface analytics-stat"><span><Layers3 size={19} /></span><small>LỚP XUẤT HIỆN NHIỀU NHẤT</small><strong>{common ?? '—'}</strong><p>{common ? `${counts[common]} trong ${total} kết quả` : 'Chưa có kết quả'}</p></div></div><div className="analytics-grid"><section className="surface analytics-chart-card"><div className="surface-heading"><div><span className="section-kicker">7 NGÀY GẦN ĐÂY</span><h2>Lượt phân tích theo ngày</h2></div><BarChart3 size={20} className="surface-heading-icon" /></div><p className="surface-subtitle">Số kết quả demo được tạo trong từng ngày.</p><div className="trend-chart"><svg viewBox="0 0 620 220" preserveAspectRatio="none" role="img" aria-label="Biểu đồ lượt phân tích trong bảy ngày gần đây"><title>Lượt phân tích bảy ngày gần đây</title><defs><linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#91bdf1" stopOpacity=".38" /><stop offset="1" stopColor="#91bdf1" stopOpacity="0" /></linearGradient></defs>{[53,95,137,178].map((y) => <line key={y} x1="38" x2="585" y1={y} y2={y} stroke="#e8edf4" strokeDasharray="4 5" />)}<polygon points={`38,178 ${chartPoints} 584,178`} fill="url(#trend-fill)" /><polyline points={chartPoints} fill="none" stroke="#2e76c6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{days.map((day, index) => <g key={day.date.toISOString()}><circle cx={38 + index * 91} cy={178 - day.count / maximum * 125} r="5" fill="#fff" stroke="#2e76c6" strokeWidth="3" /><text x={38 + index * 91} y="211" textAnchor="middle" fill="#8e9eb2" fontSize="11">{formatDay(day.date)}</text></g>)}</svg></div></section><section className="surface analytics-donut-card"><div className="surface-heading"><div><span className="section-kicker">PHÂN BỐ BỐN LỚP</span><h2>Kết quả theo lớp</h2></div></div><div className="analytics-donut-layout"><div className="analytics-donut" style={{ background: total ? `conic-gradient(${donutSegments})` : '#e9eef5' }}><div><strong>{total}</strong><span>KẾT QUẢ</span></div></div><div className="analytics-legend">{CLASS_CODES.map((code) => <div key={code}><span className={`score-dot dot-${CLASS_DETAILS[code].tone}`} /><strong>{code}</strong><span>{counts[code]}</span></div>)}</div></div><p className="analytics-caption">Nhãn là đầu ra demo, không phải chẩn đoán.</p></section></div><div className="analytics-bottom-grid"><section className="surface analytics-band-card"><div className="surface-heading"><div><span className="section-kicker">ĐIỂM DEMO</span><h2>Phân bố điểm cao nhất</h2></div></div><div className="analytics-bands">{bands.map((band) => <div key={band.label}><div><strong>{band.label}</strong><span>{band.count} kết quả</span></div><div className="distribution-track"><span style={{ width: `${total ? band.count / total * 100 : 0}%` }} /></div></div>)}</div></section><section className="surface analytics-research-card"><div className="analytics-research-icon"><ShieldCheck size={23} /></div><div><span className="section-kicker">CHỈ SỐ NGHIÊN CỨU</span><h2>Cần nhãn được kiểm chứng</h2><p>Accuracy, precision, recall và confusion matrix chỉ nên tính từ nhãn thực tế đã được chuyên gia xác minh. Phản hồi demo không được dùng làm ground truth.</p><Link to="/model">Xem giới hạn mô hình <ArrowRight size={16} /></Link></div></section></div></div>
}

type QueuedImage = {
  id: string
  file: File
  dataUrl?: string
  width?: number
  height?: number
  error?: string
}

export function BatchPage({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueuedImage[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [results, setResults] = useState<DemoPrediction[]>([])
  const [error, setError] = useState('')
  const valid = queue.filter((item) => !item.error && item.dataUrl && item.width && item.height)

  async function chooseFiles(files: FileList | File[]) {
    if (busy) return
    const selected = Array.from(files)
    setResults([]); setCompleted(0); setError('')
    if (selected.length > 20) {
      setQueue([])
      setError('Bản demo xử lý tối đa 20 ảnh mỗi lượt. Hãy chia thành nhiều lần chọn.')
      return
    }
    if (selected.reduce((sum, file) => sum + file.size, 0) > 40 * 1024 * 1024) {
      setQueue([])
      setError('Tổng dung lượng ảnh vượt 40 MB của bản demo.')
      return
    }
    const inspected = await Promise.all(selected.map(async (file): Promise<QueuedImage> => {
      try {
        const image = await inspectImage(file)
        return { id: crypto.randomUUID(), file, ...image }
      } catch (cause) {
        return { id: crypto.randomUUID(), file, error: cause instanceof Error ? cause.message : 'Không thể đọc ảnh.' }
      }
    }))
    setQueue(inspected)
  }

  function fileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void chooseFiles(event.target.files)
    event.target.value = ''
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); setDragging(false)
    void chooseFiles(event.dataTransfer.files)
  }

  async function processDemo() {
    if (busy || !valid.length) return
    setBusy(true); setCompleted(0); setResults([]); setError('')
    try {
      const produced: DemoPrediction[] = []
      for (const item of valid) {
        await new Promise((resolve) => window.setTimeout(resolve, 180))
        const scores = demoScores(item.file)
        const record: DemoPrediction = {
          id: crypto.randomUUID(),
          displayName: `BATCH-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          imageDataUrl: item.dataUrl!, imageWidth: item.width!, imageHeight: item.height!, sizeBytes: item.file.size,
          predictedClass: topClass(scores), classScores: scores, createdAt: new Date().toISOString(), isSeed: false,
        }
        await savePrediction(record)
        produced.push(record)
        setResults([...produced])
        setCompleted(produced.length)
      }
      await onRefresh()
    } catch {
      setError('Không thể lưu toàn bộ kết quả trên trình duyệt. Các ảnh đã hoàn thành vẫn nằm trong lịch sử demo.')
      await onRefresh().catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  function exportCsv() {
    if (!results.length) return
    const header = ['id', 'display_name', 'predicted_class', 'CNV', 'DME', 'DRUSEN', 'NORMAL', 'created_at', 'source']
    const rows = results.map((record) => [record.id, record.displayName, record.predictedClass, ...CLASS_CODES.map((code) => record.classScores[code].toFixed(6)), record.createdAt, 'DEMO'])
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url; anchor.download = 'oct-vision-demo-batch.csv'; anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <div className="page-content"><FeatureHeading breadcrumb="KHÔNG GIAN / DỰ ĐOÁN HÀNG LOẠT" title="Phân tích nhiều ảnh" description="Chuẩn bị một nhóm ảnh OCT và xem trước luồng xử lý hàng loạt." /><div className="batch-intro"><FlaskConical size={18} /><div><strong>Chế độ mô phỏng giao diện</strong><span>Kết quả batch được tạo từ thông tin file, không phân tích nội dung ảnh và không phải kết quả AI.</span></div></div><div className="batch-grid"><section className="surface batch-upload-card"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 01 · CHỌN ẢNH</span><h2>Danh sách đầu vào</h2></div><span className="step-indicator">01 / 02</span></div><p className="surface-subtitle">Tối đa 20 ảnh JPG/PNG, tổng dung lượng 40 MB trong bản demo.</p><input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="visually-hidden" onChange={fileChange} disabled={busy} aria-label="Chọn nhiều ảnh OCT" /><div className={`batch-dropzone ${dragging ? 'dropzone-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}><div className="batch-drop-icon"><CloudUpload size={28} /></div><strong>Kéo thả nhiều ảnh OCT vào đây</strong><span>hoặc chọn từ thiết bị của bạn</span><button className="button button-secondary" disabled={busy} onClick={() => fileInputRef.current?.click()}><Files size={16} /> Chọn nhiều ảnh</button></div>{error && <div className="inline-error" role="alert"><AlertCircle size={18} />{error}</div>}{queue.length > 0 && <div className="batch-queue"><div className="batch-queue-heading"><strong>{queue.length} ảnh đã chọn</strong><button disabled={busy} onClick={() => { setQueue([]); setResults([]); setCompleted(0) }}><Trash2 size={14} /> Bỏ tất cả</button></div><div className="batch-queue-list">{queue.map((item) => <div key={item.id}><span className={`batch-file-icon ${item.error ? 'batch-file-error' : ''}`}>{item.error ? <AlertCircle size={17} /> : <FileImage size={17} />}</span><div><strong title={item.file.name}>{item.file.name}</strong><span>{item.error ?? `${item.width} × ${item.height} px · ${Math.round(item.file.size / 1024)} KB`}</span></div>{item.error ? <b className="batch-invalid">LỖI</b> : <Check size={17} className="batch-valid" />}</div>)}</div></div>}<button className="button button-primary button-full batch-run" disabled={!valid.length || busy} onClick={() => void processDemo()}>{busy ? 'Đang xử lý ảnh demo...' : `Xem kết quả batch demo${valid.length ? ` (${valid.length})` : ''}`} <ArrowRight size={17} /></button></section><section className="surface batch-progress-card"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 02 · TIẾN TRÌNH</span><h2>Kết quả theo lô</h2></div><span className="step-indicator">02 / 02</span></div><div className="batch-progress-visual"><div className="batch-progress-icon"><Activity size={28} /></div><strong>{queue.length ? `${completed} / ${valid.length}` : '—'}</strong><span>ảnh đã hoàn thành</span></div><div className="batch-progress-track"><span style={{ width: `${valid.length ? completed / valid.length * 100 : 0}%` }} /></div><div className="batch-progress-caption"><span>{busy ? 'Đang tạo kết quả minh họa...' : results.length ? 'Đã hoàn thành bản demo' : 'Chưa bắt đầu xử lý'}</span><strong>{valid.length ? Math.round(completed / valid.length * 100) : 0}%</strong></div><div className="batch-help"><Info size={17} /><span>Thanh tiến trình thể hiện số ảnh demo đã xử lý, không phải tiến độ suy luận của mô hình AI.</span></div></section></div>{results.length > 0 && <section className="surface batch-results"><div className="surface-heading"><div><span className="section-kicker">KẾT QUẢ MINH HỌA</span><h2>{results.length} ảnh đã hoàn thành</h2></div><button className="button button-secondary" onClick={exportCsv}><Download size={16} /> Tải CSV demo</button></div><div className="batch-results-table"><div className="batch-results-header"><span>ẢNH</span><span>LỚP DEMO</span><span>ĐIỂM DEMO</span><span>CHI TIẾT</span></div>{results.map((record) => <div className="batch-results-row" key={record.id}><div><img src={record.imageDataUrl} alt="Ảnh đã chọn trong lượt batch demo" /><strong>{record.displayName}</strong></div><ClassTag code={record.predictedClass} /><strong>{percent(record.classScores[record.predictedClass])}</strong><Link to={`/history/${record.id}`} aria-label={`Xem chi tiết ${record.displayName}`}><ArrowRight size={17} /></Link></div>)}</div></section>}</div>
}

export function ExplanationPanel({ record }: { record: DemoPrediction }) {
  const [tab, setTab] = useState<'original' | 'heatmap' | 'overlay'>('original')
  return <section className="surface explanation-panel"><div className="surface-heading"><div><span className="section-kicker">GIẢI THÍCH MÔ HÌNH</span><h2>Vùng ảnh được chú ý</h2></div><span className="model-status"><span /> CHƯA KẾT NỐI</span></div><p className="surface-subtitle">Grad-CAM sẽ có khi model thật hỗ trợ. Heatmap không phải vùng bệnh lý đã được xác nhận.</p><div className="explanation-tabs" role="tablist" aria-label="Chế độ xem ảnh"><button role="tab" aria-selected={tab === 'original'} className={tab === 'original' ? 'explanation-tab-active' : ''} onClick={() => setTab('original')}>Ảnh gốc</button><button role="tab" aria-selected={tab === 'heatmap'} className={tab === 'heatmap' ? 'explanation-tab-active' : ''} onClick={() => setTab('heatmap')}>Heatmap</button><button role="tab" aria-selected={tab === 'overlay'} className={tab === 'overlay' ? 'explanation-tab-active' : ''} onClick={() => setTab('overlay')}>Overlay</button></div><div className="explanation-content" role="tabpanel">{tab === 'original' ? <img src={record.imageDataUrl} alt="Ảnh gốc trong bản ghi demo" /> : <div><Search size={30} /><strong>{tab === 'heatmap' ? 'Heatmap chưa khả dụng' : 'Overlay chưa khả dụng'}</strong><span>Cần kết nối model thật và kiểm tra phương pháp giải thích trước khi hiển thị.</span></div>}</div></section>
}

export function FeedbackPanel({ record, onSave }: { record: DemoPrediction; onSave: (updated: DemoPrediction) => Promise<void> }) {
  const [choice, setChoice] = useState<'yes' | 'no' | null>(record.feedback ? record.feedback.correct ? 'yes' : 'no' : null)
  const [actualClass, setActualClass] = useState<ClassCode | ''>(record.feedback?.actualClass ?? '')
  const [editing, setEditing] = useState(!record.feedback)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!choice) { setError('Hãy chọn một phương án.'); return }
    if (choice === 'no' && (!actualClass || actualClass === record.predictedClass)) { setError('Hãy chọn một lớp khác với lớp dự đoán.'); return }
    setBusy(true); setError('')
    try {
      await onSave({ ...record, feedback: { correct: choice === 'yes', actualClass: choice === 'yes' ? record.predictedClass : actualClass as ClassCode, createdAt: new Date().toISOString(), status: 'unverified' } })
      setEditing(false)
    } catch {
      setError('Không thể lưu phản hồi demo. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="surface feedback-panel"><div className="surface-heading"><div><span className="section-kicker">PHẢN HỒI NGHIÊN CỨU</span><h2>Đánh giá kết quả minh họa</h2></div><FlaskConical size={20} className="surface-heading-icon" /></div><p className="surface-subtitle">Phản hồi demo chỉ lưu trên trình duyệt và chưa phải ground truth được kiểm chứng.</p>{record.feedback && !editing ? <div className="feedback-saved"><CheckCircle2 size={22} /><div><strong>Đã lưu phản hồi tham khảo</strong><span>Bạn chọn: {record.feedback.correct ? 'Phù hợp' : `Chưa phù hợp · Lớp đề xuất ${record.feedback.actualClass}`}. Phản hồi này không được dùng để tính accuracy.</span></div><button className="button button-secondary" onClick={() => setEditing(true)}>Chỉnh sửa</button></div> : <><div className="feedback-options"><button className={choice === 'yes' ? 'feedback-option-selected' : ''} onClick={() => { setChoice('yes'); setError('') }}><CheckCircle2 size={21} /><strong>Phù hợp</strong><span>Nhãn demo trùng với đánh giá của bạn</span></button><button className={choice === 'no' ? 'feedback-option-selected' : ''} onClick={() => { setChoice('no'); setError('') }}><X size={21} /><strong>Chưa phù hợp</strong><span>Chọn một nhãn khác để minh họa</span></button></div>{choice === 'no' && <label className="feedback-select"><span>Lớp bạn đề xuất</span><div className="select-wrap"><select value={actualClass} onChange={(event) => setActualClass(event.target.value as ClassCode)}><option value="">Chọn lớp</option>{CLASS_CODES.filter((code) => code !== record.predictedClass).map((code) => <option value={code} key={code}>{code} — {CLASS_DETAILS[code].name}</option>)}</select><ChevronDown size={16} /></div></label>}{error && <div className="inline-error" role="alert"><AlertCircle size={17} />{error}</div>}<div className="feedback-actions"><button className="button button-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Đang lưu...' : 'Lưu phản hồi demo'} <ArrowRight size={16} /></button>{record.feedback && <button className="button button-quiet" onClick={() => setEditing(false)}>Hủy</button>}</div></>}</section>
}

export function ComparisonPanel({ record }: { record: DemoPrediction }) {
  if (!record.feedback) return null
  return <section className="surface comparison-panel"><div className="surface-heading"><div><span className="section-kicker">ĐỐI CHIẾU PHẢN HỒI</span><h2>Kết quả và lớp đề xuất</h2></div><Layers3 size={20} className="surface-heading-icon" /></div><div className="comparison-grid"><div><span>Nhãn demo</span><ClassTag code={record.predictedClass} /></div><div><span>Lớp bạn đề xuất</span><ClassTag code={record.feedback.actualClass} /></div><div><span>Đối chiếu</span><strong className={record.feedback.correct ? 'comparison-match' : 'comparison-different'}>{record.feedback.correct ? 'Trùng khớp' : 'Khác nhau'}</strong></div></div><p><Info size={16} /> Đây là đối chiếu với phản hồi chưa kiểm chứng, không phản ánh độ chính xác của mô hình.</p></section>
}
