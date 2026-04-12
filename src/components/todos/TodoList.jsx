import { useState } from 'react'
import { Plus, Trash2, CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, subDays, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import useAppStore from '../../store/useAppStore'
import { PRIORITY_STYLES } from '../../constants/status'

export default function TodoList() {
  const { todos, selectedDate, setSelectedDate, addTodo, toggleTodo, deleteTodo, updateTodo } = useAppStore()
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState('보통')

  const dayTodos = todos
    .filter((t) => t.date === selectedDate)
    .sort((a, b) => {
      const order = { 높음: 0, 보통: 1, 낮음: 2 }
      return order[a.priority] - order[b.priority]
    })

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addTodo({ title: newTitle.trim(), date: selectedDate, priority: newPriority })
    setNewTitle('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  const navigateDate = (dir) => {
    const current = parseISO(selectedDate)
    const next = dir === 'prev' ? subDays(current, 1) : addDays(current, 1)
    setSelectedDate(format(next, 'yyyy-MM-dd'))
  }

  const done = dayTodos.filter((t) => t.done).length
  const total = dayTodos.length

  return (
    <div className="space-y-4 max-w-2xl">
      {/* 날짜 네비게이션 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
        <button
          onClick={() => navigateDate('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        <div className="text-center">
          <p className="text-base font-bold text-gray-800">
            {format(parseISO(selectedDate), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}
          </p>
          {total > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {done}/{total} 완료 ({Math.round((done / total) * 100)}%)
            </p>
          )}
        </div>

        <button
          onClick={() => navigateDate('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* 오늘로 이동 */}
      {selectedDate !== format(new Date(), 'yyyy-MM-dd') && (
        <button
          onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
          className="text-xs text-pink-500 hover:underline"
        >
          오늘로 돌아가기
        </button>
      )}

      {/* 할일 추가 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-2">
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-300"
          >
            <option value="높음">높음</option>
            <option value="보통">보통</option>
            <option value="낮음">낮음</option>
          </select>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="할일을 입력하세요 (Enter로 추가)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 할일 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {dayTodos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">이 날 할일이 없습니다.</p>
            <p className="text-xs mt-1">위에서 할일을 추가해 보세요.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {dayTodos.map((t) => (
              <li
                key={t.id}
                className={`flex items-center gap-3 px-4 py-3 transition ${t.done ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
              >
                <button onClick={() => toggleTodo(t.id)} className="flex-shrink-0">
                  {t.done
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-gray-300" />
                  }
                </button>

                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIORITY_STYLES[t.priority]}`}>
                  {t.priority}
                </span>

                <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {t.title}
                </span>

                <button
                  onClick={() => deleteTodo(t.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 진행률 바 */}
      {total > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>오늘 진행률</span>
            <span>{done}/{total}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
