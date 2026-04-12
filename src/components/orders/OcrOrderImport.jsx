import { useState, useRef } from 'react'
import { X, Camera, Image, FileText, Loader2, ScanText, Plus, Check, Trash2, Edit3, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { format } from 'date-fns'
import useAppStore from '../../store/useAppStore'
import { sendClaudeMessage } from '../../services/claudeService'

const todayStr = format(new Date(), 'yyyy-MM-dd')

// OCR 텍스트에서 발주 항목을 파싱
function parseOrdersFromText(text) {
  const lines = text.split('\n').filter((l) => l.trim())
  const orders = []

  // 꽃 이름 키워드
  const flowerKeywords = [
    '장미', '백합', '카네이션', '튤립', '거베라', '수국', '국화', '안개꽃', '해바라기',
    '프리지아', '라넌큘러스', '리시안셔스', '작약', '스타티스', '유칼립투스', '미모사',
    '라벤더', '데이지', '아이리스', '칼라', '오키드', '난', '동백', '매화', '벚꽃',
    '목련', '수선화', '히야신스', '스톡', '소국', '대국', '꽃다발', '화분', '바구니',
    '리스', '화환', '센터피스', '부케', '코사지',
  ]

  // 단위 키워드
  const unitPattern = /(송이|개|단|묶음|박스|kg|세트|다발|속)/
  // 숫자 패턴
  const numPattern = /(\d+)\s*(송이|개|단|묶음|박스|kg|세트|다발|속)?/

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.length < 2) continue

    // 꽃 이름이 포함된 줄 찾기
    const matchedFlower = flowerKeywords.find((k) => trimmed.includes(k))

    if (matchedFlower) {
      const numMatch = trimmed.match(numPattern)
      const unitMatch = trimmed.match(unitPattern)

      orders.push({
        itemName: matchedFlower + (trimmed.includes('(') ? trimmed.match(/\([^)]*\)/)?.[0] || '' : ''),
        quantity: numMatch ? parseInt(numMatch[1]) : 1,
        unit: unitMatch ? unitMatch[1] : '송이',
        rawText: trimmed,
        selected: true,
      })
    } else if (numPattern.test(trimmed) && trimmed.length > 3) {
      // 숫자가 포함된 의미 있는 줄
      const numMatch = trimmed.match(numPattern)
      const unitMatch = trimmed.match(unitPattern)
      const namePart = trimmed.replace(numPattern, '').replace(/[·\-:,\s]+$/, '').trim()
      if (namePart.length >= 2) {
        orders.push({
          itemName: namePart,
          quantity: numMatch ? parseInt(numMatch[1]) : 1,
          unit: unitMatch ? unitMatch[1] : '개',
          rawText: trimmed,
          selected: true,
        })
      }
    }
  }

  // 파싱 결과가 없으면 줄 단위로 모두 보여주기
  if (orders.length === 0 && lines.length > 0) {
    for (const line of lines) {
      if (line.trim().length >= 2) {
        orders.push({
          itemName: line.trim(),
          quantity: 1,
          unit: '개',
          rawText: line.trim(),
          selected: false,
        })
      }
    }
  }

  return orders
}

export default function OcrOrderImport({ onClose }) {
  const { addOrder } = useAppStore()
  const fileRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  const [step, setStep] = useState('upload') // upload | scanning | preview | parsed
  const [image, setImage] = useState(null)
  const [ocrText, setOcrText] = useState('')
  const [progress, setProgress] = useState(0)
  const [parsedOrders, setParsedOrders] = useState([])
  const [showRawText, setShowRawText] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [editIdx, setEditIdx] = useState(null)

  // 파일 선택
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { setImage(ev.target.result); setStep('preview') }
    reader.readAsDataURL(file)
  }

  // 카메라
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

  // OCR 실행
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
      const parsed = parseOrdersFromText(data.text)
      setParsedOrders(parsed)
      setStep('parsed')
    } catch (e) {
      alert('텍스트 변환 실패: ' + e.message)
      setStep('preview')
    }
  }

  // 파싱된 항목 수정
  const updateParsed = (idx, key, val) => {
    setParsedOrders((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [key]: val } : o))
    )
  }

  // 선택된 항목 발주 등록
  const registerOrders = () => {
    const selected = parsedOrders.filter((o) => o.selected)
    if (selected.length === 0) return alert('등록할 항목을 선택해 주세요.')
    selected.forEach((o) => {
      addOrder({
        itemName: o.itemName,
        quantity: Number(o.quantity) || 1,
        unit: o.unit,
        supplier: o.supplier || '',
        orderDate: todayStr,
        deliveryDate: todayStr,
        status: '대기중',
        type: '주문',
        memo: `[OCR] ${o.rawText}`,
      })
    })
    onClose(selected.length)
  }

  const [aiLoading, setAiLoading] = useState(false)

  // Claude AI로 OCR 텍스트 검증 및 재파싱
  const verifyWithClaude = async () => {
    const apiKey = localStorage.getItem('claude_api_key')
    if (!apiKey) return alert('설정에서 Claude API 키를 먼저 입력해 주세요.')
    setAiLoading(true)
    try {
      const prompt = `아래는 꽃가게 발주서/주문서 이미지에서 OCR로 추출한 텍스트입니다.
이 텍스트에서 발주 항목(꽃/식물/자재 이름, 수량, 단위)을 정확히 파싱해 주세요.

OCR 원문:
${ocrText}

다음 JSON 배열 형식으로만 답변하세요 (설명 없이 JSON만):
[{"itemName":"품목명","quantity":숫자,"unit":"단위","supplier":"공급처(있으면)"}]

단위는 송이/개/단/박스/묶음/kg/세트/다발 중 하나입니다.
OCR 오타가 있으면 올바르게 교정해 주세요.`

      const reply = await sendClaudeMessage(prompt, [], [], apiKey)
      // JSON 추출
      const jsonMatch = reply.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0])
        setParsedOrders(items.map((item) => ({
          ...item,
          quantity: Number(item.quantity) || 1,
          rawText: item.itemName,
          selected: true,
        })))
      } else {
        alert('AI 응답에서 항목을 파싱하지 못했습니다. 수동으로 수정해 주세요.')
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
            <h2 className="text-base font-bold text-gray-800">캡처 이미지 → 발주 등록</h2>
          </div>
          <button onClick={() => onClose(0)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: 이미지 업로드 */}
          {step === 'upload' && !cameraOn && (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center">
              <ScanText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-600 font-medium mb-1">발주서, 주문서, 영수증 사진을 업로드하세요</p>
              <p className="text-xs text-gray-400 mb-6">이미지에서 텍스트를 추출하여 자동으로 발주 항목을 등록합니다</p>
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
                <p className="text-xs font-medium text-purple-700 mb-2">지원 이미지 예시:</p>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• 발주서 / 주문서 캡처 화면</li>
                  <li>• 거래처 카톡 메시지 스크린샷</li>
                  <li>• 영수증, 메모, 수기 주문서 사진</li>
                  <li>• 엑셀 발주표 스크린샷</li>
                </ul>
              </div>
            </div>
          )}

          {/* 카메라 */}
          {cameraOn && (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                <button onClick={captureCamera}
                  className="px-8 py-2.5 bg-white text-gray-800 rounded-full text-sm font-bold shadow-lg">
                  촬영
                </button>
                <button onClick={() => { videoRef.current?.srcObject?.getTracks().forEach(t => t.stop()); setCameraOn(false) }}
                  className="px-5 py-2.5 bg-gray-800/70 text-white rounded-full text-sm">
                  취소
                </button>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />

          {/* Step 2: 이미지 미리보기 */}
          {step === 'preview' && image && (
            <div className="space-y-4">
              <img src={image} alt="" className="w-full rounded-xl border border-gray-200 max-h-72 object-contain bg-gray-50" />
              <div className="flex gap-2">
                <button onClick={runOCR}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition">
                  <ScanText className="w-4 h-4" />
                  텍스트 추출 시작
                </button>
                <label className="cursor-pointer flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-500 rounded-xl text-sm hover:bg-gray-50 transition">
                  <Image className="w-4 h-4" />
                  변경
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* Step 3: 스캐닝 중 */}
          {step === 'scanning' && (
            <div className="text-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
              <p className="text-sm font-medium text-gray-700">텍스트 추출 중... {progress}%</p>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden max-w-xs mx-auto">
                <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-400">한국어 + 영어 인식 중</p>
            </div>
          )}

          {/* Step 4: 파싱 결과 */}
          {step === 'parsed' && (
            <div className="space-y-4">
              {/* 원본 이미지 & 텍스트 토글 */}
              <div className="flex gap-2">
                <button onClick={() => setStep('preview')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                  <Image className="w-3 h-3" /> 이미지 보기
                </button>
                <button onClick={() => setShowRawText(!showRawText)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200 transition">
                  <FileText className="w-3 h-3" />
                  {showRawText ? '원문 숨기기' : '추출 원문 보기'}
                  {showRawText ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {showRawText && (
                <textarea
                  value={ocrText}
                  onChange={(e) => {
                    setOcrText(e.target.value)
                    setParsedOrders(parseOrdersFromText(e.target.value))
                  }}
                  className="w-full border border-gray-200 rounded-xl p-3 text-xs text-gray-600 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              )}

              {/* AI 검증 + 파싱된 발주 항목 */}
              <div className="bg-purple-50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-700">
                    {parsedOrders.length}개 항목 인식됨 · {selectedCount}개 선택됨
                  </span>
                  <button
                    onClick={() => setParsedOrders(prev => prev.map(o => ({ ...o, selected: !prev.every(p => p.selected) })))}
                    className="text-xs text-purple-600 hover:underline">
                    {parsedOrders.every(o => o.selected) ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
                <button
                  onClick={verifyWithClaude}
                  disabled={aiLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg text-xs font-bold hover:opacity-90 transition disabled:opacity-50"
                >
                  {aiLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Claude AI 검증 중...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Claude AI로 검증 &amp; 오타 교정</>
                  )}
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {parsedOrders.map((o, idx) => (
                  <div key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                      o.selected ? 'bg-white border-purple-200' : 'bg-gray-50 border-gray-100 opacity-50'
                    }`}>
                    {/* 체크박스 */}
                    <button onClick={() => updateParsed(idx, 'selected', !o.selected)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition ${
                        o.selected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'
                      }`}>
                      {o.selected && <Check className="w-3 h-3 text-white" />}
                    </button>

                    {/* 편집 모드 */}
                    {editIdx === idx ? (
                      <div className="flex-1 grid grid-cols-12 gap-2">
                        <input value={o.itemName} onChange={(e) => updateParsed(idx, 'itemName', e.target.value)}
                          className="col-span-5 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300"
                          placeholder="품목명" />
                        <input value={o.quantity} onChange={(e) => updateParsed(idx, 'quantity', e.target.value)}
                          type="number" min="1"
                          className="col-span-2 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300"
                          placeholder="수량" />
                        <select value={o.unit} onChange={(e) => updateParsed(idx, 'unit', e.target.value)}
                          className="col-span-2 text-xs border border-gray-200 rounded-lg px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300">
                          {['송이', '개', '단', '박스', '묶음', 'kg', '세트', '다발'].map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <input value={o.supplier || ''} onChange={(e) => updateParsed(idx, 'supplier', e.target.value)}
                          className="col-span-3 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-300"
                          placeholder="공급처" />
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800">{o.itemName}</span>
                        <span className="text-xs text-gray-400 ml-2">{o.quantity}{o.unit}</span>
                        {o.supplier && <span className="text-xs text-gray-400 ml-1">· {o.supplier}</span>}
                        <p className="text-[10px] text-gray-300 truncate">{o.rawText}</p>
                      </div>
                    )}

                    {/* 수정/삭제 버튼 */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setEditIdx(editIdx === idx ? null : idx)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition">
                        <Edit3 className={`w-3.5 h-3.5 ${editIdx === idx ? 'text-purple-500' : 'text-gray-400'}`} />
                      </button>
                      <button onClick={() => setParsedOrders(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                      </button>
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

        {/* 하단 버튼 */}
        {step === 'parsed' && parsedOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => { setStep('upload'); setImage(null); setOcrText(''); setParsedOrders([]) }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
              다시 스캔
            </button>
            <button onClick={registerOrders}
              disabled={selectedCount === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-bold hover:bg-pink-600 transition disabled:opacity-40 shadow-sm">
              <Plus className="w-4 h-4" />
              {selectedCount}건 발주 등록
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
