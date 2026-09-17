import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCH-pA-qrmGXor-frOB54nFSL6Fu0UE188',
  authDomain: 'jump-s-report-project.firebaseapp.com',
  projectId: 'jump-s-report-project',
  messagingSenderId: '388453873133',
  appId: '1:388453873133:web:9e08cb189d53951cad23e4',
};

const app = initializeApp(firebaseConfig);
// experimentalAutoDetectLongPolling: บางเครือข่าย/ไฟร์วอลล์บล็อกวิธีเชื่อมต่อ
// ปกติของ Firestore (WebChannel/สตรีมมิง) จนขึ้น "client is offline" ทั้งที่
// อินเทอร์เน็ตใช้ได้ปกติ — ตั้งค่านี้ให้ Firestore ตรวจจับแล้วสลับไปใช้วิธี
// เชื่อมต่อสำรอง (long-polling) ให้เองอัตโนมัติเมื่อจำเป็น
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});


