import { useEffect, useState } from "react";
import { collection, doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase"; // assuming your firebase.js is in the lib folder

export default function Firebasetest() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Fetch the message from Firestore
    const fetchMessage = async () => {
      try {
        const docRef = doc(db, "messages", "J3c82HeokmNyo4pwUDc9"); // replace with your actual document path
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // If the document exists, set the message
          const messageData = docSnap.data();
          setMessage(messageData.Message); // Assuming 'Message' is the field name
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching document:", error);
      }
    };

    fetchMessage();
  }, []);

  return (
    <div>
      <h1>Message from Firestore:</h1>
      <p>{message ? message : "Loading..."}</p>
    </div>
  );
}
