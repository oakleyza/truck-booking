import { useState, useEffect, FormEvent } from 'react'
import {
  collection, query, onSnapshot,
  addDoc, deleteDoc, doc, updateDoc, serverTimestamp,
} from 'firebase/firestore'
import bcrypt from 'bcryptjs'
import { db } from '../lib/firebase'
import { AppUser, UserRole } from '../types'

const BCRYPT_ROUNDS = 10

export default function AdminPanel() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [success, setSuccess] = useState('')

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [addUsername, setAddUsername] = useState('')
  const [addDisplayName, setAddDisplayName] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRole, setAddRole] = useState<UserRole>('staff')
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  // Edit modal state
  const [editUser, setEditUser] = useState<AppUser | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('staff')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'users'))
    return onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)))
    })
  }, [])

  function showSuccess(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 4000)
  }

  // ---- Add user ----
  function resetAddForm() {
    setAddUsername(''); setAddDisplayName(''); setAddPassword('')
    setAddRole('staff'); setAddError(''); setShowAddForm(false)
  }

  async function handleAddUser(e: FormEvent) {
    e.preventDefault()
    setAddError('')
    const uname = addUsername.trim().toLowerCase()
    if (!uname || !addDisplayName.trim() || !addPassword) { setAddError('กรุณากรอกข้อมูลให้ครบ'); return }
    if (addPassword.length < 4) { setAddError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'); return }
    if (users.some(u => u.username === uname)) { setAddError(`ชื่อผู้ใช้ "${uname}" มีอยู่แล้ว`); return }

    setAddSaving(true)
    try {
      const passwordHash = await bcrypt.hash(addPassword, BCRYPT_ROUNDS)
      await addDoc(collection(db, 'users'), {
        username: uname,
        displayName: addDisplayName.trim(),
        passwordHash,
        role: addRole,
        createdAt: serverTimestamp(),
      })
      showSuccess(`เพิ่มบัญชี "${uname}" เรียบร้อยแล้ว`)
      resetAddForm()
    } catch {
      setAddError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setAddSaving(false)
    }
  }

  // ---- Edit user ----
  function openEdit(user: AppUser) {
    setEditUser(user)
    setEditDisplayName(user.displayName)
    setEditPassword('')
    setEditRole(user.role)
    setEditError('')
  }

  function closeEdit() {
    setEditUser(null)
    setEditError('')
  }

  async function handleEditUser(e: FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setEditError('')

    if (!editDisplayName.trim()) { setEditError('กรุณากรอกชื่อ-นามสกุล'); return }
    if (editPassword && editPassword.length < 4) { setEditError('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร'); return }

    setEditSaving(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        displayName: editDisplayName.trim(),
        role: editRole,
      }
      if (editPassword) {
        updates.passwordHash = await bcrypt.hash(editPassword, BCRYPT_ROUNDS)
      }
      await updateDoc(doc(db, 'users', editUser.id), updates)
      showSuccess(`แก้ไขบัญชี "${editUser.username}" เรียบร้อยแล้ว`)
      closeEdit()
    } catch {
      setEditError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setEditSaving(false)
    }
  }

  // ---- Delete user ----
  async function handleDelete(user: AppUser) {
    if (!confirm(`ลบบัญชี "${user.username}" (${user.displayName}) ออกจากระบบ?`)) return
    setDeletingId(user.id)
    try {
      await deleteDoc(doc(db, 'users', user.id))
    } catch {
      alert('ลบไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">จัดการบัญชีพนักงาน</h2>
        <button
          onClick={() => { setShowAddForm(true); setAddError('') }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + เพิ่มบัญชี
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-3 py-2">
          {success}
        </div>
      )}

      {/* Add user form */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">บัญชีใหม่</h3>
          <form onSubmit={handleAddUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username <span className="text-red-500">*</span></label>
                <input value={addUsername} onChange={e => setAddUsername(e.target.value)} autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น somchai" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input value={addDisplayName} onChange={e => setAddDisplayName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น สมชาย ใจดี" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">รหัสผ่าน <span className="text-red-500">*</span></label>
                <input type="password" value={addPassword} onChange={e => setAddPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="อย่างน้อย 4 ตัวอักษร" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สิทธิ์</label>
                <select value={addRole} onChange={e => setAddRole(e.target.value as UserRole)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="driver">พนักงานขับรถ (ดูอย่างเดียว)</option>
                  <option value="staff">พนักงาน</option>
                  <option value="dispatcher">พนักงานจัดรถ</option>
                  <option value="admin">แอดมิน</option>
                </select>
              </div>
            </div>
            {addError && <p className="text-red-600 text-xs">{addError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={resetAddForm}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button type="submit" disabled={addSaving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                {addSaving ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {users.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">ยังไม่มีบัญชีในระบบ</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {users.map(user => (
              <li key={user.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-800">{user.displayName}</span>
                    <span className={`text-[12px] font-medium px-1.5 py-0.5 rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700'
                      : user.role === 'dispatcher' ? 'bg-blue-100 text-blue-700'
                      : user.role === 'driver' ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role === 'admin' ? 'แอดมิน'
                       : user.role === 'dispatcher' ? 'พนักงานจัดรถ'
                       : user.role === 'driver' ? 'พนักงานขับรถ'
                       : 'พนักงาน'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">@{user.username}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(user)}
                    className="text-xs text-blue-500 hover:text-blue-700 transition-colors px-2 py-1 rounded hover:bg-blue-50">
                    แก้ไข
                  </button>
                  <button onClick={() => handleDelete(user)} disabled={deletingId === user.id}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors px-2 py-1 rounded hover:bg-red-50">
                    {deletingId === user.id ? '...' : 'ลบ'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => { if (e.target === e.currentTarget) closeEdit() }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-bold text-gray-800 mb-1">แก้ไขบัญชี</h3>
            <p className="text-xs text-gray-400 mb-4">@{editUser.username}</p>

            <form onSubmit={handleEditUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                <input value={editDisplayName} onChange={e => setEditDisplayName(e.target.value)} autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  รหัสผ่านใหม่ <span className="text-gray-400 font-normal">(เว้นว่างถ้าไม่เปลี่ยน)</span>
                </label>
                <input type="password" value={editPassword} onChange={e => setEditPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="อย่างน้อย 4 ตัวอักษร" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สิทธิ์</label>
                <select value={editRole} onChange={e => setEditRole(e.target.value as UserRole)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="driver">พนักงานขับรถ (ดูอย่างเดียว)</option>
                  <option value="staff">พนักงาน</option>
                  <option value="dispatcher">พนักงานจัดรถ</option>
                  <option value="admin">แอดมิน</option>
                </select>
              </div>

              {editError && <p className="text-red-600 text-xs">{editError}</p>}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeEdit}
                  className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors">
                  {editSaving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
