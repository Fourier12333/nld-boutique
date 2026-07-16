import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Remplace ces valeurs par celles de TON projet Firebase.
// Console Firebase → Paramètres du projet → Tes applications → Config SDK
const firebaseConfig = {
  apiKey: "AIzaSyC6jyMD6vxSUlKoJsY0QJrCrkW7KVAkB-M",
  authDomain: "nld-boutique.firebaseapp.com",
  projectId: "nld-boutique",
  storageBucket: "nld-boutique.firebasestorage.app",
  messagingSenderId: "331314995216",
  appId: "1:331314995216:web:2fec651b08f5fcd6f1aa95",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
