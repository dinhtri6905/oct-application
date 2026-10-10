import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Activity, AlertCircle, ArrowRight, CloudUpload, Eye, FileImage, Info, Microscope, X } from 'lucide-react'
import { api } from './api'
import { CLASS_CODES, CLASS_DETAILS, inspectImage } from './predictionData'
import type { PredictionRecord } from './predictionData'

type SelectedImage = { file: File; dataUrl: string; width: number; height: number }

export function PredictionPage({ onCreated }: { onCreated: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const requestVersion = useRef(0)
  const uploadKey = useRef(crypto.randomUUID())
  const [selected, setSelected] = useState<SelectedImage | null>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<PredictionRecord | null>(null)
  const [busy, setBusy] = useState(false)

  async function chooseFile(file?: File) {
    const version = ++requestVersion.current
    uploadKey.current = crypto.randomUUID()
    setSelected(null); setError(''); setResult(null)
    if (!file) return
    try {
      const image = await inspectImage(file)
      if (version === requestVersion.current) setSelected({ file, ...image })
    } catch (cause) {
      if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : 'Không thể đọc ảnh này.')
    }
  }

  async function analyze() {
    if (!selected || busy) return
    const version = requestVersion.current
    setBusy(true); setError(''); setResult(null)
    try {
      const prediction = await api.predict(selected.file, uploadKey.current)
      await onCreated().catch(() => undefined)
      if (version === requestVersion.current) setResult(prediction)
    } catch (cause) {
      if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : 'Không thể phân tích ảnh lúc này.')
    } finally { setBusy(false) }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    void chooseFile(event.target.files?.[0])
    event.target.value = ''
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); setDragging(false)
    void chooseFile(event.dataTransfer.files?.[0])
  }

  return <div className="page-content">
    <div className="page-heading"><div><div className="eyebrow">KHÔNG GIAN / DỰ ĐOÁN</div><h1>Phân tích ảnh OCT</h1><p>Tải ảnh lên, kiểm tra đầu vào và theo dõi kết quả phân loại.</p></div></div>
    <div className="prediction-intro"><div className="intro-number">01</div><div><strong>Một quy trình rõ ràng</strong><span>Chọn ảnh → kiểm tra → phân tích → xem kết quả.</span></div><div className="intro-end"><span>JPG / PNG</span><span>Tối đa 10 MB</span></div></div>
    <div className="prediction-grid">
      <section className="surface upload-surface"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 01 · ĐẦU VÀO</span><h2>Ảnh OCT của bạn</h2></div><span className="step-indicator">01 / 02</span></div><p className="surface-subtitle">Chọn ảnh OCT đã được phép sử dụng và khử định danh trước khi tải lên.</p>
        <input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="visually-hidden" onChange={onFileChange} aria-label="Chọn ảnh OCT" />
        {selected ? <div className="preview-wrap"><div className="preview-image"><img src={selected.dataUrl} alt="Ảnh OCT đã chọn để xem trước" /><span className="preview-label"><Eye size={13} /> XEM TRƯỚC</span></div><div className="preview-info"><span className="preview-file-icon"><FileImage size={19} /></span><div><strong title={selected.file.name}>{selected.file.name}</strong><span>{selected.width} × {selected.height} px · {(selected.file.size / 1024 / 1024).toFixed(2)} MB</span></div><button className="icon-button" aria-label="Bỏ ảnh đã chọn" onClick={() => void chooseFile()}><X size={18} /></button></div><button className="button button-secondary button-full" onClick={() => fileInput.current?.click()}><CloudUpload size={17} /> Thay ảnh khác</button></div> : <div className={`dropzone ${dragging ? 'dropzone-active' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><div className="dropzone-art"><div className="dropzone-ring"><CloudUpload size={30} strokeWidth={1.6} /></div><span className="dropzone-spark dropzone-spark-one" /><span className="dropzone-spark dropzone-spark-two" /></div><h3>Kéo thả ảnh OCT vào đây</h3><p>hoặc chọn ảnh từ thiết bị của bạn</p><button className="button button-secondary" onClick={() => fileInput.current?.click()}><CloudUpload size={17} /> Chọn ảnh</button><span className="dropzone-hint">Hỗ trợ JPG, JPEG, PNG · tối đa 10 MB</span></div>}
        {error && <div className="inline-error" role="alert"><AlertCircle size={18} />{error}</div>}
        <div className="upload-actions"><button className="button button-primary button-full" disabled={!selected || busy} onClick={() => void analyze()}>{busy ? 'Đang phân tích...' : 'Bắt đầu phân tích'} <ArrowRight size={17} /></button><p><Info size={14} /> Ảnh được gửi tới máy chủ khi bạn bắt đầu phân tích.</p></div>
      </section>
      <section className="surface result-surface"><div className="surface-heading"><div><span className="section-kicker">BƯỚC 02 · KẾT QUẢ</span><h2>Kết quả phân loại</h2></div><span className="step-indicator">02 / 02</span></div>{result ? <div className="live-result" role="status"><span className="section-kicker">LỚP ĐƯỢC DỰ ĐOÁN</span><div className="live-result-class"><span className={`class-badge class-${CLASS_DETAILS[result.predictedClass].tone}`}><span className="badge-dot" />{result.predictedClass}</span><strong>{CLASS_DETAILS[result.predictedClass].name}</strong></div><p>Điểm phân loại cao nhất: <b>{(result.classScores[result.predictedClass] * 100).toFixed(1)}%</b></p><div className="score-list">{CLASS_CODES.map((code) => <div className="score-row" key={code}><div className="score-row-top"><span className="score-label"><span className={`score-dot dot-${CLASS_DETAILS[code].tone}`} />{code}</span><strong>{(result.classScores[code] * 100).toFixed(1)}%</strong></div><div className="score-track"><div className={`score-fill fill-${CLASS_DETAILS[code].tone}`} style={{ width: `${result.classScores[code] * 100}%` }} /></div></div>)}</div><Link className="button button-secondary button-full" to={`/history/${result.id}`}>Xem chi tiết trong lịch sử <ArrowRight size={16} /></Link></div> : <div className="result-placeholder"><div className="result-orbit"><Activity size={34} strokeWidth={1.5} /></div><h3>{busy ? 'Đang phân tích ảnh...' : selected ? 'Ảnh đã sẵn sàng' : 'Kết quả sẽ xuất hiện ở đây'}</h3><p>{busy ? 'Mô hình đang xử lý ảnh OCT. Vui lòng chờ.' : selected ? 'Nhấn Bắt đầu phân tích để xem điểm của bốn lớp.' : 'Chọn một ảnh OCT để bắt đầu.'}</p><div className="placeholder-steps"><span><FileImage size={14} /> Ảnh đầu vào</span><span><ArrowRight size={14} /> Kết quả</span></div></div>}{result && <div className="prediction-status"><Microscope size={18} /><span>Điểm phân loại chỉ phục vụ nghiên cứu, không phải xác suất chẩn đoán.</span></div>}</section>
    </div>
    <div className="research-notice"><Info size={20} /><div><strong>Chỉ phục vụ nghiên cứu và giáo dục</strong><span>Kết quả cần được chuyên gia đánh giá; không dùng để chẩn đoán hoặc quyết định điều trị.</span></div></div>
  </div>
}
