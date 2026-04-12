import { useState, useRef } from 'react'
import { X, Camera, Image, FileText, Loader2, ScanText, Plus, Check, Trash2, Edit3, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import useAppStore from '../../store/useAppStore'
import { sendClaudeMessage } from '../../services/claudeService'

const todayStr = format(new Date(), 'yyyy-MM-dd')

// OCR 텍스트에서 주문 항목 파싱 (수량, 배송지, 받는분, 문구)
function parseOrdersFromText(text) {
  const lines = text.split('\n').filter((l) => l.trim())
  const orders = []

  // 한 블록씩 모아서 파싱
  let current = { quantity: 1, address: '', recipient: '', message: '', rawText: '', selected: true }
  const addressKeywords = ['배송', '주소', '도로명', '지번', '시', '구', '동', '로', '길', '아파트', '빌딩', '층', '호']
  const recipientKeywords = ['받는', '수신', '성함', '이름', '님', '귀하', '앞']
  const messageKeywords = ['문구', '카드', '메시지', '축하', '사랑', '감사', '생일', '기념', '조의', '근조', '축', '♡', '❤']
  const quantityKeywords = ['수량', '개', '송이', '단', '박스', '묶음', '다발', '세트']

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 2) continue

    // 수량 감지
    const qtyMatch = trimmed.match(/(\d+)\s*(개|송이|단|박스|묶음|다발|세트|건)?/)
    const hasAddress = addressKeywords.some((k) => trimmed.includes(k))
    const hasRecipient = recipientKeywords.some((k) => trimmed.includes(k))
    const hasMessage = messageKeywords.some((k) => trimmed.includes(k))
    const hasQuantity = quantityKeywords.some((k) => trimmed.includes(k))

    if (hasRecipient) {
      const name = trimmed.replace(/받는\s*(분|사람)?\s*[:\-]?\s*/g, '').replace(/수신\s*(인|자)?\s*[:\-]?\s*/g, '').replace(/성함\s*[:\-]?\s*/g, '').replace(/이름\s*[:\-]?\s*/g, '').trim()
      current.recipient = name || trimmed
      current.rawText += trimmed + ' | '
    } else if (hasAddress) {
      const addr = trimmed.replace(/배송\s*(지|주소)?\s*[:\-]?\s*/g, '').replace(/주소\s*[:\-]?\s*/g, '').trim()
      current.address = addr || trimmed
      current.rawText += trimmed + ' | '
    } else if (hasMessage) {
      const msg = trimmed.replace(/문구\s*[:\-]?\s*/g, '').replace(/카드\s*(문구)?\s*[:\-]?\s*/g, '').replace(/메시지\s*[:\-]?\s*/g, '').trim()
      current.message = msg || trimmed
      current.rawText += trimmed + ' | '
    } else if (hasQuantity || qtyMatch) {
      if (qtyMatch) current.quantity = parseInt(qtyMatch[1]) || 1
      current.rawText += trimmed + ' | '
    } else {
      // 일반 텍스트 → 컨텍스트에 따라 배분
      if (!current.recipient && trimmed.length <= 10 && /[가-힣]{2,4}/.test(trimmed)) {
        current.recipient = trimmed
      } else if (!current.address && trimmed.length > 8) {
        current.address = trimmed
      } else if (!current.message) {
        current.message = trimmed
      }
      current.rawText += trimmed + ' | '
    }
  }

  // 현재 블록 저장
  if (current.recipient || current.address || current.message) {
    orders.push({ ...current, rawText: current.rawText.replace(/\s*\|\s*$/, '') })
  }

  // 파싱 결과가 없으면 전체 텍스트를 하나의 항목으로
  if (orders.length === 0 && lines.length > 0) {
    orders.push({
      quantity: 1,
      address: '',
      recipient: '',
      message: text.trim(),
      rawText: text.trim(),
      selected: true,
    })
  }

  return orders
}

export default function OcrOrderImport({ onClose }) {
  const { addOrder } = useAppStore()
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [step, setStep] = useState('upload')
  const [image, setImage] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [progress, setProgress] = useState(0)
  const [parsedOrders, setParsedOrders] = useState([])
  const [showRawText, setShowRawText] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setImage(ev.target.result); setStep('preview') }
    reader.readAsDataURL(file)
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch {
      alert('카메라 접근 권한이 필요합니다.')
    }
  }

  const captureCamera = () => {
    const v = videoRef.current, c = canvasRef.current
    c.width = v.videoWidth; c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    setImage(c.toDataURL('image/png'))
    v.srcObject?.getTracks().forEach((t) => t.stop())
    setCameraOn(false)
    setStep('preview')
  }

  const runOCR = async () => {
    if (!image) return
    setStep('scanning')
    setProgress(0)
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('kor+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const { data } = await worker.recognize(image)
      await worker.terminate()
      setOcrText(data.text)
      setParsedOrders(parseOrdersFromText(data.text))
      setStep('parsed')
    } catch (e) {
      alert('텍스트 변환 실패: ' + e.message)
      setStep('preview')
    }
  }

  const updateParsed = (idx, key, val) => {
    setParsedOrders((prev) => prev.map((o, i) => (i === idx ? { ...o, [key]: val } : o)))
  }

  const registerOrders = () => {
    const selected = parsedOrders.filter((o) => o.selected)
    if (selected.length === 0) return alert('등록할 항목을 선택해 주세요.')
    selected.forEach((o) => {
      addOrder({
        itemName: `${o.recipient || '미정'}님 주문`,
        quantity: Number(o.quantity) || 1,
        unit: '건',
        supplier: '',
        orderDate: todayStr,
        deliveryDate: todayStr,
        status: '대기중',
        type: '주문',
        memo: [
          o.recipient && `받는분: ${o.recipient}`,
          o.address && `배송지: ${o.address}`,
          o.message && `문구: ${o.message}`,
          `수량: ${o.quantity}`,
        ].filter(Boolean).join(' / '),
      })
    })
    onClose(selected.length)
  }

  // Claude AI 검증
  const verifyWithClaude = async () => {
    const apiKey = localStorage.getItem('claude_api_key')
    if (!apiKey) return alert('설정에서 Claude API 키를 먼저 입력해 주세요.')
    setAiLoading(true)
    try {
      const prompt = `아래는 꽃가게 주문서/발주서 이미지에서 OCR로 추출한 텍스트입니다.
이 텍스트에서 주문 항목을 파싱해 주세요.
각 주문마다 수량, 배송지(주소), 받는분(이름), 문구(카드문구)를 추출합니다.

OCR 원문:
${ocrText}

다음 JSON 배열 형식으로만 답변하세요 (설명 없이 JSON만):
[{"quantity":숫자,"address":"배송지주소","recipient":"받는분이름","message":"카드문구"}]

OCR 오타가 있으면 교정해 주세요. 없는 정보는 빈 문자열로 넣으세요.`

      const reply = await sendClaudeMessage(prompt, [], [], apiKey)
      const jsonMatch = reply.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0])
        setParsedOrders(items.map((item) => ({
          quantity: Number(item.quantity) || 1,
          address: item.address || '',
          recipient: item.recipient || '',
          message: item.message || '',
          rawText: `${item.recipient} / ${item.address}`,
          selected: true,
        })))
      } else {
        alert('AI 응답 파싱 실패. 수동으로 수정해 주세요.')
      }
    } catch (e) {
      alert('AI 검증 실패: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const selectedCount = parsedOrders.filter((o) => o.selected).length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ScanText className="w-5 h-5 text-purple-500" />
            <h2 className="text-base font-bold text-gray-800">캡처 이미지 → 주문 등록</h2>
          </div>
          <button onClick={() => onClose(0)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 업로드 */}
          {step === 'upload' && !cameraOn && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <ScanText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-600 font-medium mb-1">주문서, 카톡 스크린샷을 업로드하세요</p>
              <p className="text-xs text-gray-400 mb-6">수량 · 배송지 · 받는분 · 문구를 자동 추출합니다</p>
              <div className="flex gap-3 justify-center">
                <label className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white rounded-xl text-sm font-medium hover:bg-purple-600 transition shadow-sm">
                  <Image className="w-4 h-4" />
                  파일 선택
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
                <button onClick={startCamera}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition">
                  <Camera className="w-4 h-4" />
                  카메라 촬영
                </button>
              </div>
              <div className="mt-6 text-left bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-medium text-purple-700 mb-2">자동 인식 항목:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-purple-600">
                  <span>📦 수량</span>
                  <span>📍 배송지 (주소)</span>
                  <span>👤 받는분 (이름)</span>
                  <span>💌 문구 (카드 메시지)</span>
                </div>
              </div>
            </div>
          )}

          {/* 카메라 */}
          {cameraOn && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button onClick={captureCamera} className="px-8 py-2.5 bg-white text-gray-800 rounded-full text-sm font-bold shadow-lg">촬영</button>
                <button onClick={() => { videoRef.current?.srcObject?.getTracks().forEach(t => t.stop()); setCameraOn(false) }}
                  className="px-5 py-2.5 bg-gray-800/70 text-white rounded-full text-sm">취소</button>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* 미리보기 */}
          {step === 'preview' && image && (
            <div className="space-y-4">
              <img src={image} alt="" className="w-full rounded-xl border border-gray-200 max-h-72 object-contain bg-gray-50" />
              <div className="flex gap-2">
                <button onClick={runOCR}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition">
                  <ScanText className="w-4 h-4" />
                  텍스트 추출
                </button>
                <label className="cursor-pointer flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition">
                  <Image className="w-4 h-4" /> 변경
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* 스캐닝 */}
          {step === 'scanning' && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-gray-700">텍스트 추출 중... {progress}%</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs mx-auto">
                <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* 파싱 결과 */}
          {step === 'parsed' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => setStep('preview')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                  <Image className="w-3 h-3" /> 이미지
                </button>
                <button onClick={() => setShowRawText(!showRawText)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                  <FileText className="w-3 h-3" />
                  {showRawText ? '원문 숨기기' : '원문 보기'}
                  {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showRawText && (
                <textarea value={ocrText}
                  onChange={(e) => { setOcrText(e.target.value); setParsedOrders(parseOrdersFromText(e.target.value)) }}
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs text-gray-600 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              )}

              {/* AI 검증 */}
              <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-700">{parsedOrders.length}건 인식 · {selectedCount}건 선택</span>
                  <button onClick={() => setParsedOrders(p => p.map(o => ({ ...o, selected: !p.every(x => x.selected) })))}
                    className="text-xs text-purple-600 hover:underline">
                    {parsedOrders.every(o => o.selected) ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <button onClick={verifyWithClaude} disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50">
                  {aiLoading
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Claude AI 검증 중...</>
                    : <><Sparkles className="w-3.5 h-3.5" /> Claude AI로 검증 &amp; 오타 교정</>
                  }
                </button>
              </div>

              {/* 파싱된 주문 카드 */}
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {parsedOrders.map((o, idx) => (
                  <div key={idx} className={`rounded-xl border p-4 transition ${o.selected ? 'bg-white border-purple-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => updateParsed(idx, 'selected', !o.selected)}
                        className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${o.selected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                        {o.selected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {editIdx === idx ? (
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-400 font-medium">수량</label>
                              <input value={o.quantity} onChange={(e) => updateParsed(idx, 'quantity', e.target.value)}
                                type="number" min="1"
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 font-medium">받는분</label>
                              <input value={o.recipient} onChange={(e) => updateParsed(idx, 'recipient', e.target.value)}
                                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300"
                                placeholder="이름" />
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-medium">배송지</label>
                            <input value={o.address} onChange={(e) => updateParsed(idx, 'address', e.target.value)}
                              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300"
                              placeholder="배송 주소" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-medium">문구</label>
                            <input value={o.message} onChange={(e) => updateParsed(idx, 'message', e.target.value)}
                              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300"
                              placeholder="카드 문구" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">{o.quantity}건</span>
                            {o.recipient && <span className="text-sm font-semibold text-gray-800">👤 {o.recipient}</span>}
                          </div>
                          {o.address && <p className="text-xs text-gray-500">📍 {o.address}</p>}
                          {o.message && <p className="text-xs text-purple-500">💌 {o.message}</p>}
                          {!o.recipient && !o.address && !o.message && (
                            <p className="text-xs text-gray-400 truncate">{o.rawText}</p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => setEditIdx(editIdx === idx ? null : idx)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                          <Edit3 className={`w-3.5 h-3.5 ${editIdx === idx ? 'text-purple-500' : 'text-gray-400'}`} />
                        </button>
                        <button onClick={() => setParsedOrders(p => p.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 rounded-lg transition">
                          <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {parsedOrders.length === 0 && (
                <div className="text-center py-6 text-gray-400">
                  <p className="text-sm">인식된 항목이 없습니다.</p>
                  <p className="text-xs mt-1">원문을 수정하거나 다른 이미지를 시도해 주세요.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 */}
        {step === 'parsed' && parsedOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => { setStep('upload'); setImage(null); setOcrText(''); setParsedOrders([]) }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
              다시 스캔
            </button>
            <button onClick={registerOrders} disabled={selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-bold hover:bg-pink-600 transition disabled:opacity-40 shadow-sm">
              <Plus className="w-4 h-4" />
              {selectedCount}건 주문 등록
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
