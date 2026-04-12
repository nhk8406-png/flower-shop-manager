import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, FileDown, FileSpreadsheet, ScanText } from 'lucide-react'
import { format } from 'date-fns'
import useAppStore from '../../store/useAppStore'
import StatusBadge from './StatusBadge'
import OrderForm from './OrderForm'
import OcrOrderImport from './OcrOrderImport'

const STATUS_TABS = ['전체', '대기중', '보류중', '출고완료']
const todayStr = format(new Date(), 'yyyy-MM-dd')

export default function OrderList() {
  const { orders, deleteOrder, updateStatus } = useAppStore()
  const [tab, setTab] = useState('전체')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editOrder, setEditOrder] = useState(null)
  const [showOcr, setShowOcr] = useState(false)

  const filtered = orders.filter((o) => {
    const matchTab = tab === '전체' || o.status === tab
    const matchSearch = o.itemName.includes(search) || o.supplier.includes(search)
    return matchTab && matchSearch
  })

  const handleExcelExport = () => {
    import('xlsx').then(({ utils, writeFile }) => {
      const data = orders.map((o) => ({
        품목명: o.itemName,
        수량: o.quantity,
        단위: o.unit,
        공급처: o.supplier,
        발주일: o.orderDate,
        납품예정일: o.deliveryDate,
        유형: o.type,
        상태: o.status,
        메모: o.memo,
      }))
      const ws = utils.json_to_sheet(data)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, '발주리스트')
      writeFile(wb, `발주리스트_${todayStr}.xlsx`)
    })
  }

  const handlePdfExport = () => {
    import('jspdf').then(({ jsPDF }) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF({ orientation: 'landscape' })
        doc.setFont('helvetica')
        doc.text(`발주 리스트 (${todayStr})`, 14, 16)
        doc.autoTable({
          head: [['품목명', '수량', '공급처', '납품예정일', '유형', '상태']],
          body: orders.map((o) => [
            o.itemName, `${o.quantity}${o.unit}`, o.supplier,
            o.deliveryDate, o.type, o.status
          ]),
          startY: 22,
          styles: { font: 'helvetica', fontSize: 9 },
        })
        doc.save(`발주리스트_${todayStr}.pdf`)
      })
    })
  }

  return (
    <div className="space-y-4">
      {/* 상단 바 */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-gray-300" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="품목명, 공급처 검색"
            className="text-sm w-full outline-none text-gray-700 placeholder-gray-300"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExcelExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            엑셀
          </button>
          <button
            onClick={handlePdfExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            PDF
          </button>
          <button
            onClick={() => setShowOcr(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 transition"
          >
            <ScanText className="w-3.5 h-3.5" />
            캡처 등록
          </button>
          <button
            onClick={() => { setEditOrder(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            발주 등록
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {STATUS_TABS.map((t) => {
          const count = t === '전체' ? orders.length : orders.filter(o => o.status === t).length
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                tab === t ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t} <span className="text-[10px] opacity-60">({count})</span>
            </button>
          )
        })}
      </div>

      {/* 발주 목록 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">발주 내역이 없습니다.</p>
            <p className="text-xs mt-1">발주 등록 버튼을 눌러 추가하세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['품목명', '수량', '공급처', '발주일', '납품예정일', '유형', '상태', '관리'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((o) => {
                  const isLate = o.deliveryDate < todayStr && o.status !== '출고완료'
                  return (
                    <tr key={o.id} className={`hover:bg-gray-50 transition ${isLate ? 'bg-red-50/50' : ''}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {o.itemName}
                        {o.memo && <span className="block text-xs text-gray-400 truncate max-w-[120px]">{o.memo}</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{o.quantity}{o.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{o.supplier || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{o.orderDate}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${isLate ? 'text-red-500' : 'text-gray-600'}`}>
                        {o.deliveryDate}
                        {isLate && <span className="block text-[10px] text-red-400">납품 지연!</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${o.type === '예약' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
                          {o.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className={`text-xs rounded-lg px-2 py-1 border font-medium cursor-pointer focus:outline-none ${
                            o.status === '출고완료' ? 'bg-green-50 text-green-700 border-green-200' :
                            o.status === '보류중' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <option value="대기중">대기중</option>
                          <option value="보류중">보류중</option>
                          <option value="출고완료">출고완료</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditOrder(o); setShowForm(true) }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`"${o.itemName}" 발주를 삭제하시겠습니까?`)) deleteOrder(o.id)
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <OrderForm
          order={editOrder}
          onClose={() => { setShowForm(false); setEditOrder(null) }}
        />
      )}

      {showOcr && (
        <OcrOrderImport
          onClose={(count) => {
            setShowOcr(false)
            if (count > 0) alert(`${count}건 발주가 등록되었습니다!`)
          }}
        />
      )}
    </div>
  )
}
