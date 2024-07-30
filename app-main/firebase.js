// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Ensure this import is present
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDa85TT8d8ZdWqMoOr7IYwaTFXkmgsCPhs",
  authDomain: "mixedenergy-7d498.firebaseapp.com",
  projectId: "mixedenergy-7d498",
  storageBucket: "mixedenergy-7d498.appspot.com",
  messagingSenderId: "575667819467",
  appId: "1:575667819467:web:af0c0867049ca4659a1c4e",
  measurementId: "G-35FLWQS86M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };