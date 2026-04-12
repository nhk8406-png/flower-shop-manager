import Anthropic from '@anthropic-ai/sdk'
import { format } from 'date-fns'

export async function sendClaudeMessage(userMessage, orders, todos, apiKey) {
  if (!apiKey) throw new Error('Claude API 키가 설정되지 않았습니다.')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const pending = orders.filter((o) => o.status !== '출고완료')
  const missing = orders.filter((o) => o.deliveryDate < todayStr && o.status !== '출고완료')
  const todayTodos = todos.filter((t) => t.date === todayStr && !t.done)

  const systemPrompt = `당신은 꽃가게 발주 및 주문 관리를 도와주는 전문 어시스턴트입니다.
오늘 날짜: ${todayStr}

[현재 발주 현황]
전체: ${orders.length}건 | 미처리: ${pending.length}건 | 누락위험: ${missing.length}건
예약: ${orders.filter(o => o.type === '예약').length}건 | 주문: ${orders.filter(o => o.type === '주문').length}건

미처리 발주 목록:
${pending.slice(0, 15).map(o => `- ${o.itemName} ${o.quantity}${o.unit} / 공급처: ${o.supplier || '미정'} / 납품: ${o.deliveryDate} / 상태: ${o.status}`).join('\n') || '없음'}

누락 위험 항목:
${missing.slice(0, 5).map(o => `- ${o.itemName} ${o.quantity}${o.unit} (납품예정: ${o.deliveryDate})`).join('\n') || '없음'}

오늘 미완료 할일: ${todayTodos.length}건
${todayTodos.slice(0, 5).map(t => `- [${t.priority}] ${t.title}`).join('\n') || '없음'}

위 정보를 바탕으로 친절하고 실용적으로 답변해 주세요. 한국어로 답변하세요.`

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  return response.content[0].text
}
