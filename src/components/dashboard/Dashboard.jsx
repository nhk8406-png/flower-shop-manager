import { CalendarCheck, ShoppingCart, AlertTriangle, Truck, CheckSquare, BookMarked } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import StatCard from './StatCard'
import useAppStore from '../../store/useAppStore'
import { STATUS_STYLES } from '../../constants/status'

export default function Dashboard() {
  const { orders, todos, getStats, setActiveTab, updateStatus } = useAppStore()
  const { reservations, totalOrders, missing, todayDelivery, pendingTodos } = getStats()
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const todayOrders = orders.filter(
    (o) => o.deliveryDate === todayStr && o.status !== '출고완료'
  )
  const todayTodos = todos.filter((t) => t.date === todayStr && !t.done)
  const missingOrders = orders.filter(
    (o) => o.deliveryDate < todayStr && o.status !== '출고완료'
  )

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="예약 건수" value={reservations} icon={BookMarked} color="pink" />
        <StatCard label="주문 건수" value={totalOrders} icon={ShoppingCart} color="blue" />
        <StatCard label="누락 위험" value={missing} icon={AlertTriangle} color="red" sub="납품 지연 항목" />
        <StatCard label="오늘 출고 예정" value={todayDelivery} icon={Truck} color="green" />
        <StatCard label="오늘 할일" value={pendingTodos} icon={CheckSquare} color="yellow" sub="미완료 항목" />
        <StatCard
          label="전체 발주"
          value={orders.length}
          icon={CalendarCheck}
          color="purple"
          sub={`대기중 ${orders.filter(o => o.status === '대기중').length}건`}
        />
      </div>

      {/* 누락 위험 항목 */}
      {missingOrders.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            누락 위험 항목 ({missingOrders.length}건) — 즉시 확인 필요
          </h2>
          <div className="space-y-2">
            {missingOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 text-sm shadow-sm">
                <div>
                  <span className="font-medium text-gray-800">{o.itemName}</span>
                  <span className="text-gray-400 ml-2">{o.quantity}{o.unit} · {o.supplier}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-500 text-xs">납품예정 {o.deliveryDate}</span>
                  <button
                    onClick={() => updateStatus(o.id, '출고완료')}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-md hover:bg-green-200 transition"
                  >
                    출고완료
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 오늘 출고 예정 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Truck className="w-4 h-4 text-green-500" />
              오늘 출고 예정
            </h2>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs text-pink-500 hover:underline"
            >
              전체 보기
            </button>
          </div>
          {todayOrders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">오늘 출고 예정 없음</p>
          ) : (
            <div className="space-y-2">
              {todayOrders.map((o) => {
                const style = STATUS_STYLES[o.status] || STATUS_STYLES['대기중']
                return (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{o.itemName}</p>
                      <p className="text-xs text-gray-400">{o.quantity}{o.unit} · {o.supplier}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                        {o.status}
                      </span>
                      <button
                        onClick={() => updateStatus(o.id, '출고완료')}
                        className="text-xs text-gray-400 hover:text-green-600 transition"
                      >
                        완료
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 오늘 할일 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-yellow-500" />
              오늘 할일
            </h2>
            <button
              onClick={() => setActiveTab('todos')}
              className="text-xs text-pink-500 hover:underline"
            >
              전체 보기
            </button>
          </div>
          {todayTodos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">오늘 할일 없음</p>
          ) : (
            <div className="space-y-2">
              {todayTodos.slice(0, 6).map((t) => (
                <div key={t.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    t.priority === '높음' ? 'bg-red-100 text-red-600' :
                    t.priority === '낮음' ? 'bg-blue-100 text-blue-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>{t.priority}</span>
                  <p className="text-sm text-gray-700 truncate">{t.title}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 전체 발주 현황 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700">전체 발주 현황</h2>
          <button
            onClick={() => setActiveTab('orders')}
            className="text-xs text-pink-500 hover:underline"
          >
            발주 등록 →
          </button>
        </div>
        {orders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">발주 내역이 없습니다. 발주를 등록해 주세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">품목</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">수량</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">납품예정</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">유형</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-400">상태</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 8).map((o) => {
                  const style = STATUS_STYLES[o.status] || STATUS_STYLES['대기중']
                  const isLate = o.deliveryDate < todayStr && o.status !== '출고완료'
                  return (
                    <tr key={o.id} className={`border-b border-gray-50 last:border-0 ${isLate ? 'bg-red-50' : ''}`}>
                      <td className="py-2 px-2 font-medium text-gray-800">{o.itemName}</td>
                      <td className="py-2 px-2 text-gray-500">{o.quantity}{o.unit}</td>
                      <td className={`py-2 px-2 ${isLate ? 'text-red-500 font-medium' : 'text-gray-500'}`}>{o.deliveryDate}</td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${o.type === '예약' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          {o.type}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                          {isLate ? '누락' : o.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
