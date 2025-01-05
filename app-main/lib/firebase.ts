// lib/firebase.ts

import { 
    initializeApp, 
    getApps, 
    getApp, 
    FirebaseApp, 
    FirebaseOptions 
  } from 'firebase/app';
  import { 
    getFirestore, 
    Firestore 
  } from 'firebase/firestore';
  import { 
    getAuth, 
    Auth 
  } from 'firebase/auth'; // Import Firebase Authentication
  
  // Setup the config using FirebaseOptions
  const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
  
  let firebaseApp: FirebaseApp;
  
  // Initialize the Firebase App only if none have been initialized yet
  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  
  // Initialize Firebase services
  const db: Firestore = getFirestore(firebaseApp);
  const auth: Auth = getAuth(firebaseApp);
  
  // Export the initialized Firebase app, Firestore instance, and Auth instance
  export { firebaseApp, db, auth };
  