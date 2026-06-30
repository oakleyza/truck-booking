import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useUsers } from '../hooks/useUsers'
import { TIME_SLOTS, TRUCK_NAMES, SLOT_LABEL, TimeSlot, TruckName, Booking, Customer } from '../types'

interface Props {
  selectedDate: string
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

type FormData = Omit<Customer, 'cid' | 'createdBy' | 'createdByName'>

function emptyForm(): FormData {
  return { customerName: '', phone: '', mapsLink: '', address: '', notes: '' }
}

function customerToForm(c: Customer): FormData {
  return {
    customerName: c.customerName,
    phone: c.phone,
    mapsLink: c.mapsLink,
    address: c.address,
    notes: c.notes,
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  return `${d} ${months[m - 1]} ${y + 543}`
}

interface ModalState {
  slot: TimeSlot
  truck: TruckName
  booking?: Booking
  editingCustomer?: Customer  // ถ้ามี = โหมดแก้ไข
}

export default function SlotBoard({ selectedDate }: Props) {
  const { currentUser } = useAuth()
  const { getDisplayName } = useUsers()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [modal, setModal] = useState<ModalState | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedCid, setExpandedCid] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDate) return
    const q = query(collection(db, 'bookings'), where('date', '==', selectedDate))
    return onSnapshot(q, snap => {
      setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)))
    })
  }, [selectedDate])

  function getBooking(slot: TimeSlot, truck: TruckName): Booking | undefined {
    return bookings.find(b => b.slot === slot && b.truck === truck)
  }

  function canEditCustomer(c: Customer): boolean {
    if (!currentUser) return false
    return currentUser.role === 'admin' || c.createdBy === currentUser.username
  }

  function openAdd(slot: TimeSlot, truck: TruckName) {
    setModal({ slot, truck, booking: getBooking(slot, truck) })
    setForm(emptyForm())
    setError('')
  }

  function openEdit(booking: Booking, customer: Customer) {
    setModal({ slot: booking.slot, truck: booking.truck, booking, editingCustomer: customer })
    setForm(customerToForm(customer))
    setError('')
    setExpandedCid(null)
  }

  function closeModal() {
    setModal(null)
    setError('')
  }

  async function handleSave() {
    if (!modal || !currentUser) return
    if (!form.customerName.trim()) { setError('กรุณากรอกชื่อลูกค้า'); return }

    setSaving(true)
    setError('')

    try {
      if (modal.editingCustomer && modal.booking) {
        // โหมดแก้ไข — อัปเดต customer ใน array
        const updated = modal.booking.customers.map(c =>
          c.cid === modal.editingCustomer!.cid
            ? { ...c, ...form, customerName: form.customerName.trim() }
            : c
        )
        await updateDoc(doc(db, 'bookings', modal.booking.id), { customers: updated })
      } else if (modal.booking) {
        // เพิ่มลูกค้าใหม่ใน booking เดิม
        const newCustomer: Customer = {
          cid: uid(),
          ...form,
          customerName: form.customerName.trim(),
          createdBy: currentUser.username,
          createdByName: currentUser.displayName,
        }
        await updateDoc(doc(db, 'bookings', modal.booking.id), {
          customers: [...modal.booking.customers, newCustomer],
        })
      } else {
        // สร้าง booking ใหม่
        const newCustomer: Customer = {
          cid: uid(),
          ...form,
          customerName: form.customerName.trim(),
          createdBy: currentUser.username,
          createdByName: currentUser.displayName,
        }
        await addDoc(collection(db, 'bookings'), {
          date: selectedDate,
          slot: modal.slot,
          truck: modal.truck,
          customers: [newCustomer],
          createdBy: currentUser.username,
          createdAt: serverTimestamp(),
        })
      }
      closeModal()
    } catch {
      setError('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCustomer(booking: Booking, cid: string) {
    if (!confirm('ลบลูกค้ารายนี้ออก?')) return
    const remaining = booking.customers.filter(c => c.cid !== cid)
    try {
      if (remaining.length === 0) {
        await deleteDoc(doc(db, 'bookings', booking.id))
      } else {
        await updateDoc(doc(db, 'bookings', booking.id), { customers: remaining })
      }
      setExpandedCid(null)
    } catch {
      alert('ลบไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  const isEditMode = !!modal?.editingCustomer

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
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-medium text-gray-400 text-xs w-24">ช่วงเวลา</th>
              {TRUCK_NAMES.map(t => (
                <th key={t} className="text-center px-3 py-2.5 font-semibold text-gray-700 text-sm">
                  🚚 {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TIME_SLOTS.map((slot, i) => (
              <tr key={slot} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                <td className="px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap align-top pt-4">
                  {SLOT_LABEL[slot]}
                </td>
                {TRUCK_NAMES.map(truck => {
                  const booking = getBooking(slot, truck)
                  const customers = booking?.customers ?? []

                  return (
                    <td key={truck} className="px-3 py-3 align-top">
                      <div className="space-y-1.5">
                        {customers.map((c, idx) => (
                          <div
                            key={c.cid}
                            className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => setExpandedCid(expandedCid === c.cid ? null : c.cid)}
                          >
                            {/* Row header */}
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[12px] font-bold text-blue-400 shrink-0">{idx + 1}</span>
                                <span className="text-xs font-semibold text-gray-800 truncate">{c.customerName}</span>
                              </div>
                            </div>

                            {/* Expanded detail */}
                            {expandedCid === c.cid && (
                              <div className="mt-2 pt-2 border-t border-blue-200 space-y-1 text-xs text-gray-600">
                                {c.phone && <p>📞 {c.phone}</p>}
                                {c.address && <p>🏠 {c.address}</p>}
                                {c.notes && <p className="italic text-gray-400">💬 {c.notes}</p>}
                                {c.mapsLink && (
                                  <a
                                    href={c.mapsLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-blue-500 hover:underline flex items-center gap-1"
                                  >
                                    📌 ดูแผนที่
                                  </a>
                                )}
                                {/* Who booked */}
                                <p className="pt-1 mt-1 border-t border-blue-100 text-gray-500 font-semibold">
                                  จองโดย {getDisplayName(c.createdBy)}
                                </p>

                                {/* Edit / Delete buttons */}
                                {canEditCustomer(c) && booking && (
                                  <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => openEdit(booking, c)}
                                      className="flex-1 text-center text-[13px] font-medium text-blue-600 bg-white hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg py-1 transition-colors"
                                    >
                                      แก้ไข
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCustomer(booking, c.cid)}
                                      className="flex-1 text-center text-[13px] font-medium text-red-500 bg-white hover:bg-red-500 hover:text-white border border-red-200 rounded-lg py-1 transition-colors"
                                    >
                                      ลบ
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Add button */}
                        <button
                          onClick={() => openAdd(slot, truck)}
                          className={`w-full rounded-lg py-2 text-xs transition-colors ${
                            customers.length === 0
                              ? 'border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-gray-300 hover:text-blue-400'
                              : 'border border-dashed border-blue-200 hover:border-blue-400 text-blue-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          {customers.length === 0 ? '+ จอง' : '+ เพิ่มลูกค้า'}
                        </button>
                      </div>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 mb-1">
              {isEditMode ? 'แก้ไขข้อมูล' : modal.booking ? 'เพิ่มลูกค้า' : 'จองรถ'}
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              {modal.truck} · {SLOT_LABEL[modal.slot]} · {formatDate(selectedDate)}
              {!isEditMode && modal.booking && ` · ลูกค้าคนที่ ${modal.booking.customers.length + 1}`}
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  ชื่อลูกค้า <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.customerName}
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ชื่อลูกค้า / ชื่อโปรเจกต์"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">เบอร์โทร</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: formatPhone(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0xx-xxx-xxxx"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">ที่อยู่</label>
                <textarea
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="บ้านเลขที่ หมู่บ้าน ซอย ถนน ตำบล อำเภอ"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Link Google Maps</label>
                <input
                  value={form.mapsLink}
                  onChange={e => setForm(f => ({ ...f, mapsLink: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">หมายเหตุ</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="รายละเอียดเพิ่มเติม..."
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-xs mt-2">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button
                onClick={closeModal}
                className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {saving ? 'บันทึก...' : isEditMode ? 'บันทึกการแก้ไข' : 'ยืนยัน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
