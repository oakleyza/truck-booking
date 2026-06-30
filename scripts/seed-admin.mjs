import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// ============================
// แก้ตรงนี้ก่อนรัน
const ADMIN_USERNAME = 'admin'
const ADMIN_DISPLAY_NAME = 'แอดมิน'
const ADMIN_PASSWORD = '1234'
// ============================

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

const db = getFirestore(app)
const hash = await bcrypt.hash(ADMIN_PASSWORD, 10)

await addDoc(collection(db, 'users'), {
  username: ADMIN_USERNAME,
  displayName: ADMIN_DISPLAY_NAME,
  passwordHash: hash,
  role: 'admin',
  createdAt: serverTimestamp(),
})

console.log(`✅ สร้างบัญชี admin "${ADMIN_USERNAME}" เรียบร้อยแล้ว`)
process.exit(0)
