import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, Bot, User, Trash2 } from 'lucide-react'
import useAppStore from '../../store/useAppStore'
import { sendClaudeMessage } from '../../services/claudeService'
import { sendOpenAIMessage } from '../../services/openaiService'

const QUICK_PROMPTS = [
  '오늘 납품 예정 정리해줘',
  '보류중인 항목 알려줘',
  '누락 위험 품목 알려줘',
  '이번 주 발주 요약해줘',
  '오늘 할일 정리해줘',
]

export default function ChatPanel() {
  const { isChatOpen, toggleChat, messages, addMessage, clearMessages, activeModel, setActiveModel, orders, todos } = useAppStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const claudeKey = localStorage.getItem('claude_api_key') || ''
  const openaiKey = localStorage.getItem('openai_api_key') || ''

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setError('')

    addMessage({ role: 'user', content: msg })
    setLoading(true)

    try {
      let reply
      if (activeModel === 'claude') {
        reply = await sendClaudeMessage(msg, orders, todos, claudeKey)
      } else {
        reply = await sendOpenAIMessage(msg, orders, todos, openaiKey)
      }
      addMessage({ role: 'assistant', content: reply, model: activeModel })
    } catch (e) {
      setError(e.message || '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isChatOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-bold text-gray-800">AI 도우미</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearMessages} className="p-1.5 hover:bg-gray-100 rounded-lg transition" title="대화 초기화">
            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={toggleChat} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* 모델 선택 */}
      <div className="flex gap-1 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <button
          onClick={() => setActiveModel('claude')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${activeModel === 'claude' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          Claude
        </button>
        <button
          onClick={() => setActiveModel('openai')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${activeModel === 'openai' ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          ChatGPT
        </button>
      </div>

      {/* 빠른 질문 */}
      {messages.length === 0 && (
        <div className="px-3 py-3 border-b border-gray-100">
          <p className="text-[10px] text-gray-400 mb-2 font-medium">빠른 질문</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-[10px] px-2 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 메시지 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-xs py-8">
            <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>발주 현황을 바탕으로<br />질문에 답해드립니다.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'user' ? 'bg-pink-100' : 'bg-purple-100'}`}>
              {m.role === 'user'
                ? <User className="w-3 h-3 text-pink-500" />
                : <Bot className="w-3 h-3 text-purple-500" />
              }
            </div>
            <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed max-w-[220px] whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
              <Bot className="w-3 h-3 text-purple-500" />
            </div>
            <div className="bg-gray-100 rounded-xl px-3 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* 입력 */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="질문을 입력하세요..."
            className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:opacity-90 transition disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
