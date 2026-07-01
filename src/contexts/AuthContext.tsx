import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import bcrypt from 'bcryptjs'
import { db } from '../lib/firebase'
import { AppUser, SessionUser } from '../types'

const SESSION_KEY = 'truck_booking_session'

interface AuthContextType {
  currentUser: SessionUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY)
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved) as SessionUser)
      } catch {
        localStorage.removeItem(SESSION_KEY)
      }
    }
    setLoading(false)
  }, [])

  async function login(username: string, password: string) {
    const q = query(
      collection(db, 'users'),
      where('username', '==', username.trim().toLowerCase())
    )
    const snap = await getDocs(q)

    if (snap.empty) {
      throw new Error('ไม่พบชื่อผู้ใช้นี้ในระบบ')
    }

    const doc = snap.docs[0]
    const userData = { id: doc.id, ...doc.data() } as AppUser

    const match = await bcrypt.compare(password, userData.passwordHash)
    if (!match) {
      throw new Error('รหัสผ่านไม่ถูกต้อง')
    }

    const session: SessionUser = {
      id: userData.id,
      username: userData.username,
      displayName: userData.displayName,
      role: userData.role,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setCurrentUser(session)
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
  }

  return (
    <AuthContext.Provider value={{ currentUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
