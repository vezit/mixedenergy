// /pages/management/index.js

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

export default function ManagementPage() {
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeRecipient, setComposeRecipient] = useState('');
  const [composeContent, setComposeContent] = useState('');

  const router = useRouter();
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/management/login');
      } else if (user.email !== 'management@mixedenergy.dk') {
        router.push('/');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [auth, router]);

  useEffect(() => {
    if (!loading) {
      const fetchEmails = async () => {
        try {
          const emailsRef = collection(db, 'emails');
          const q = query(emailsRef, orderBy('receivedAt', 'desc'));
          const emailsSnapshot = await getDocs(q);
          setEmails(
            emailsSnapshot.docs.map((doc) => ({
              docId: doc.id,
              ...doc.data(),
            }))
          );
        } catch (error) {
          console.error('Error fetching emails:', error);
        }
      };

      fetchEmails();
    }
  }, [db, loading]);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        router.push('/management/login');
      })
      .catch((error) => {
        console.error('Error during logout:', error);
      });
  };

  const handleReply = async () => {
    try {
      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedEmail.sender,
          subject: 'Re: ' + selectedEmail.subject,
          text: replyContent,
        }),
      });

      if (response.ok) {
        alert('Reply sent successfully.');
        setReplyContent('');
      } else {
        const data = await response.json();
        console.error('Error sending email:', data);
        alert('Error sending email.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email.');
    }
  };

  const handleCompose = async () => {
    try {
      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: composeRecipient,
          subject: composeSubject,
          text: composeContent,
        }),
      });

      if (response.ok) {
        alert('Email sent successfully.');
        setComposeRecipient('');
        setComposeSubject('');
        setComposeContent('');
      } else {
        const data = await response.json();
        console.error('Error sending email:', data);
        alert('Error sending email.');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email.');
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Management Panel</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="flex">
          {/* Email List */}
          <div className="w-1/3 border-r overflow-y-auto" style={{ maxHeight: '80vh' }}>
            <h2 className="text-xl font-bold mb-2">Inbox</h2>
            <ul>
              {emails.map((email) => (
                <li
                  key={email.docId}
                  className="border-b p-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => setSelectedEmail(email)}
                >
                  <p className="font-semibold">{email.subject}</p>
                  <p className="text-sm text-gray-600">{email.sender}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(email.receivedAt.seconds * 1000).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Email Detail and Reply */}
          <div className="w-2/3 p-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
            {selectedEmail ? (
              <div>
                <h2 className="text-xl font-bold mb-2">{selectedEmail.subject}</h2>
                <p>
                  <strong>From:</strong> {selectedEmail.sender}
                </p>
                <p>
                  <strong>To:</strong> {selectedEmail.recipient}
                </p>
                <p>
                  <strong>Date:</strong>{' '}
                  {new Date(selectedEmail.receivedAt.seconds * 1000).toLocaleString()}
                </p>
                <hr className="my-2" />
                <p>{selectedEmail.bodyPlain}</p>
                <hr className="my-2" />
                <h3 className="text-lg font-bold mb-2">Reply</h3>
                <textarea
                  className="w-full border p-2"
                  rows="5"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                ></textarea>
                <button
                  onClick={handleReply}
                  className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                >
                  Send Reply
                </button>
              </div>
            ) : (
              <p>Select an email to view its content.</p>
            )}
          </div>
        </div>
      )}

      {/* Compose New Email */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Compose New Email</h2>
        <input
          type="email"
          placeholder="Recipient"
          value={composeRecipient}
          onChange={(e) => setComposeRecipient(e.target.value)}
          className="w-full border p-2 mb-2"
        />
        <input
          type="text"
          placeholder="Subject"
          value={composeSubject}
          onChange={(e) => setComposeSubject(e.target.value)}
          className="w-full border p-2 mb-2"
        />
        <textarea
          placeholder="Message"
          value={composeContent}
          onChange={(e) => setComposeContent(e.target.value)}
          className="w-full border p-2 mb-2"
          rows="5"
        ></textarea>
        <button
          onClick={handleCompose}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Send Email
        </button>
      </div>
    </div>
  );
}
