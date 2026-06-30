import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { TIME_SLOTS, TRUCK_NUMBERS, TimeSlot, TruckNumber, Booking } from '../types'

interface Props {
  selectedDate: string
}

interface BookingModalState {
  mode: 'new' | 'view'
  slot: TimeSlot
  truck: TruckNumber
  booking?: Booking
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ]
  return `${d} ${thaiMonths[m - 1]} ${y + 543}`
}

export default function SlotBoard({ selectedDate }: Props) {
  const { currentUser } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [modal, setModal] = useState<BookingModalState | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!selectedDate) return
    const q = query(
      collection(db, 'bookings'),
      where('date', '==', selectedDate)
    )
    const unsub = onSnapshot(q, snap => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)))
    })
    return () => unsub()
  }, [selectedDate])

  function getBooking(slot: TimeSlot, truck: TruckNumber): Booking | undefined {
    return bookings.find(b => b.slot === slot && b.truck === truck)
  }

  function openNew(slot: TimeSlot, truck: TruckNumber) {
    setModal({ mode: 'new', slot, truck })
    setCustomerName('')
    setNotes('')
    setError('')
  }

  function openView(booking: Booking) {
    setModal({ mode: 'view', slot: booking.slot, truck: booking.truck, booking })
    setError('')
  }

  function closeModal() {
    setModal(null)
    setError('')
  }

  async function handleBook() {
    if (!modal || !currentUser) return
    if (!customerName.trim()) {
      setError('กรุณากรอกชื่อลูกค้า')
      return
    }
    setSaving(true)
    try {
      await addDoc(collection(db, 'bookings'), {
        date: selectedDate,
        slot: modal.slot,
        truck: modal.truck,
        customerName: customerName.trim(),
        notes: notes.trim(),
        createdBy: currentUser.username,
        createdAt: serverTimestamp(),
      })
      closeModal()
    } catch {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancel() {
    if (!modal?.booking) return
    setSaving(true)
    try {
      await deleteDoc(doc(db, 'bookings', modal.booking.id))
      closeModal()
    } catch {
      setError('ยกเลิกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-800 text-sm">
          {selectedDate ? formatDate(selectedDate) : 'เลือกวันที่'}
        </h2>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-32">ช่วงเวลา</th>
              {TRUCK_NUMBERS.map(t => (
                <th key={t} className="text-center px-2 py-2.5 font-medium text-gray-700">
                  🚚 รถคัน {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, i) => (
              <tr key={slot} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3 text-xs font-medium text-gray-500 whitespace-nowrap">
                  {slot}
                </td>
                {TRUCK_NUMBERS.map(truck => {
                  const booking = getBooking(slot, truck)
                  return (
                    <td key={truck} className="px-2 py-2 text-center">
                      {booking ? (
                        <button
                          onClick={() => openView(booking)}
                          className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-lg px-2 py-2 text-xs text-left transition-colors"
                        >
                          <div className="font-semibold truncate">{booking.customerName}</div>
                          {booking.notes && (
                            <div className="text-blue-600 text-[10px] truncate mt-0.5">{booking.notes}</div>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => openNew(slot, truck)}
                          className="w-full border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg py-3 text-gray-300 hover:text-blue-400 transition-colors text-xs"
                        >
                          + จอง
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            {modal.mode === 'new' ? (
              <>
                <h3 className="font-bold text-gray-800 mb-1">จองรถ</h3>
                <p className="text-xs text-gray-500 mb-4">
                  รถคัน {modal.truck} · {modal.slot} · {formatDate(selectedDate)}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      ชื่อลูกค้า <span className="text-red-500">*</span>
                    </label>
                    <input
                      autoFocus
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="ชื่อลูกค้า / ชื่อโปรเจกต์"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">หมายเหตุ</label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="เช่น สินค้า, ปลายทาง..."
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-600 text-xs mt-2">{error}</p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleBook}
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                  >
                    {saving ? 'บันทึก...' : 'ยืนยันจอง'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-gray-800 mb-1">รายละเอียดการจอง</h3>
                <p className="text-xs text-gray-500 mb-4">
                  รถคัน {modal.truck} · {modal.slot} · {formatDate(selectedDate)}
                </p>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">ลูกค้า</span>
                    <p className="font-semibold text-gray-800">{modal.booking?.customerName}</p>
                  </div>
                  {modal.booking?.notes && (
                    <div>
                      <span className="text-xs text-gray-500">หมายเหตุ</span>
                      <p className="text-gray-700">{modal.booking.notes}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500">จองโดย</span>
                    <p className="text-gray-700">{modal.booking?.createdBy}</p>
                  </div>
                </div>

                {error && (
                  <p className="text-red-600 text-xs mt-2">{error}</p>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    ปิด
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                  >
                    {saving ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
