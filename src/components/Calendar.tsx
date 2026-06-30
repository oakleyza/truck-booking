import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface Props {
  selectedDate: string     // YYYY-MM-DD
  onSelectDate: (date: string) => void
}

function toYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]
const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export default function Calendar({ selectedDate, onSelectDate }: Props) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  // bookingCounts: { [YYYY-MM-DD]: number }
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({})

  // Calculate first/last day of month view
  const firstDay = new Date(viewYear, viewMonth, 1)
  const lastDay = new Date(viewYear, viewMonth + 1, 0)

  // Subscribe to bookings for visible month
  useEffect(() => {
    const startDate = toYMD(viewYear, viewMonth, 1)
    const endDate = toYMD(viewYear, viewMonth, lastDay.getDate())

    const q = query(
      collection(db, 'bookings'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    )

    const unsub = onSnapshot(q, snap => {
      const counts: Record<string, number> = {}
      snap.docs.forEach(doc => {
        const date = doc.data().date as string
        counts[date] = (counts[date] ?? 0) + 1
      })
      setBookingCounts(counts)
    })

    return () => unsub()
  }, [viewYear, viewMonth, lastDay])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  // Build grid: pad start with blanks
  const startPad = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const todayStr = toYMD(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ‹
        </button>
        <span className="font-semibold text-gray-800 text-sm">
          {THAI_MONTHS[viewMonth]} {viewYear + 543}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
        >
          ›
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = toYMD(viewYear, viewMonth, day)
          const count = bookingCounts[dateStr] ?? 0
          const isSelected = dateStr === selectedDate
          const isToday = dateStr === todayStr

          return (
            <button
              key={day}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative flex flex-col items-center justify-center rounded-lg py-1.5 text-sm transition-colors
                ${isSelected
                  ? 'bg-blue-600 text-white'
                  : isToday
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'hover:bg-gray-100 text-gray-700'
                }
              `}
            >
              <span>{day}</span>
              {count > 0 && (
                <span className={`
                  text-[9px] font-bold leading-none mt-0.5
                  ${isSelected ? 'text-blue-200' : 'text-blue-500'}
                `}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
