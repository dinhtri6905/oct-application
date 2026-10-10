import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertCircle, ArrowRight, Check, CloudUpload, FileImage, Files, Info, Trash2 } from 'lucide-react'
import { api, ApiError } from './api'
import { inspectImage } from './predictionData'
import type { PredictionRecord } from './predictionData'

type QueuedImage = { id: string; file: File; width?: number; height?: number; error?: string }

export function BatchPage({ onCreated }: { onCreated: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<QueuedImage[]>([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<Record<string, { record?: PredictionRecord; error?: string }>>({})
  const [busy, setBusy] = useState(false)
  const [workingId, setWorkingId] = useState('')
  const [stopped, setStopped] = useState(false)
  const validCount = queue.filter((item) => !item.error).length
  const completedCount = Object.keys(results).length

  async function chooseFiles(files: FileList | File[]) {
    const selected = Array.from(files)
    if (busy) return
    setQueue([]); setError(''); setResults({}); setStopped(false)
    if (selected.length > 20) { setError('Tối đa 20 ảnh trong mỗi lần chọn.'); return }
    if (selected.reduce((sum, file) => sum + file.size, 0) > 40 * 1024 * 1024) { setError('Tổng dung lượng ảnh không được vượt quá 40 MB.'); return }
    const inspected = await Promise.all(selected.map(async (file): Promise<QueuedImage> => {
      try {
        const image = await inspectImage(file)
        return { id: crypto.randomUUID(), file, width: image.width, height: image.height }
      } catch (cause) {
        return { id: crypto.randomUUID(), file, error: cause instanceof Error ? cause.message : 'Không thể đọc ảnh.' }
      }
    }))
    setQueue(inspected)
  }

  async function analyzeAll() {
    if (busy || !validCount) return
    setBusy(true); setError(''); setResults({}); setStopped(false)
    const valid = queue.filter((item) => !item.error)
    for (const item of valid) {
      setWorkingId(item.id)
      try {
        const record = await api.predict(item.file, item.id)
        setResults((current) => ({ ...current, [item.id]: { record } }))
      } catch (cause) {
        setResults((current) => ({ ...current, [item.id]: { error: cause instanceof Error ? cause.message : 'Không thể xử lý ảnh.' } }))
        if (cause instanceof ApiError && (cause.status === 503 || cause.status === 401)) { setStopped(true); break }
      }
    }
    await onCreated().catch(() => undefined)
    setWorkingId(''); setBusy(false)
  }

  function fileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void chooseFiles(event.target.files)
    event.target.value = ''
  }

  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); setDragging(false)
    void chooseFiles(event.dataTransfer.files)
  }

  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">KHÔNG GIAN / DỰ ĐOÁN HÀNG LOẠT</div><h1>Phân tích nhiều ảnh</h1><p>Chuẩn bị một nhóm ảnh OCT và theo dõi tiến trình xử lý trong cùng một nơi.</p></div></div>
    <div className="batch-grid"><section className="surface batch-upload-card"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 01 · CHỌN ẢNH</span><h2>Danh sách đầu vào</h2></div><span className="step-indicator">01 / 02</span></div><p className="surface-subtitle">Tối đa 20 ảnh JPG/PNG, tổng dung lượng 40 MB.</p><input ref={fileInput} type="file" multiple accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="visually-hidden" onChange={fileChange} aria-label="Chọn nhiều ảnh OCT" disabled={busy} /><div className={`batch-dropzone ${dragging ? 'dropzone-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={drop}><div className="batch-drop-icon"><CloudUpload size={28} /></div><strong>Kéo thả nhiều ảnh OCT vào đây</strong><span>hoặc chọn từ thiết bị của bạn</span><button className="button button-secondary" disabled={busy} onClick={() => fileInput.current?.click()}><Files size={16} /> Chọn nhiều ảnh</button></div>{error && <div className="inline-error" role="alert"><AlertCircle size={18} />{error}</div>}{queue.length > 0 && <div className="batch-queue"><div className="batch-queue-heading"><strong>{queue.length} ảnh đã chọn</strong><button disabled={busy} onClick={() => { setQueue([]); setResults({}); setStopped(false) }}><Trash2 size={14} /> Bỏ tất cả</button></div><div className="batch-queue-list">{queue.map((item) => <div key={item.id}><span className={`batch-file-icon ${item.error || results[item.id]?.error ? 'batch-file-error' : ''}`}>{item.error || results[item.id]?.error ? <AlertCircle size={17} /> : <FileImage size={17} />}</span><div><strong title={item.file.name}>{item.file.name}</strong><span>{item.error ?? results[item.id]?.error ?? `${item.width} × ${item.height} px · ${Math.round(item.file.size / 1024)} KB`}</span>{results[item.id]?.record && <Link to={`/history/${results[item.id]?.record?.id}`}>Xem kết quả {results[item.id]?.record?.predictedClass} →</Link>}</div>{workingId === item.id ? <span>Đang xử lý</span> : item.error || results[item.id]?.error ? <b className="batch-invalid">LỖI</b> : <Check size={17} className="batch-valid" />}</div>)}</div></div>}<button className="button button-primary button-full batch-run" disabled={!validCount || busy} onClick={() => void analyzeAll()}>{busy ? 'Đang phân tích' : 'Bắt đầu phân tích'}{validCount ? ` (${validCount})` : ''} <ArrowRight size={17} /></button></section>
      <section className="surface batch-progress-card"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 02 · TIẾN TRÌNH</span><h2>Kết quả theo lô</h2></div><span className="step-indicator">02 / 02</span></div><div className="batch-progress-visual"><div className="batch-progress-icon"><Activity size={28} /></div><strong>{queue.length ? `${completedCount} / ${validCount}` : '—'}</strong><span>ảnh đã xử lý</span></div><div className="batch-progress-track"><span style={{ width: `${validCount ? completedCount / validCount * 100 : 0}%` }} /></div><div className="batch-progress-caption"><span>{busy ? 'Đang xử lý ảnh...' : stopped ? 'Đã dừng do dịch vụ chưa sẵn sàng' : completedCount ? 'Đã xử lý xong' : 'Chưa bắt đầu xử lý'}</span><strong>{validCount ? Math.round(completedCount / validCount * 100) : 0}%</strong></div><div className="batch-help"><Info size={17} /><span>Ảnh xử lý thành công được lưu trong Lịch sử. Điểm phân loại chỉ phục vụ nghiên cứu.</span></div></section></div>
  </div>
}
