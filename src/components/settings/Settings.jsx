import { useState } from 'react'
import { Save, Eye, EyeOff, FileSpreadsheet, FileDown, MessageCircle, FileText, Upload } from 'lucide-react'
import { format } from 'date-fns'
import useAppStore from '../../store/useAppStore'

export default function Settings() {
  const { orders, todos } = useAppStore()

  const [claudeKey, setClaudeKey] = useState(localStorage.getItem('claude_api_key') || '')
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_api_key') || '')
  const [kakaoWebhook, setKakaoWebhook] = useState(localStorage.getItem('kakao_webhook') || '')
  const [showClaude, setShowClaude] = useState(false)
  const [showOpenai, setShowOpenai] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    localStorage.setItem('claude_api_key', claudeKey)
    localStorage.setItem('openai_api_key', openaiKey)
    localStorage.setItem('kakao_webhook', kakaoWebhook)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // ===== 엑셀 내보내기 =====
  const handleExcel = async () => {
    const { utils, writeFile } = await import('xlsx')
    const data = orders.map((o) => ({
      품목명: o.itemName, 수량: o.quantity, 단위: o.unit,
      공급처: o.supplier, 발주일: o.orderDate, 납품예정일: o.deliveryDate,
      유형: o.type, 상태: o.status, 메모: o.memo,
    }))
    const ws = utils.json_to_sheet(data)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, '발주리스트')
    writeFile(wb, `발주리스트_${format(new Date(), 'yyyyMMdd')}.xlsx`)
  }

  // ===== 엑셀 가져오기 =====
  const handleImportExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const { read, utils } = await import('xlsx')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = read(ev.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = utils.sheet_to_json(ws)
      const { addOrder } = useAppStore.getState()
      data.forEach((row) => {
        addOrder({
          itemName: row['품목명'] || '',
          quantity: Number(row['수량']) || 1,
          unit: row['단위'] || '개',
          supplier: row['공급처'] || '',
          orderDate: row['발주일'] || format(new Date(), 'yyyy-MM-dd'),
          deliveryDate: row['납품예정일'] || format(new Date(), 'yyyy-MM-dd'),
          type: row['유형'] || '주문',
          status: row['상태'] || '대기중',
          memo: row['메모'] || '',
        })
      })
      alert(`${data.length}건 가져오기 완료!`)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // ===== PDF 내보내기 =====
  const handlePdf = async () => {
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text(`꽃가게 발주 리스트 (${format(new Date(), 'yyyy-MM-dd')})`, 14, 16)
    autoTable(doc, {
      head: [['품목명', '수량', '공급처', '납품예정일', '유형', '상태', '메모']],
      body: orders.map((o) => [
        o.itemName, `${o.quantity}${o.unit}`, o.supplier || '-',
        o.deliveryDate, o.type, o.status, o.memo || '-',
      ]),
      startY: 22,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [236, 72, 153] },
    })
    doc.save(`발주리스트_${format(new Date(), 'yyyyMMdd')}.pdf`)
  }

  // ===== 한글(HWP) → TXT 텍스트로 내보내기 =====
  const handleHwpExport = () => {
    const todayStr = format(new Date(), 'yyyy년 MM월 dd일')
    let content = `꽃가게 발주 리스트\n${todayStr}\n${'='.repeat(50)}\n\n`
    orders.forEach((o, i) => {
      content += `${i + 1}. ${o.itemName}\n`
      content += `   수량: ${o.quantity}${o.unit} | 공급처: ${o.supplier || '-'}\n`
      content += `   발주일: ${o.orderDate} | 납품예정: ${o.deliveryDate}\n`
      content += `   유형: ${o.type} | 상태: ${o.status}\n`
      if (o.memo) content += `   메모: ${o.memo}\n`
      content += '\n'
    })
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `발주리스트_${format(new Date(), 'yyyyMMdd')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ===== 카카오톡 알림 테스트 =====
  const handleKakaoTest = async () => {
    if (!kakaoWebhook) return alert('카카오 웹훅 URL을 먼저 입력해 주세요.')
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const missing = orders.filter(o => o.deliveryDate < todayStr && o.status !== '출고완료')
    const todayDel = orders.filter(o => o.deliveryDate === todayStr && o.status !== '출고완료')
    const text = `🌸 꽃가게 발주 현황 (${todayStr})\n\n📦 오늘 출고 예정: ${todayDel.length}건\n⚠️ 누락 위험: ${missing.length}건\n전체 발주: ${orders.length}건`
    try {
      await fetch(kakaoWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      alert('카카오 알림 전송 완료!')
    } catch {
      alert('카카오 알림 전송 실패. 웹훅 URL을 확인해 주세요.')
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* API 키 설정 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">AI 설정</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Claude API Key</label>
          <div className="flex gap-2">
            <input
              type={showClaude ? 'text' : 'password'}
              value={claudeKey}
              onChange={(e) => setClaudeKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <button onClick={() => setShowClaude(!showClaude)} className="p-2 hover:bg-gray-100 rounded-lg">
              {showClaude ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">OpenAI API Key (ChatGPT)</label>
          <div className="flex gap-2">
            <input
              type={showOpenai ? 'text' : 'password'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
            />
            <button onClick={() => setShowOpenai(!showOpenai)} className="p-2 hover:bg-gray-100 rounded-lg">
              {showOpenai ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${saved ? 'bg-green-500 text-white' : 'bg-pink-500 text-white hover:bg-pink-600'}`}
        >
          <Save className="w-4 h-4" />
          {saved ? '저장 완료!' : 'API 키 저장'}
        </button>
      </div>

      {/* 카카오톡 알림 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-yellow-400" />
          카카오톡 알림 설정
        </h2>
        <p className="text-xs text-gray-400">
          카카오워크 웹훅 또는 카카오 알림 봇 웹훅 URL을 입력하세요.<br/>
          발주 현황을 자동으로 알림 받을 수 있습니다.
        </p>
        <input
          value={kakaoWebhook}
          onChange={(e) => setKakaoWebhook(e.target.value)}
          placeholder="https://hook.kakaowork.com/..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-yellow-400 text-white rounded-xl text-sm font-medium hover:bg-yellow-500 transition"
          >
            저장
          </button>
          <button
            onClick={handleKakaoTest}
            className="px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-xl text-sm font-medium hover:bg-yellow-100 transition"
          >
            테스트 전송
          </button>
        </div>
      </div>

      {/* 파일 내보내기/가져오기 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">파일 호환</h2>
        <p className="text-xs text-gray-400">발주 데이터를 다양한 형식으로 내보내거나 가져올 수 있습니다.</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExcel}
            className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            엑셀 내보내기 (.xlsx)
          </button>

          <label className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm font-medium hover:bg-green-100 transition cursor-pointer">
            <Upload className="w-4 h-4" />
            엑셀 가져오기
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
          </label>

          <button
            onClick={handlePdf}
            className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition"
          >
            <FileDown className="w-4 h-4" />
            PDF 내보내기
          </button>

          <button
            onClick={handleHwpExport}
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-medium hover:bg-blue-100 transition"
          >
            <FileText className="w-4 h-4" />
            한글(TXT) 내보내기
          </button>
        </div>

        <p className="text-[10px] text-gray-400">
          * 한글(HWP) 파일은 직접 생성이 제한적입니다. TXT 형식으로 저장 후 한글 프로그램에서 열어주세요.
        </p>
      </div>
    </div>
  )
}
