import { Timestamp } from 'firebase/firestore'

export type TimeSlot = 'เช้า' | 'บ่าย'
export type TruckName = 'รถพี่เอก' | 'รถพี่เล็ก'

export const TIME_SLOTS: TimeSlot[] = ['เช้า', 'บ่าย']
export const TRUCK_NAMES: TruckName[] = ['รถพี่เอก', 'รถพี่เล็ก']

export const SLOT_LABEL: Record<TimeSlot, string> = {
  'เช้า': 'ช่วงเช้า',
  'บ่าย': 'ช่วงบ่าย',
}

export interface Customer {
  cid: string         // client-generated unique id
  customerName: string
  phone: string
  mapsLink: string
  address: string
  notes: string
  createdBy: string   // username ของคนที่เพิ่มลูกค้ารายนี้
}

export interface Booking {
  id: string
  date: string        // YYYY-MM-DD
  slot: TimeSlot
  truck: TruckName
  customers: Customer[]
  createdBy: string
  createdAt: Timestamp
}

export interface SessionUser {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'staff'
}

export interface AppUser {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'staff'
  passwordHash: string
  createdAt: Timestamp
}
