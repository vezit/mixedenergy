// pages/addData.js
import { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc } from "firebase/firestore"; 

export default function AddData() {
  const [input, setInput] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, "yourCollectionName"), {
        text: input,
        timestamp: new Date()
      });
      console.log("Document written with ID: ", docRef.id);
      setInput(''); // Clear the input field after successful submission
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  };

  return (
    <div className="container">
      <h1>Add Data</h1>
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          placeholder="Type something" 
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
