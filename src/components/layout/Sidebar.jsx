import { LayoutDashboard, ClipboardList, CheckSquare, Settings, MessageCircle, Flower2, ScanText } from 'lucide-react'
import useAppStore from '../../store/useAppStore'

const navItems = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'orders', label: '발주 리스트', icon: ClipboardList },
  { id: 'todos', label: '할일 목록', icon: CheckSquare },
  { id: 'ocr', label: '이미지→텍스트', icon: ScanText },
  { id: 'settings', label: '설정', icon: Settings },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, toggleChat } = useAppStore()

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col z-10 shadow-sm">
      {/* 로고 */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-100">
        <Flower2 className="text-pink-500 w-6 h-6" />
        <div>
          <p className="font-bold text-gray-800 text-sm leading-tight">꽃가게 관리</p>
          <p className="text-xs text-gray-400">발주 · 주문 · 할일</p>
        </div>
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-pink-50 text-pink-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* AI 채팅 버튼 */}
      <div className="px-3 pb-4">
        <button
          onClick={toggleChat}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all shadow-sm"
        >
          <MessageCircle className="w-4 h-4" />
          AI 도우미
        </button>
      </div>
    </aside>
  )
}
