import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCHKoF3XsJi8fCQJ_5v6X9e-UCjG_Xf4Ec",
  authDomain: "tocchi-a389e.firebaseapp.com",
  projectId: "tocchi-a389e",
  storageBucket: "tocchi-a389e.firebasestorage.app",
  messagingSenderId: "196282964032",
  appId: "1:196282964032:web:62862da67de9d4ad5e67a5"
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
