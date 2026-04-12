import { useState, useRef } from 'react'
import { Mic, MicOff, Loader2, Plus, Sparkles, X, Edit3, Check } from 'lucide-react'
import { format } from 'date-fns'
import useAppStore from '../../store/useAppStore'
import { sendClaudeMessage } from '../../services/claudeService'

const todayStr = format(new Date(), 'yyyy-MM-dd')

export default function VoiceOrderInput({ onClose }) {
  const { addOrder } = useAppStore()
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [parsedOrders, setParsedOrders] = useState([])
  const [step, setStep] = useState('ready') // ready | recording | processing | parsed
  const [aiLoading, setAiLoading] = useState(false)
  const [editIdx, setEditIdx] = useState(null)
  const recognitionRef = useRef(null)

  // 음성 인식 시작
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome을 사용해 주세요.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = true
    recognition.interimResults = true

    let finalText = ''

    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalText += e.results[i][0].transcript + ' '
        } else {
          interim += e.results[i][0].transcript
        }
      }
      setTranscript(finalText + interim)
    }

    recognition.onerror = () => {
      setRecording(false)
      setStep('ready')
    }

    recognition.onend = () => {
      setRecording(false)
      if (finalText.trim()) {
        setTranscript(finalText.trim())
        setStep('processing')
        // 간단 파싱
        simpleParse(finalText.trim())
      }
    }

    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
    setStep('recording')
    setTranscript('')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setRecording(false)
  }

  // 간단 파싱
  const simpleParse = (text) => {
    setParsedOrders([{
      quantity: 1,
      recipient: '',
      address: '',
      message: '',
      rawText: text,
      selected: true,
    }])
    setStep('parsed')
  }

  // Claude AI 파싱
  const parseWithClaude = async () => {
    const apiKey = localStorage.getItem('claude_api_key')
    if (!apiKey) return alert('설정에서 Claude API 키를 먼저 입력해 주세요.')
    setAiLoading(true)
    try {
      const prompt = `아래는 꽃가게에서 음성으로 받은 주문 내용입니다.
이 내용에서 주문 항목을 파싱해 주세요.
수량, 배송지(주소), 받는분(이름), 문구(카드문구)를 추출합니다.
여러 건이면 각각 분리해 주세요.

음성 내용:
${transcript}

다음 JSON 배열 형식으로만 답변하세요 (설명 없이):
[{"quantity":숫자,"address":"배송지","recipient":"받는분","message":"카드문구"}]

없는 정보는 빈 문자열로 넣으세요.`

      const reply = await sendClaudeMessage(prompt, [], [], apiKey)
      const jsonMatch = reply.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0])
        setParsedOrders(items.map((item) => ({
          quantity: Number(item.quantity) || 1,
          recipient: item.recipient || '',
          address: item.address || '',
          message: item.message || '',
          rawText: transcript,
          selected: true,
        })))
      }
    } catch (e) {
      alert('AI 파싱 실패: ' + e.message)
    } finally {
      setAiLoading(false)
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
          `[음성입력]`,
        ].filter(Boolean).join(' / '),
      })
    })
    onClose(selected.length)
  }

  const selectedCount = parsedOrders.filter((o) => o.selected).length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-pink-500" />
            <h2 className="text-base font-bold text-gray-800">음성으로 주문 등록</h2>
          </div>
          <button onClick={() => onClose(0)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* 대기/녹음 */}
          {(step === 'ready' || step === 'recording') && (
            <div className="text-center space-y-6 py-4">
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center transition-all ${
                  recording
                    ? 'bg-red-500 animate-pulse shadow-xl shadow-red-200'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 shadow-lg hover:shadow-xl hover:scale-105'
                }`}
              >
                {recording
                  ? <MicOff className="w-10 h-10 text-white" />
                  : <Mic className="w-10 h-10 text-white" />
                }
              </button>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {recording ? '듣고 있습니다... 탭하여 중지' : '탭하여 음성 주문 시작'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  예: "김영희님, 서울시 강남구 역삼동 123, 꽃다발 2개, 생일 축하합니다"
                </p>
              </div>
              {transcript && (
                <div className="text-left bg-gray-50 rounded-xl p-4 mt-4">
                  <p className="text-xs text-gray-400 mb-1 font-medium">인식된 내용:</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{transcript}</p>
                </div>
              )}
            </div>
          )}

          {/* 처리 중 */}
          {step === 'processing' && (
            <div className="text-center py-8 space-y-4">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto" />
              <p className="text-sm text-gray-600">음성 분석 중...</p>
            </div>
          )}

          {/* 파싱 결과 */}
          {step === 'parsed' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1 font-medium">음성 원문</p>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none"
                  rows={2}
                />
              </div>

              <button onClick={parseWithClaude} disabled={aiLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-bold hover:opacity-90 transition disabled:opacity-50">
                {aiLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> AI 분석 중...</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Claude AI로 자동 분류</>
                }
              </button>

              <div className="space-y-3">
                {parsedOrders.map((o, idx) => (
                  <div key={idx} className={`rounded-xl border p-4 ${o.selected ? 'bg-white border-purple-200' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      <button onClick={() => updateParsed(idx, 'selected', !o.selected)}
                        className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${o.selected ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}>
                        {o.selected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400">수량</label>
                            <input value={o.quantity} onChange={(e) => updateParsed(idx, 'quantity', e.target.value)}
                              type="number" min="1" className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300" />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400">받는분</label>
                            <input value={o.recipient} onChange={(e) => updateParsed(idx, 'recipient', e.target.value)}
                              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300" placeholder="이름" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400">배송지</label>
                          <input value={o.address} onChange={(e) => updateParsed(idx, 'address', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300" placeholder="배송 주소" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400">문구</label>
                          <input value={o.message} onChange={(e) => updateParsed(idx, 'message', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-300" placeholder="카드 문구" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 */}
        {step === 'parsed' && parsedOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
            <button onClick={() => { setStep('ready'); setTranscript(''); setParsedOrders([]) }}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition">
              다시 녹음
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
