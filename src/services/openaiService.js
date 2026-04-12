import OpenAI from 'openai'
import { format } from 'date-fns'

export async function sendOpenAIMessage(userMessage, orders, todos, apiKey) {
  if (!apiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다.')

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const pending = orders.filter((o) => o.status !== '출고완료')
  const missing = orders.filter((o) => o.deliveryDate < todayStr && o.status !== '출고완료')
  const todayTodos = todos.filter((t) => t.date === todayStr && !t.done)

  const systemPrompt = `당신은 꽃가게 발주 및 주문 관리를 도와주는 전문 어시스턴트입니다.
오늘 날짜: ${todayStr}

[현재 발주 현황]
전체: ${orders.length}건 | 미처리: ${pending.length}건 | 누락위험: ${missing.length}건
예약: ${orders.filter(o => o.type === '예약').length}건 | 주문: ${orders.filter(o => o.type === '주문').length}건

미처리 발주:
${pending.slice(0, 15).map(o => `- ${o.itemName} ${o.quantity}${o.unit} / ${o.supplier || '공급처미정'} / 납품: ${o.deliveryDate} / ${o.status}`).join('\n') || '없음'}

오늘 미완료 할일: ${todayTodos.length}건
${todayTodos.slice(0, 5).map(t => `- [${t.priority}] ${t.title}`).join('\n') || '없음'}

친절하고 실용적으로 한국어로 답변하세요.`

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1024,
  })

  return response.choices[0].message.content
}
