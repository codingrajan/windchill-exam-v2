// src/services/firebase.ts
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD3DQn88St_z9wuYVwiwBjxC3Y0K3LSVX8",
  authDomain: "windchill-mock-exams.firebaseapp.com",
  projectId: "windchill-mock-exams",
  storageBucket: "windchill-mock-exams.firebasestorage.app",
  messagingSenderId: "971978492228",
  appId: "1:971978492228:web:a9b27813cc55dec40def11",
  measurementId: "G-TNWL8F6TYM"
};
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.firestore();
export const auth = firebase.auth();
export default firebase;