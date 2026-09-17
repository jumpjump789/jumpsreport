import { db } from '../firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc, runTransaction,
} from 'firebase/firestore';

/* ---- generic Firestore helpers ---- */

export async function getAllDocs(colName) {
  const snap = await getDocs(collection(db, colName));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function setDocData(colName, id, data) {
  await setDoc(doc(db, colName, id), data);
}

export async function deleteDocData(colName, id) {
  await deleteDoc(doc(db, colName, id));
}

export async function clearCollection(colName) {
  const snap = await getDocs(collection(db, colName));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export async function getMeta(key) {
  const snap = await getDoc(doc(db, 'meta', key));
  return snap.exists() ? snap.data() : null;
}

export async function setMeta(key, data) {
  await setDoc(doc(db, 'meta', key), data);
}

export async function clearMetaPrefix(prefix) {
  const snap = await getDocs(collection(db, 'meta'));
  await Promise.all(
    snap.docs.filter((d) => d.id.startsWith(prefix)).map((d) => deleteDoc(d.ref))
  );
}

/* ---- travel-report document numbering: DDMMYY + 2-digit running number,
   resetting to 01 every month (based on the travel date) ---- */

function resolveDateKey(travelDate) {
  const d = travelDate ? new Date(travelDate) : new Date();
  const valid = !isNaN(d.getTime()) ? d : new Date();
  const day = String(valid.getDate()).padStart(2, '0');
  const month = String(valid.getMonth() + 1).padStart(2, '0');
  const year = String(valid.getFullYear()).slice(-2);
  return `${day}${month}${year}`;
}
function resolveYearMonth(travelDate) {
  const d = travelDate ? new Date(travelDate) : new Date();
  const valid = !isNaN(d.getTime()) ? d : new Date();
  return `${valid.getFullYear()}${String(valid.getMonth() + 1).padStart(2, '0')}`;
}

export async function getNextDocNumber(travelDate) {
  const yearMonth = resolveYearMonth(travelDate);
  const dateKey = resolveDateKey(travelDate);
  const metaRef = doc(db, 'meta', `counter-${yearMonth}`);
  const next = await runTransaction(db, async (tx) => {
    const snap = await tx.get(metaRef);
    const last = snap.exists() && typeof snap.data().value === 'number' ? snap.data().value : 0;
    const n = last + 1;
    tx.set(metaRef, { value: n });
    return n;
  });
  return `${dateKey} ${String(next).padStart(2, '0')}`;
}
