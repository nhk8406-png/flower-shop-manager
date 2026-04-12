import { useState } from 'react'
import { X } from 'lucide-react'
import useAppStore from '../../store/useAppStore'
import { format } from 'date-fns'

const defaultForm = {
  itemName: '',
  quantity: 1,
  unit: '송이',
  supplier: '',
  orderDate: format(new Date(), 'yyyy-MM-dd'),
  deliveryDate: format(new Date(), 'yyyy-MM-dd'),
  status: '대기중',
  type: '주문',
  memo: '',
}

export default function OrderForm({ order, onClose }) {
  const { addOrder, updateOrder } = useAppStore()
  const [form, setForm] = useState(order ? { ...order } : { ...defaultForm })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.itemName.trim()) return alert('품목명을 입력해 주세요.')
    if (order) {
      updateOrder(order.id, form)
    } else {
      addOrder(form)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {order ? '발주 수정' : '발주 등록'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">품목명 *</label>
              <input
                name="itemName"
                value={form.itemName}
                onChange={handleChange}
                placeholder="예: 장미 (빨강)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">수량</label>
              <input
                name="quantity"
                type="number"
                value={form.quantity}
                onChange={handleChange}
                min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">단위</label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <option>송이</option>
                <option>개</option>
                <option>단</option>
                <option>박스</option>
                <option>묶음</option>
                <option>kg</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">공급처</label>
              <input
                name="supplier"
                value={form.supplier}
                onChange={handleChange}
                placeholder="예: 한국화훼농협"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">발주일</label>
              <input
                name="orderDate"
                type="date"
                value={form.orderDate}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">납품 예정일</label>
              <input
                name="deliveryDate"
                type="date"
                value={form.deliveryDate}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">유형</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <option>주문</option>
                <option>예약</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">상태</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <option>대기중</option>
                <option>보류중</option>
                <option>출고완료</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">메모</label>
              <textarea
                name="memo"
                value={form.memo}
                onChange={handleChange}
                rows={2}
                placeholder="추가 메모를 입력하세요"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition"
            >
              {order ? '수정 완료' : '발주 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
