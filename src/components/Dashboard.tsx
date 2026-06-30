import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useUsers } from '../hooks/useUsers'
import { Booking, TRUCK_NAMES, TIME_SLOTS, TruckName, TimeSlot, SLOT_LABEL } from '../types'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatThaiDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const days = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
  const dayName = days[new Date(y, m - 1, d).getDay()]
  return `วัน${dayName} ${d} ${months[m - 1]} ${y + 543}`
}

const TRUCK_EMOJI: Record<TruckName, string> = {
  'รถพี่เอก': '🚛',
  'รถพี่เล็ก': '🚚',
}

export default function Dashboard() {
  const today = todayStr()
  const [bookings, setBookings] = useState<Booking[]>([])
  const { getDisplayName } = useUsers()

  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('date', '==', today))
    return onSnapshot(q, snap => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)))
    })
  }, [today])

  function getBooking(truck: TruckName, slot: TimeSlot): Booking | undefined {
    return bookings.find(b => b.truck === truck && b.slot === slot)
  }

  const totalCustomers = bookings.reduce((sum, b) => sum + b.customers.length, 0)
  const busySlots = bookings.filter(b => b.customers.length > 0).length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <p className="text-xs text-gray-400 mb-0.5">วันนี้</p>
        <p className="font-bold text-gray-800">{formatThaiDate(today)}</p>
        <div className="flex gap-4 mt-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{totalCustomers}</p>
            <p className="text-xs text-gray-400">ลูกค้าทั้งหมด</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">{busySlots}</p>
            <p className="text-xs text-gray-400">รอบที่มีงาน</p>
          </div>
          <div className="w-px bg-gray-100" />
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{TRUCK_NAMES.length * TIME_SLOTS.length - busySlots}</p>
            <p className="text-xs text-gray-400">รอบที่ว่าง</p>
          </div>
        </div>
      </div>

      {/* Truck cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TRUCK_NAMES.map(truck => (
          <div key={truck} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className="text-xl">{TRUCK_EMOJI[truck]}</span>
              <span className="font-bold text-gray-800">{truck}</span>
            </div>

            {/* Slots */}
            <div className="divide-y divide-gray-100">
              {TIME_SLOTS.map(slot => {
                const booking = getBooking(truck, slot)
                const customers = booking?.customers ?? []
                const hasJob = customers.length > 0

                return (
                  <div key={slot} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-500">{SLOT_LABEL[slot]}</span>
                      <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${
                        hasJob
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {hasJob ? `${customers.length} ลูกค้า` : 'ว่าง'}
                      </span>
                    </div>

                    {hasJob ? (
                      <ul className="space-y-1.5">
                        {customers.map((c, i) => (
                          <li key={c.cid} className="bg-blue-50 rounded-lg px-3 py-2">
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold text-blue-400 mt-0.5 shrink-0">{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{c.customerName}</p>
                                {c.phone && <p className="text-sm text-gray-500 mt-0.5">📞 {c.phone}</p>}
                                {c.address && <p className="text-sm text-gray-500 truncate">📍 {c.address}</p>}
                                {c.notes && <p className="text-sm text-gray-400 italic truncate">หมายเหตุ: {c.notes}</p>}
                                {c.mapsLink && (
                                  <a href={c.mapsLink} target="_blank" rel="noopener noreferrer"
                                    className="text-sm text-blue-500 hover:underline">
                                    ดูแผนที่ →
                                  </a>
                                )}
                                {c.createdBy && (
                                  <p className="text-xs font-semibold text-gray-500 mt-1 pt-1 border-t border-blue-100">
                                    จองโดย {getDisplayName(c.createdBy)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-300 italic">ยังไม่มีการจอง</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
