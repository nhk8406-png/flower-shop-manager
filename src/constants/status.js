export const ORDER_STATUS = {
  WAITING: '대기중',
  PENDING: '보류중',
  DONE: '출고완료',
}

export const STATUS_STYLES = {
  대기중: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
  },
  보류중: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    dot: 'bg-yellow-500',
  },
  출고완료: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200',
    dot: 'bg-green-500',
  },
  누락: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
}

export const ORDER_TYPES = {
  RESERVATION: '예약',
  ORDER: '주문',
}

export const PRIORITY = {
  HIGH: '높음',
  NORMAL: '보통',
  LOW: '낮음',
}

export const PRIORITY_STYLES = {
  높음: 'bg-red-100 text-red-700',
  보통: 'bg-gray-100 text-gray-700',
  낮음: 'bg-blue-100 text-blue-700',
}
