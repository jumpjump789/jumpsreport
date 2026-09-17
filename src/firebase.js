import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// TODO: แทนที่ค่าด้านล่างด้วยค่าจริงจาก Firebase Console ของคุณ
// (ไปที่ Project settings > General > Your apps > SDK setup and configuration
//  แล้วเลือก "Config" จะเห็นอ็อบเจกต์นี้พร้อมค่าจริงให้คัดลอกมาแปะได้เลย)
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
