import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Bell, RefreshCw } from 'lucide-react'
import useAppStore from '../../store/useAppStore'

const TAB_NAMES = {
  dashboard: '대시보드',
  orders: '발주 리스트',
  todos: '할일 목록',
  settings: '설정',
}

export default function Header() {
  const { activeTab, getStats } = useAppStore()
  const { missing } = getStats()
  const now = format(new Date(), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-gray-800">{TAB_NAMES[activeTab]}</h1>
        <p className="text-xs text-gray-400">{now}</p>
      </div>

      <div className="flex items-center gap-3">
        {missing > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            누락 {missing}건 주의!
          </div>
        )}
        <button
          onClick={() => window.location.reload()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
          title="새로고침"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <div className="relative">
          <Bell className="w-5 h-5 text-gray-400" />
          {missing > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
              {missing}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
