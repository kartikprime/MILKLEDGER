import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, query, where, doc, writeBatch, orderBy } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Collection References
const usersCol = collection(db, "users");
const customersCol = collection(db, "customers");
const entriesCol = collection(db, "milkEntries");

// ─── USER / AUTH Functions ────────────────────────────────
let _initDone = false;
export const initDb = async () => {
  if (_initDone) return;
  _initDone = true;
  try {
    const adminQ = query(usersCol, where("pin", "==", "4935"));
    const adminSnap = await getDocs(adminQ);
    if (adminSnap.empty) {
      await addDoc(usersCol, { pin: "4935", role: "admin", name: "Admin" });
    }
    const userQ = query(usersCol, where("pin", "==", "1234"));
    const userSnap = await getDocs(userQ);
    if (userSnap.empty) {
      await addDoc(usersCol, { pin: "1234", role: "user", name: "Default Member" });
    }
  } catch (err) {
    console.error("initDb error (Firestore may need security rules):", err);
    _initDone = false; // allow retry on next load
  }
};

export const loginWithPin = async (pin) => {
  const q = query(usersCol, where("pin", "==", pin));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
};

export const getAllUsers = async () => {
  const snap = await getDocs(usersCol);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addUser = async (data) => {
  // Check uniqueness of PIN
  const q = query(usersCol, where("pin", "==", data.pin));
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error("PIN already exists");
  const ref = await addDoc(usersCol, { ...data, role: data.role || "user" });
  return ref.id;
};

export const updateUser = async (id, data) => {
  // If PIN is changing, check uniqueness
  if (data.pin) {
    const q = query(usersCol, where("pin", "==", data.pin));
    const snap = await getDocs(q);
    const existing = snap.docs.find(d => d.id !== id);
    if (existing) throw new Error("PIN already in use by another user");
  }
  await updateDoc(doc(db, "users", id), data);
};

export const deleteUser = async (id) => {
  await deleteDoc(doc(db, "users", id));
};

// ─── CUSTOMER Functions ──────────────────────────────────
export const getCustomers = async () => {
  const q = query(customersCol, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addCustomer = async (data) => {
  const ref = await addDoc(customersCol, { ...data, createdAt: Date.now() });
  return ref.id;
};

export const updateCustomer = async (id, data) => {
  await updateDoc(doc(db, "customers", id), data);
};

export const deleteCustomer = async (id) => {
  await deleteDoc(doc(db, "customers", id));
  // Also delete all entries for this customer
  const q = query(entriesCol, where("customerId", "==", id));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
};

export const getCustomerById = async (id) => {
  const { getDoc: getDocSnap } = await import("firebase/firestore");
  const snap = await getDocSnap(doc(db, "customers", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ─── MILK ENTRIES Functions ──────────────────────────────
export const loadEntries = async (customerId, cycleId, month, year) => {
  const q = query(
    entriesCol,
    where("customerId", "==", customerId),
    where("cycleId", "==", cycleId),
    where("month", "==", month),
    where("year", "==", year)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const loadAllCycleEntries = async (customerId, month, year) => {
  const q = query(
    entriesCol,
    where("customerId", "==", customerId),
    where("month", "==", month),
    where("year", "==", year)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const saveEntry = async (entryData) => {
  if (entryData.id) {
    const entryId = entryData.id;
    const { id, ...rest } = entryData;
    await updateDoc(doc(db, "milkEntries", entryId), rest);
    return entryId;
  } else {
    const ref = await addDoc(entriesCol, entryData);
    return ref.id;
  }
};

// ─── RECALCULATE ALL ENTRIES for a customer (when rate/fat changes) ───
export const recalcAllEntries = async (customerId, newRate, newFixedFat) => {
  const q = query(entriesCol, where("customerId", "==", customerId));
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    const data = d.data();
    const weight = parseFloat(data.weight);
    const fat = parseFloat(data.fat);
    if (!weight || isNaN(weight) || !fat || isNaN(fat)) return;
    const inOutWeight = (fat - newFixedFat) * 0.015 * weight;
    const finalWeight = weight + inOutWeight;
    const amount = finalWeight * newRate;
    batch.update(d.ref, { inOutWeight, finalWeight, amount });
  });
  await batch.commit();
};
