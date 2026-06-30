# คู่มือตั้งค่า Firebase + GitHub ก่อน Deploy

---

## ส่วนที่ 1 — สร้าง Firebase Project

### ขั้นตอนที่ 1: เข้า Firebase Console

1. เปิดเบราว์เซอร์ ไปที่ **https://console.firebase.google.com**
2. Sign in ด้วย Google account
3. คลิก **"Add project"** (หรือ "Create a project")

### ขั้นตอนที่ 2: ตั้งชื่อโปรเจกต์

1. ตั้งชื่อว่า `truck-booking-gsp` (หรืออะไรก็ได้)
2. คลิก **Continue**
3. หน้า Google Analytics — ปิดได้เลย (toggle off) แล้วคลิก **Create project**
4. รอสักครู่ จากนั้นคลิก **Continue**

---

### ขั้นตอนที่ 3: เปิดใช้ Firestore Database

1. เมนูซ้าย → คลิก **"Firestore Database"**
2. คลิก **"Create database"**
3. เลือก **"Start in production mode"** → คลิก Next
4. เลือก location: **`asia-southeast1`** (Singapore — ใกล้ไทยสุด)
5. คลิก **"Enable"** รอสักครู่

---

### ขั้นตอนที่ 4: ตั้งค่า Firestore Rules

1. ใน Firestore → คลิก tab **"Rules"**
2. ลบโค้ดเดิมออกทั้งหมด แล้ว paste โค้ดนี้แทน:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. คลิก **"Publish"**

---

### ขั้นตอนที่ 5: ลงทะเบียน Web App และ copy config

1. เมนูซ้ายบน → คลิกไอคอน **⚙️ (Settings)** → **"Project settings"**
2. เลื่อนลงไปที่ **"Your apps"** → คลิกไอคอน **`</>`** (Web)
3. ตั้งชื่อ App nickname: `truck-booking-web`
4. **อย่าติ๊ก** Firebase Hosting
5. คลิก **"Register app"**
6. จะเห็น code แบบนี้:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "truck-booking-gsp.firebaseapp.com",
  projectId: "truck-booking-gsp",
  storageBucket: "truck-booking-gsp.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

7. คลิก **"Continue to console"**

---

### ขั้นตอนที่ 6: สร้างไฟล์ .env.local

เปิด Terminal ใน folder `truck-booking` แล้วรัน:

```bash
cp .env.example .env.local
```

จากนั้นเปิดไฟล์ `.env.local` แล้วแทนค่าด้วยของจริง:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=truck-booking-gsp.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=truck-booking-gsp
VITE_FIREBASE_STORAGE_BUCKET=truck-booking-gsp.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

> ⚠️ ไม่ต้องมีเครื่องหมาย `"` รอบค่า — แค่ตัวค่าเปล่าๆ

---

### ขั้นตอนที่ 7: สร้างบัญชีแอดมินคนแรก

สร้างไฟล์ `scripts/seed-admin.mjs`:

```bash
mkdir scripts
```

สร้างไฟล์ `scripts/seed-admin.mjs` แล้วใส่โค้ดนี้:

```js
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

const db = getFirestore(app)

// แก้ username และ password ตรงนี้
const ADMIN_USERNAME = 'admin'
const ADMIN_DISPLAY_NAME = 'แอดมิน'
const ADMIN_PASSWORD = 'ใส่รหัสผ่านที่นี่'  // ← แก้ตรงนี้

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
```

ติดตั้ง dotenv ก่อน แล้วรัน:

```bash
npm install dotenv --save-dev
node scripts/seed-admin.mjs
```

ถ้าขึ้น `✅ สร้างบัญชี admin...` แปลว่าสำเร็จ ตรวจสอบได้ที่ Firestore Console → collection `users`

---

### ขั้นตอนที่ 8: ทดสอบ dev

```bash
npm run dev
```

เปิด http://localhost:5173 — ควรเข้าสู่ระบบได้ด้วย username/password ที่สร้างไว้

---

---

## ส่วนที่ 2 — สร้าง GitHub Repository

### ขั้นตอนที่ 1: ตรวจสอบว่ามี Git และ GitHub CLI

```bash
git --version
gh --version
```

ถ้าไม่มี `gh` ให้ติดตั้ง GitHub CLI:

```bash
# macOS
brew install gh

# จากนั้น login
gh auth login
```

ทำตามขั้นตอนบนหน้าจอ: เลือก GitHub.com → HTTPS → Login with a web browser

---

### ขั้นตอนที่ 2: เริ่ม Git ใน folder โปรเจกต์

```bash
cd /path/to/truck-booking   # เปลี่ยนเป็น path จริงของ folder

git init
git add .
git commit -m "feat: initial truck booking system"
```

---

### ขั้นตอนที่ 3: สร้าง repo บน GitHub และ push

```bash
gh repo create oakleyza/truck-booking --public --source=. --push
```

คำสั่งนี้จะ:
- สร้าง repo ชื่อ `truck-booking` ใน account `oakleyza`
- ตั้งค่า remote origin
- push code ขึ้นไปทันที

ถ้าต้องการ **private repo** แทน:
```bash
gh repo create oakleyza/truck-booking --private --source=. --push
```

---

### ขั้นตอนที่ 4: ยืนยันว่า push สำเร็จ

```bash
gh repo view oakleyza/truck-booking --web
```

จะเปิดเบราว์เซอร์ไปที่ repo ให้เลย ถ้าเห็นไฟล์ครบแปลว่าสำเร็จ

> ⚠️ ตรวจสอบว่า `.env.local` **ไม่ได้ถูก push** ขึ้นไปด้วย — ไฟล์นี้อยู่ใน `.gitignore` แล้ว

---

---

## ส่วนที่ 3 — Deploy บน Vercel

### ขั้นตอนที่ 1: เข้า Vercel

1. ไปที่ **https://vercel.com**
2. Sign in ด้วย GitHub account เดียวกัน
3. คลิก **"Add New..."** → **"Project"**
4. เลือก repo **`oakleyza/truck-booking`** → คลิก **"Import"**

---

### ขั้นตอนที่ 2: ตั้งค่า Environment Variables

ก่อน Deploy — เลื่อนลงไปที่ **"Environment Variables"** แล้วเพิ่มทีละตัว:

| Name | Value |
|------|-------|
| `VITE_FIREBASE_API_KEY` | ค่าจาก Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | ค่าจาก Firebase |
| `VITE_FIREBASE_PROJECT_ID` | ค่าจาก Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | ค่าจาก Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ค่าจาก Firebase |
| `VITE_FIREBASE_APP_ID` | ค่าจาก Firebase |

> ใส่ค่าเดียวกับที่อยู่ใน `.env.local` ทุกตัว

---

### ขั้นตอนที่ 3: Deploy

1. Framework Preset จะตั้งเป็น **Vite** ให้อัตโนมัติ ไม่ต้องแก้อะไร
2. คลิก **"Deploy"**
3. รอประมาณ 1-2 นาที
4. เมื่อขึ้น **"Congratulations!"** → คลิก URL ที่ได้รับ เช่น `https://truck-booking-oak.vercel.app`

---

### ขั้นตอนที่ 4 (ถ้าจำเป็น): เพิ่ม Authorized Domain ใน Firebase

ถ้า login แล้ว error เรื่อง domain:

1. Firebase Console → **Authentication** (ถ้าใช้) หรือข้ามขั้นตอนนี้ได้ เพราะโปรเจกต์นี้ไม่ได้ใช้ Firebase Auth

---

## สรุปลำดับขั้นตอนทั้งหมด

```
1. สร้าง Firebase project
2. เปิด Firestore + ตั้ง rules
3. Register web app + copy config
4. สร้าง .env.local
5. รัน seed-admin.mjs → สร้างบัญชีแอดมิน
6. ทดสอบ npm run dev
7. git init + commit
8. gh repo create + push
9. Vercel → import repo → ใส่ env vars → Deploy
```
