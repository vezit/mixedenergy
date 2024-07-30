// testConnection.js
import { db } from './firebase.js';
import { collection, addDoc } from 'firebase/firestore';

const testConnection = async () => {
  try {
    await addDoc(collection(db, "testCollection"), {
      message: "Hello, world!"
    });
    console.log("Document successfully written!");
  } catch (e) {
    console.error("Error adding document: ", e);
  }
};

testConnection();