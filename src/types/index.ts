import { Timestamp } from 'firebase/firestore'

export type TimeSlot = '08:00-10:00' | '10:00-12:00' | '13:00-15:00' | '15:00-17:00'
export type TruckNumber = 1 | 2 | 3

export const TIME_SLOTS: TimeSlot[] = [
  '08:00-10:00',
  '10:00-12:00',
  '13:00-15:00',
  '15:00-17:00',
]

export const TRUCK_NUMBERS: TruckNumber[] = [1, 2, 3]

export interface AppUser {
  id: string        // Firestore doc id
  username: string
  displayName: string
  role: 'admin' | 'staff'
  passwordHash: string
  createdAt: Timestamp
}

export interface Booking {
  id: string
  date: string      // YYYY-MM-DD
  slot: TimeSlot
  truck: TruckNumber
  customerName: string
  notes: string
  createdBy: string // username
  createdAt: Timestamp
}

// Stored in sessionStorage to persist login across page refreshes (cleared on tab close)
export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'staff'
}
