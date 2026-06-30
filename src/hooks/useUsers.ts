import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { AppUser } from '../types'

export function useUsers() {
  const [users, setUsers] = useState<AppUser[]>([])

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser)))
    })
  }, [])

  // แปลง username → ชื่อ-นามสกุล (fallback เป็น username ถ้าหาไม่เจอ)
  function getDisplayName(username: string): string {
    if (!username) return ''
    return users.find(u => u.username === username)?.displayName ?? username
  }

  return { users, getDisplayName }
}
