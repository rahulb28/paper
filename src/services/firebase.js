import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import {
  getFirestore, doc, setDoc, getDoc, getDocs, deleteDoc, query,
  collection, where, orderBy, serverTimestamp, onSnapshot, addDoc
} from 'firebase/firestore'
import { nanoid } from './nanoid'

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const configured = Object.values(firebaseConfig).every(Boolean)
const app = configured ? initializeApp(firebaseConfig) : null
export const auth = app ? getAuth(app) : null
export const db = app ? getFirestore(app) : null

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export async function signOut() {
  return fbSignOut(auth)
}

export async function createDoc(uid, { title = 'Untitled', content = null, type = 'doc', date = null } = {}) {
  const id = nanoid()
  const ref = doc(db, 'users', uid, 'docs', id)
  await setDoc(ref, {
    id, title, content, type, date,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    uid,
    shareToken: null,
    shareEditable: false,
  })
  return id
}

export async function saveDoc(uid, id, data) {
  const ref = doc(db, 'users', uid, 'docs', id)
  await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function getDocById(uid, id) {
  const ref = doc(db, 'users', uid, 'docs', id)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function deleteDocById(uid, id) {
  await deleteDoc(doc(db, 'users', uid, 'docs', id))
}

export function subscribeDocs(uid, callback) {
  const q = query(
    collection(db, 'users', uid, 'docs'),
    orderBy('updatedAt', 'desc')
  )
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data()))
  })
}

export async function enableSharing(uid, docId, editable = false) {
  const token = nanoid(12)
  await saveDoc(uid, docId, { shareToken: token, shareEditable: editable })
  // Write to shares collection for lookup
  await setDoc(doc(db, 'shares', token), { uid, docId, editable, createdAt: serverTimestamp() })
  return token
}

export async function getSharedDoc(token) {
  const shareSnap = await getDoc(doc(db, 'shares', token))
  if (!shareSnap.exists()) return null
  const { uid, docId, editable } = shareSnap.data()
  const docSnap = await getDoc(doc(db, 'users', uid, 'docs', docId))
  if (!docSnap.exists()) return null
  return { ...docSnap.data(), editable, uid, docId }
}

export async function saveSectionByToken(token, content) {
  const shareSnap = await getDoc(doc(db, 'shares', token))
  if (!shareSnap.exists()) throw new Error('Not found')
  const { uid, docId, editable } = shareSnap.data()
  if (!editable) throw new Error('Read-only')
  await saveDoc(uid, docId, { content })
}
