import { useState } from 'react';
import { auth, db } from '../lib/firebase'; // Make sure 'db' is your Firestore instance
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/router';
import { getCookie } from '../lib/cookies'; // Use your existing cookie utility

const LoginForm = ({ redirectPath }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const sessionId = getCookie('cookie_consent_id'); // Get the consent_id from your cookie

      if (!sessionId) {
        throw new Error('No consent_id cookie found.');
      }

      // Check if session already exists in Firestore
      const sessionRef = db.collection('sessions').doc(sessionId);
      const sessionDoc = await sessionRef.get();

      if (sessionDoc.exists) {
        // Update existing session with loggedIn set to true
        await sessionRef.update({
          loggedIn: true,
          updatedAt: new Date(), // Track when the session was updated
        });
      } else {
        // Create a new session document in Firestore
        await sessionRef.set({
          consentId: sessionId,
          loggedIn: true,
          createdAt: new Date(),
          basketItems: [], // Empty basket initially
          customerDetails: {},
        });
      }

      router.push(redirectPath); // Redirect after successful login
    } catch (error) {
      console.error('Error logging in:', error);
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-2 border mb-4 rounded"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-2 border mb-4 rounded"
          />
          <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
