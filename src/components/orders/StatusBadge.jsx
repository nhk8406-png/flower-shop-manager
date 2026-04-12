import { STATUS_STYLES } from '../../constants/status'

export default function StatusBadge({ status, isLate }) {
  const displayStatus = isLate ? '누락' : status
  const style = STATUS_STYLES[displayStatus] || STATUS_STYLES['대기중']

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {displayStatus}
    </span>
  )
}
