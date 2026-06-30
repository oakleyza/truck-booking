import { useState, useEffect, FormEvent } from 'react'
import {
  collection, query, onSnapshot,
  addDoc, deleteDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import bcrypt from 'bcryptjs'
import { db } from '../lib/firebase'
import { AppUser } from '../types'

const BCRYPT_ROUNDS = 10

export default function AdminPanel() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [showForm, setShowForm] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'users'))
    return onSnapshot(q, snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)))
    })
  }, [])

  function resetForm() {
    setUsername('')
    setDisplayName('')
    setPassword('')
    setRole('staff')
    setError('')
    setSuccess('')
    setShowForm(false)
  }

  async function handleAddUser(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const uname = username.trim().toLowerCase()
    if (!uname || !displayName.trim() || !password) {
      setError('กรุณากรอกข้อมูลให้ครบ')
      return
    }
    if (password.length < 6) {
      setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }
    if (users.some(u => u.username === uname)) {
      setError(`ชื่อผู้ใช้ "${uname}" มีอยู่แล้วในระบบ`)
      return
    }

    setSaving(true)
    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
      await addDoc(collection(db, 'users'), {
        username: uname,
        displayName: displayName.trim(),
        passwordHash,
        role,
        createdAt: serverTimestamp(),
      })
      setSuccess(`เพิ่มผู้ใช้ "${uname}" เรียบร้อยแล้ว`)
      resetForm()
      setShowForm(false)
      // Keep success message visible
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

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
          onClick={() => { setShowForm(true); setError(''); setSuccess('') }}
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
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-700 text-sm mb-3">บัญชีใหม่</h3>
          <form onSubmit={handleAddUser} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น somchai"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ชื่อ-นามสกุล <span className="text-red-500">*</span>
                </label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="เช่น สมชาย ใจดี"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  รหัสผ่าน <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">สิทธิ์</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as 'staff' | 'admin')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="staff">พนักงาน</option>
                  <option value="admin">แอดมิน</option>
                </select>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-xs">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
              >
                {saving ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
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
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {user.role === 'admin' ? 'แอดมิน' : 'พนักงาน'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">@{user.username}</div>
                </div>
                <button
                  onClick={() => handleDelete(user)}
                  disabled={deletingId === user.id}
                  className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors px-2 py-1 rounded hover:bg-red-50"
                >
                  {deletingId === user.id ? '...' : 'ลบ'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
