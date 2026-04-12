import { useState } from 'react'
import { MessageCircle, Sparkles, Send, X } from 'lucide-react'
import useAppStore from '../../store/useAppStore'

// 카카오톡 아이콘 SVG
function KakaoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.68 6.67-.15.55-.96 3.54-.99 3.76 0 0-.02.16.08.22.1.06.23.01.23.01.3-.04 3.54-2.32 4.1-2.72.6.09 1.23.13 1.9.13 5.52 0 10-3.58 10-7.94C22 6.58 17.52 3 12 3z"/>
    </svg>
  )
}

export default function FloatingButtons() {
  const { toggleChat, orders } = useAppStore()
  const [showKakao, setShowKakao] = useState(false)
  const [sending, setSending] = useState(false)

  const sendKakaoAlert = async () => {
    const webhook = localStorage.getItem('kakao_webhook')
    if (!webhook) {
      alert('설정 → 카카오톡 알림에서 웹훅 URL을 먼저 입력해 주세요.')
      return
    }
    setSending(true)
    const todayStr = new Date().toISOString().slice(0, 10)
    const missing = orders.filter(o => o.deliveryDate < todayStr && o.status !== '출고완료').length
    const todayDel = orders.filter(o => o.deliveryDate === todayStr && o.status !== '출고완료').length
    const text = `🌸 꽃가게 발주 현황\n📅 ${todayStr}\n\n📦 오늘 출고: ${todayDel}건\n⚠️ 누락 위험: ${missing}건\n📋 전체 발주: ${orders.length}건`
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      alert('카카오 알림 전송 완료!')
    } catch {
      alert('전송 실패. 웹훅 URL을 확인해 주세요.')
    } finally {
      setSending(false)
      setShowKakao(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* 카카오 빠른 전송 팝업 */}
      {showKakao && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 w-64 mb-1">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-gray-800">카카오 알림 전송</span>
            <button onClick={() => setShowKakao(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">현재 발주 현황을 카카오로 전송합니다.</p>
          <button
            onClick={sendKakaoAlert}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-400 text-white rounded-lg text-sm font-bold hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {sending ? '전송 중...' : <><Send className="w-3.5 h-3.5" /> 지금 보내기</>}
          </button>
        </div>
      )}

      {/* 카카오 버튼 */}
      <button
        onClick={() => setShowKakao(!showKakao)}
        className="w-12 h-12 rounded-full bg-yellow-400 text-white flex items-center justify-center shadow-lg hover:bg-yellow-500 transition hover:scale-105"
        title="카카오톡 알림"
      >
        <KakaoIcon className="w-6 h-6" />
      </button>

      {/* AI 채팅 버튼 */}
      <button
        onClick={toggleChat}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition hover:scale-105"
        title="AI 도우미"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    </div>
  )
}
