# Jump's Report — รายงานการเดินทาง / รายรับ-จ่าย

เว็บแอปสำหรับทำรายงานการเดินทาง และบัญชีรายรับ-จ่าย (เงินสำรองจ่าย) ไม่มีระบบ login
(ใช้คนเดียว) เก็บข้อมูลบน Firebase (Firestore เท่านั้น — ไม่ใช้ Firebase Storage) และ deploy
ผ่าน Cloudflare Pages เหมือนแอป ST-Dtruss

ฟีเจอร์: แดชบอร์ดสรุปยอด, รายงานการเดินทางพร้อมพิมพ์/ดาวน์โหลด (แนบรูปได้ — รูปถูกเก็บฝังไว้
ในเอกสารโดยตรง ไม่ใช้ที่เก็บไฟล์แยก), บันทึกรายรับ-จ่ายเป็นเบิก/รับพร้อมคำนวณยอดคงเหลืออัตโนมัติ,
ตารางรายงานกรองตามวันที่/ประเภทงาน + ดาวน์โหลด Excel, ซิงค์รายการจาก Google Sheet (แถวที่เพิ่ม
ต่อท้าย) หรือนำเข้าไฟล์ CSV/Excel ด้วยตนเอง

ไม่มีฟีเจอร์ AI อ่านค่าจากรูปอัตโนมัติ (ตัดออกตามที่ตกลงกันไว้) — กรอกข้อมูลเองทุกช่อง

**หมายเหตุเรื่องรูปภาพ**: เนื่องจากไม่ได้ใช้ Firebase Storage (ซึ่งต้องอัปเกรดเป็นแพ็กเกจ Blaze
และจ่ายเงินมัดจำ) รูปในรายงานการเดินทางจะถูกบีบอัดให้เล็กและฝังตรงเข้าไปในเอกสาร Firestore แทน
Firestore จำกัดขนาดไว้ที่ 1MB ต่อเอกสาร ถ้าแนบรูปเยอะ/ใหญ่เกินไปแอปจะแจ้งเตือนให้ลบบางรูปออกก่อน
บันทึก — ถ้าในอนาคตอยากได้คุณภาพรูปที่สูงขึ้นและไม่จำกัดขนาด ค่อยพิจารณาเปิดใช้ Firebase Storage
เพิ่มทีหลังได้ (ต้องอัปเกรดเป็น Blaze plan)

## 1) สร้าง Firebase project ใหม่

1. ไปที่ https://console.firebase.google.com → Add project → ตั้งชื่อโปรเจกต์ (แยกจาก ST-Dtruss)
2. ในเมนูซ้าย เปิดใช้ **Firestore Database** → Create database → เลือกโหมด "Production" (rules
   ด้านล่างจะ override เอง) → เลือก location ที่ใกล้ (เช่น asia-southeast1) — **ไม่ต้องเปิด Storage**
3. ไปที่ Project settings (รูปเฟือง) → General → เลื่อนลงหา "Your apps" → กด ไอคอนเว็บ `</>`
   → ตั้งชื่อแอป → จะได้ config object หน้าตาแบบนี้:
   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   คัดลอกค่าจริงมาแทนที่ใน `src/firebase.js` (มี placeholder `YOUR_...` รอไว้ให้แล้ว)

4. ตั้งค่า Security Rules (สำคัญ — ไม่มี login เลย ต้องเปิด rules ให้อ่าน/เขียนได้เอง):
   - Firestore → Rules tab → คัดลอกเนื้อหาจากไฟล์ `firestore.rules` ในโปรเจกต์นี้ไปวางแทน → Publish
   - **ข้อควรระวัง**: rules แบบนี้เปิดให้ใครก็ตามที่รู้ config ของเว็บอ่าน/เขียนข้อมูลได้ เหมาะกับ
     เครื่องมือใช้ภายในที่ไม่เผยแพร่ลิงก์แบบสาธารณะเท่านั้น

## 2) รันดูในเครื่องตัวเอง (ไม่บังคับ แต่แนะนำให้ลองก่อน deploy)

```bash
npm install
npm run dev
```
เปิด http://localhost:5173 เพื่อทดสอบ

## 3) Deploy ขึ้น Cloudflare Pages

1. ไปที่ https://dash.cloudflare.com → Workers & Pages → Create → Pages → เชื่อมกับ GitHub repo
   ของโปรเจกต์นี้ (push โค้ดขึ้น GitHub ก่อน) หรือใช้ "Direct Upload" ก็ได้ถ้าไม่อยากใช้ GitHub
2. ตั้งค่า Build:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
3. กด Deploy รอสักครู่ จะได้ลิงก์ `https://<ชื่อโปรเจกต์>.pages.dev` มาใช้งานได้เลย

ไม่ต้องตั้งค่า environment variable ใดๆ เพิ่มเติม (ไม่มี API key ที่ต้องซ่อนฝั่งเซิร์ฟเวอร์ในเวอร์ชันนี้
เพราะตัด AI Vision ออกแล้ว) และไม่ต้องมีบัญชี Blaze/บัตรเครดิตผูกกับ Firebase เลย

## 4) ตั้งค่าชีตที่ใช้ซิงค์ (แก้ได้ทีหลัง)

ลิงก์ Google Sheet ที่ใช้ซิงค์ถูกกำหนดไว้ใน `src/lib/sheetSync.js` (ตัวแปร `SHEET_CSV_URL`)
ถ้าจะเปลี่ยนไปใช้ชีตอื่น แก้ URL ตรงนี้ได้เลย (ต้องแชร์ชีตเป็น "Anyone with the link" ก่อน)

## โครงสร้างโปรเจกต์

```
src/
  firebase.js          ตั้งค่า Firebase (ใส่ config จริงตรงนี้)
  lib/
    data.js            ฟังก์ชันอ่าน/เขียน Firestore
    format.js          ฟอร์แมตวันที่/เงิน, คำนวณยอดคงเหลือ, บีบอัดรูป, ฯลฯ
    sheetSync.js        ดึง/แปลงข้อมูลจาก Google Sheet
  components/           ชิ้นส่วน UI ที่ใช้ร่วมกัน
  pages/                หน้าแต่ละหน้า (แดชบอร์ด/เดินทาง/รายรับจ่าย/รายงาน)
  App.jsx               โครง sidebar + topbar + สลับหน้า
firestore.rules
```
