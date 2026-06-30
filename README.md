# Truck Booking — ระบบจองรถส่งของ

ระบบจัดคิวรถส่งของสำหรับกลางซอย วู้ดเวิร์ค — รถ 3 คัน, 4 ช่วงเวลา/วัน

## Stack
- React 18 + TypeScript + Vite
- Tailwind CSS
- Firebase Firestore (database)
- bcryptjs (hash รหัสผ่านใน Firestore)
- Vercel (deploy)

---

## ขั้นตอนการตั้งค่า

### 1. สร้าง Firebase Project
1. ไปที่ [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → ตั้งชื่อ เช่น `truck-booking-gsp`
3. ไปที่ **Firestore Database** → **Create database** → เลือก **production mode** → เลือก region ใกล้ไทย (`asia-southeast1`)
4. ไปที่ **Project Settings** → **Your apps** → คลิก Web icon (`</>`) → ลงทะเบียน app
5. คัดลอก `firebaseConfig` values

### 2. ตั้งค่า Environment Variables
```bash
cp .env.example .env.local
# แล้วแก้ค่าทุกตัวใน .env.local ด้วย values จาก Firebase
```

### 3. ตั้งค่า Firestore Rules
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # เลือก project ที่สร้างไว้
firebase deploy --only firestore:rules
```

หรือ copy เนื้อหาจาก `firestore.rules` ไปวางใน Firebase Console → Firestore → Rules

### 4. สร้างบัญชีแอดมินคนแรก

เปิด browser console ที่ `localhost:5173` แล้วรันสคริปต์นี้ (ครั้งเดียวเท่านั้น):

```javascript
// วิ่งใน browser console ขณะ dev server กำลังทำงาน
import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
// หรือใช้ Admin seed script ด้านล่าง
```

วิธีง่ายกว่า: ใช้ไฟล์ `scripts/seed-admin.mjs` (ดูด้านล่าง)

### 5. Install & Run
```bash
npm install
npm run dev
```

### 6. Deploy บน Vercel
1. Push โค้ดขึ้น GitHub repo: `oakleyza/truck-booking`
2. ไปที่ [vercel.com](https://vercel.com) → Import project
3. เพิ่ม Environment Variables ทุกตัวจาก `.env.example` ใน Vercel project settings
4. Deploy

---

## สร้างบัญชีแอดมินคนแรก (Seed Script)

สร้างไฟล์ `scripts/seed-admin.mjs`:

```js
// scripts/seed-admin.mjs
// รัน: node scripts/seed-admin.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app)

const hash = await bcrypt.hash('your-admin-password', 10)
await addDoc(collection(db, 'users'), {
  username: 'admin',
  displayName: 'แอดมิน',
  passwordHash: hash,
  role: 'admin',
  createdAt: serverTimestamp(),
})
console.log('Admin created!')
process.exit(0)
```

```bash
node scripts/seed-admin.mjs
```

---

## โครงสร้างโฟลเดอร์

```
src/
├── components/
│   ├── Login.tsx        # หน้า login
│   ├── Calendar.tsx     # ปฏิทิน + badge จำนวนการจอง
│   ├── SlotBoard.tsx    # ตาราง slot × รถ + modal จอง/ดู/ยกเลิก
│   └── AdminPanel.tsx   # จัดการบัญชีพนักงาน
├── contexts/
│   └── AuthContext.tsx  # custom auth (bcrypt + Firestore)
├── lib/
│   └── firebase.ts      # Firebase init
├── types/
│   └── index.ts         # TypeScript types
├── App.tsx
└── main.tsx
```

## Firestore Collections

| Collection | Description |
|-----------|-------------|
| `users` | บัญชีพนักงาน (username, passwordHash, role, displayName) |
| `bookings` | การจอง (date, slot, truck, customerName, notes, createdBy) |

## หมายเหตุด้านความปลอดภัย

- รหัสผ่านถูก hash ด้วย bcrypt (10 rounds) ก่อนเก็บลง Firestore — ไม่มี plain text
- Session เก็บใน `sessionStorage` (หายเมื่อปิด tab)
- Firestore rules ปัจจุบัน allow all read/write เนื่องจากใช้ custom auth — เหมาะกับแอปภายในองค์กร
- ถ้าต้องการความปลอดภัยสูงขึ้น: migrate ไปใช้ Firebase Authentication แล้วใช้ `request.auth` ใน rules
