import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { TruckName, TruckStatus, SessionUser } from '../types'

export function useTruckStatus(date: string) {
  const [statuses, setStatuses] = useState<TruckStatus[]>([])

  useEffect(() => {
    if (!date) return
    const q = query(collection(db, 'truckStatus'), where('date', '==', date))
    return onSnapshot(q, snap => {
      setStatuses(snap.docs.map(d => ({ id: d.id, ...d.data() } as TruckStatus)))
    })
  }, [date])

  function isTruckDisabled(truck: TruckName): boolean {
    return statuses.find(s => s.truck === truck)?.disabled ?? false
  }

  async function toggleTruck(truck: TruckName, currentUser: SessionUser) {
    const existing = statuses.find(s => s.truck === truck)
    if (existing) {
      await updateDoc(doc(db, 'truckStatus', existing.id), {
        disabled: !existing.disabled,
        updatedBy: currentUser.username,
        updatedAt: serverTimestamp(),
      })
    } else {
      // ไม่มี doc = เปิดอยู่ → สร้าง doc ใหม่เป็น disabled
      await addDoc(collection(db, 'truckStatus'), {
        date,
        truck,
        disabled: true,
        updatedBy: currentUser.username,
        updatedAt: serverTimestamp(),
      })
    }
  }

  return { isTruckDisabled, toggleTruck }
}
