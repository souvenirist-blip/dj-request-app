import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCch3SuQC8x9NjPwJpMUwJ_Ot4YwYalaQo",
  authDomain: "dj-request-54818.firebaseapp.com",
  projectId: "dj-request-54818",
  storageBucket: "dj-request-54818.firebasestorage.app",
  messagingSenderId: "427543368134",
  appId: "1:427543368134:web:603ab2782cbd35cd4b62c7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

