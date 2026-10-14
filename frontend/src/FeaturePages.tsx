import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, AlertCircle, ArrowRight, BarChart3, CheckCircle2,
  ChevronDown, Files, FlaskConical, Info, Layers3, Search, ShieldCheck, X,
} from 'lucide-react'
import {
  CLASS_CODES, CLASS_DETAILS,
} from './predictionData'
import type { ClassCode, PredictionRecord } from './predictionData'

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
  return <div className="page-heading"><div><div className="eyebrow">{breadcrumb}</div><h1>{title}</h1><p>{description}</p></div></div>
}

type TrendDay = { date: Date; count: number }

function TrendChart({ days }: { days: TrendDay[] }) {
  const [activeDay, setActiveDay] = useState<number | null>(null)
  const maximum = Math.max(1, ...days.map((day) => day.count))
  const point = (day: TrendDay, index: number) => ({
    x: 38 + index * 91,
    y: 178 - day.count / maximum * 125,
  })
  const chartPoints = days.map((day, index) => {
    const { x, y } = point(day, index)
    return x + ',' + y
  }).join(' ')
  const active = activeDay === null ? null : point(days[activeDay], activeDay)

  return (
    <div className="trend-chart">
      <svg viewBox="0 0 620 220" preserveAspectRatio="none" role="group" aria-label="Biểu đồ lượt phân tích trong bảy ngày gần đây">
        <title>Lượt phân tích bảy ngày gần đây</title>
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#91bdf1" stopOpacity=".38" />
            <stop offset="1" stopColor="#91bdf1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[53, 95, 137, 178].map((y) => <line key={y} x1="38" x2="585" y1={y} y2={y} stroke="#e8edf4" strokeDasharray="4 5" />)}
        <polygon points={'38,178 ' + chartPoints + ' 584,178'} fill="url(#trend-fill)" />
        <polyline points={chartPoints} fill="none" stroke="#2e76c6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {days.map((day, index) => {
          const { x, y } = point(day, index)
          const fullDate = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(day.date)
          return (
            <g
              key={day.date.toISOString()}
              className={'trend-point' + (activeDay === index ? ' trend-point-active' : '')}
              role="button"
              tabIndex={0}
              aria-label={fullDate + ': ' + day.count + ' ảnh đã phân tích'}
              onMouseEnter={() => setActiveDay(index)}
              onMouseLeave={() => setActiveDay(null)}
              onFocus={() => setActiveDay(index)}
              onBlur={() => setActiveDay(null)}
              onClick={() => setActiveDay(index)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setActiveDay(null)
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveDay(index) }
              }}
            >
              <circle className="trend-point-hit" cx={x} cy={y} r="20" />
              {activeDay === index && <circle className="trend-point-halo" cx={x} cy={y} r="12" />}
              <circle className="trend-point-marker" cx={x} cy={y} r={activeDay === index ? 7 : 5} />
            </g>
          )
        })}
        {days.map((day, index) => <text key={day.date.toISOString()} x={38 + index * 91} y="211" textAnchor="middle" fill="#8e9eb2" fontSize="11">{formatDay(day.date)}</text>)}
      </svg>
      {activeDay !== null && active && (
        <div
          className="trend-tooltip"
          role="tooltip"
          style={{
            left: 'clamp(70px, ' + (active.x / 620 * 100) + '%, calc(100% - 70px))',
            top: (active.y / 220 * 100) + '%',
          }}
        >
          <strong>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(days[activeDay].date)}</strong>
          <span>{days[activeDay].count} ảnh đã phân tích</span>
        </div>
      )}
    </div>
  )
}

export function AnalyticsPage({ records }: { records: PredictionRecord[] }) {
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
  let cumulative = 0
  const donutSegments = CLASS_CODES.map((code, index) => {
    const colors = ['#ce7881', '#e3a960', '#a58bce', '#6dbb91']
    const start = cumulative
    cumulative += total ? counts[code] / total * 100 : 0
    return `${colors[index]} ${start}% ${cumulative}%`
  }).join(', ')

  return <div className="page-content"><FeatureHeading breadcrumb="KHÔNG GIAN / PHÂN TÍCH" title="Phân tích dữ liệu" description="Quan sát xu hướng và phân bố các kết quả trong lịch sử phân tích của bạn." /><div className="analytics-note"><FlaskConical size={18} /><span>Biểu đồ sẽ cập nhật khi có kết quả từ mô hình AI. Chỉ số nghiên cứu cần nhãn được chuyên gia xác minh.</span></div><div className="analytics-stats"><div className="surface analytics-stat"><span><Files size={19} /></span><small>TỔNG KẾT QUẢ</small><strong>{total}</strong><p>Trong trình duyệt hiện tại</p></div><div className="surface analytics-stat"><span><Activity size={19} /></span><small>ĐIỂM PHÂN LOẠI TRUNG BÌNH</small><strong>{total ? percent(averageScore) : '—'}</strong><p>Điểm cao nhất của mỗi kết quả</p></div><div className="surface analytics-stat"><span><Layers3 size={19} /></span><small>LỚP XUẤT HIỆN NHIỀU NHẤT</small><strong>{common ?? '—'}</strong><p>{common ? `${counts[common]} trong ${total} kết quả` : 'Chưa có kết quả'}</p></div></div><div className="analytics-grid"><section className="surface analytics-chart-card"><div className="surface-heading"><div><span className="section-kicker">7 NGÀY GẦN ĐÂY</span><h2>Lượt phân tích theo ngày</h2></div><BarChart3 size={20} className="surface-heading-icon" /></div><p className="surface-subtitle">Số kết quả được tạo trong từng ngày.</p><TrendChart days={days} /></section><section className="surface analytics-donut-card"><div className="surface-heading"><div><span className="section-kicker">PHÂN BỐ BỐN LỚP</span><h2>Kết quả theo lớp</h2></div></div><div className="analytics-donut-layout"><div className="analytics-donut" style={{ background: total ? `conic-gradient(${donutSegments})` : '#e9eef5' }}><div><strong>{total}</strong><span>KẾT QUẢ</span></div></div><div className="analytics-legend">{CLASS_CODES.map((code) => <div key={code}><span className={`score-dot dot-${CLASS_DETAILS[code].tone}`} /><strong>{code}</strong><span>{counts[code]}</span></div>)}</div></div><p className="analytics-caption">Các nhãn phân loại không thay thế đánh giá lâm sàng.</p></section></div><div className="analytics-bottom-grid"><section className="surface analytics-band-card"><div className="surface-heading"><div><span className="section-kicker">ĐIỂM PHÂN LOẠI</span><h2>Phân bố điểm cao nhất</h2></div></div><div className="analytics-bands">{bands.map((band) => <div key={band.label}><div><strong>{band.label}</strong><span>{band.count} kết quả</span></div><div className="distribution-track"><span style={{ width: `${total ? band.count / total * 100 : 0}%` }} /></div></div>)}</div></section><section className="surface analytics-research-card"><div className="analytics-research-icon"><ShieldCheck size={23} /></div><div><span className="section-kicker">CHỈ SỐ NGHIÊN CỨU</span><h2>Cần nhãn được kiểm chứng</h2><p>Accuracy, precision, recall và confusion matrix chỉ nên tính từ nhãn thực tế đã được chuyên gia xác minh. Phản hồi chưa kiểm chứng không được dùng làm ground truth.</p><Link to="/model">Xem giới hạn mô hình <ArrowRight size={16} /></Link></div></section></div></div>
}

export function ExplanationPanel({ record }: { record: PredictionRecord }) {
  const [tab, setTab] = useState<'original' | 'heatmap' | 'overlay'>('original')
  return <section className="surface explanation-panel"><div className="surface-heading"><div><span className="section-kicker">GIẢI THÍCH MÔ HÌNH</span><h2>Giải thích kết quả</h2></div><span className="model-status"><span /> GRAD-CAM CHƯA CÓ</span></div><p className="surface-subtitle">Ảnh gốc được lưu cùng kết quả. Grad-CAM cho MaxViT chưa được xác minh; heatmap không phải vùng bệnh lý đã xác nhận.</p><div className="explanation-tabs" role="tablist" aria-label="Chế độ xem ảnh"><button role="tab" aria-selected={tab === 'original'} className={tab === 'original' ? 'explanation-tab-active' : ''} onClick={() => setTab('original')}>Ảnh gốc</button><button role="tab" aria-selected={tab === 'heatmap'} className={tab === 'heatmap' ? 'explanation-tab-active' : ''} onClick={() => setTab('heatmap')}>Heatmap</button><button role="tab" aria-selected={tab === 'overlay'} className={tab === 'overlay' ? 'explanation-tab-active' : ''} onClick={() => setTab('overlay')}>Overlay</button></div><div className="explanation-content" role="tabpanel">{tab === 'original' ? <img src={record.imageDataUrl} alt="Ảnh gốc trong bản ghi" /> : <div><Search size={30} /><strong>{tab === 'heatmap' ? 'Heatmap chưa khả dụng' : 'Overlay chưa khả dụng'}</strong><span>Cần xác minh phương pháp giải thích trước khi hiển thị.</span></div>}</div></section>
}

export function FeedbackPanel({ record, onSave }: { record: PredictionRecord; onSave: (updated: PredictionRecord) => Promise<void> }) {
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
      setError('Không thể lưu phản hồi. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="surface feedback-panel"><div className="surface-heading"><div><span className="section-kicker">PHẢN HỒI NGHIÊN CỨU</span><h2>Đánh giá kết quả phân loại</h2></div><FlaskConical size={20} className="surface-heading-icon" /></div><p className="surface-subtitle">Phản hồi chưa phải nhãn thực tế được chuyên gia kiểm chứng.</p>{record.feedback && !editing ? <div className="feedback-saved"><CheckCircle2 size={22} /><div><strong>Đã lưu phản hồi tham khảo</strong><span>Bạn chọn: {record.feedback.correct ? 'Phù hợp' : `Chưa phù hợp · Lớp đề xuất ${record.feedback.actualClass}`}. Phản hồi này không được dùng để tính accuracy.</span></div><button className="button button-secondary" onClick={() => setEditing(true)}>Chỉnh sửa</button></div> : <><div className="feedback-options"><button className={choice === 'yes' ? 'feedback-option-selected' : ''} onClick={() => { setChoice('yes'); setError('') }}><CheckCircle2 size={21} /><strong>Phù hợp</strong><span>Nhãn phân loại trùng với đánh giá của bạn</span></button><button className={choice === 'no' ? 'feedback-option-selected' : ''} onClick={() => { setChoice('no'); setError('') }}><X size={21} /><strong>Chưa phù hợp</strong><span>Chọn một nhãn khác để đối chiếu</span></button></div>{choice === 'no' && <label className="feedback-select"><span>Lớp bạn đề xuất</span><div className="select-wrap"><select value={actualClass} onChange={(event) => setActualClass(event.target.value as ClassCode)}><option value="">Chọn lớp</option>{CLASS_CODES.filter((code) => code !== record.predictedClass).map((code) => <option value={code} key={code}>{code} — {CLASS_DETAILS[code].name}</option>)}</select><ChevronDown size={16} /></div></label>}{error && <div className="inline-error" role="alert"><AlertCircle size={17} />{error}</div>}<div className="feedback-actions"><button className="button button-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Đang lưu...' : 'Lưu phản hồi'} <ArrowRight size={16} /></button>{record.feedback && <button className="button button-quiet" onClick={() => setEditing(false)}>Hủy</button>}</div></>}</section>
}

export function ComparisonPanel({ record }: { record: PredictionRecord }) {
  if (!record.feedback) return null
  return <section className="surface comparison-panel"><div className="surface-heading"><div><span className="section-kicker">ĐỐI CHIẾU PHẢN HỒI</span><h2>Kết quả và lớp đề xuất</h2></div><Layers3 size={20} className="surface-heading-icon" /></div><div className="comparison-grid"><div><span>Nhãn phân loại</span><ClassTag code={record.predictedClass} /></div><div><span>Lớp bạn đề xuất</span><ClassTag code={record.feedback.actualClass} /></div><div><span>Đối chiếu</span><strong className={record.feedback.correct ? 'comparison-match' : 'comparison-different'}>{record.feedback.correct ? 'Trùng khớp' : 'Khác nhau'}</strong></div></div><p><Info size={16} /> Đây là đối chiếu với phản hồi chưa kiểm chứng, không phản ánh độ chính xác của mô hình.</p></section>
}
