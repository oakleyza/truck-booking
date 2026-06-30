import { useState } from 'react'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Calendar from './components/Calendar'
import SlotBoard from './components/SlotBoard'
import AdminPanel from './components/AdminPanel'

type Tab = 'booking' | 'admin'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function App() {
  const { currentUser, loading, logout } = useAuth()
  const [selectedDate, setSelectedDate] = useState(todayStr())
  const [tab, setTab] = useState<Tab>('booking')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-400 text-sm">กำลังโหลด...</div>
      </div>
    )
  }

  if (!currentUser) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚚</span>
          <span className="font-bold text-gray-800 text-sm">ระบบจองรถส่งของ</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:block">
            {currentUser.displayName}
          </span>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            ออกจากระบบ
          </button>
        </div>
      </header>

      {/* Tab bar (admin only) */}
      {currentUser.role === 'admin' && (
        <div className="bg-white border-b border-gray-200 px-4 flex gap-1">
          {([['booking', 'จองรถ'], ['admin', 'จัดการบัญชี']] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <main className="max-w-4xl mx-auto p-4">
        {tab === 'admin' && currentUser.role === 'admin' ? (
          <AdminPanel />
        ) : (
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-64 shrink-0">
              <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </div>
            <div className="flex-1">
              <SlotBoard selectedDate={selectedDate} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
