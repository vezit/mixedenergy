import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { useRouter } from 'next/router';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

export default function ManagementPage() {
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadEmails, setThreadEmails] = useState([]);
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

          // Group emails by threadId
          const threadsMap = new Map();

          emailsSnapshot.docs.forEach((doc) => {
            const email = { docId: doc.id, ...doc.data() };
            const threadId = email.threadId || email.messageId;
            if (!threadsMap.has(threadId)) {
              threadsMap.set(threadId, email);
            }
          });

          setEmails(Array.from(threadsMap.values()));
        } catch (error) {
          console.error('Error fetching emails:', error);
        }
      };

      fetchEmails();
    }
  }, [db, loading]);

  useEffect(() => {
    const fetchThreadEmails = async () => {
      if (selectedThread) {
        try {
          const emailsRef = collection(db, 'emails');
          const q = query(
            emailsRef,
            where('threadId', '==', selectedThread.threadId),
            orderBy('receivedAt', 'asc')
          );
          const threadSnapshot = await getDocs(q);
          setThreadEmails(
            threadSnapshot.docs.map((doc) => ({
              docId: doc.id,
              ...doc.data(),
            }))
          );
        } catch (error) {
          console.error('Error fetching thread emails:', error);
        }
      }
    };

    fetchThreadEmails();
  }, [db, selectedThread]);

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
    if (!selectedThread) return;

    const lastEmail = threadEmails[threadEmails.length - 1];

    try {
      // Ensure messageId includes angle brackets
      let inReplyToMessageId = lastEmail.messageId;
      if (!inReplyToMessageId.startsWith('<')) {
        inReplyToMessageId = `<${inReplyToMessageId}>`;
      }

      const response = await fetch('/api/sendEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lastEmail.sender,
          subject: 'Re: ' + lastEmail.subject,
          text: replyContent,
          inReplyToMessageId,
          threadId: lastEmail.threadId,
        }),
      });

      if (response.ok) {
        alert('Reply sent successfully.');
        setReplyContent('');
        // Refresh thread emails
        setSelectedThread(null);
        setThreadEmails([]);
        // Fetch emails again
        const emailsRef = collection(db, 'emails');
        const q = query(emailsRef, orderBy('receivedAt', 'desc'));
        const emailsSnapshot = await getDocs(q);
        const threadsMap = new Map();
        emailsSnapshot.docs.forEach((doc) => {
          const email = { docId: doc.id, ...doc.data() };
          const threadId = email.threadId || email.messageId;
          if (!threadsMap.has(threadId)) {
            threadsMap.set(threadId, email);
          }
        });
        setEmails(Array.from(threadsMap.values()));
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
        // Refresh emails
        setSelectedThread(null);
        setThreadEmails([]);
        // Fetch emails again
        const emailsRef = collection(db, 'emails');
        const q = query(emailsRef, orderBy('receivedAt', 'desc'));
        const emailsSnapshot = await getDocs(q);
        const threadsMap = new Map();
        emailsSnapshot.docs.forEach((doc) => {
          const email = { docId: doc.id, ...doc.data() };
          const threadId = email.threadId || email.messageId;
          if (!threadsMap.has(threadId)) {
            threadsMap.set(threadId, email);
          }
        });
        setEmails(Array.from(threadsMap.values()));
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
          {/* Email Threads List */}
          <div className="w-1/3 border-r overflow-y-auto" style={{ maxHeight: '80vh' }}>
            <h2 className="text-xl font-bold mb-2">Inbox</h2>
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr>
                  <th className="border px-4 py-2 text-left">Subject</th>
                  <th className="border px-4 py-2 text-left">Sender</th>
                  <th className="border px-4 py-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr
                    key={email.threadId}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => setSelectedThread(email)}
                  >
                    <td className="border px-4 py-2 font-semibold">{email.subject}</td>
                    <td className="border px-4 py-2 text-sm">{email.sender}</td>
                    <td className="border px-4 py-2 text-xs text-gray-500">
                      {email.receivedAt.toDate
                        ? email.receivedAt.toDate().toLocaleString()
                        : new Date(email.receivedAt.seconds * 1000).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Email Thread and Reply */}
          <div className="w-2/3 p-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
            {selectedThread ? (
              <div>
                <h2 className="text-xl font-bold mb-2">Conversation</h2>
                {threadEmails.map((email) => (
                  <div key={email.docId} className="mb-4 border-b pb-2">
                    <p className="text-sm text-gray-500">
                      <strong>From:</strong> {email.sender} &nbsp;
                      <strong>To:</strong> {email.recipient} &nbsp;
                      <strong>Date:</strong>{' '}
                      {email.receivedAt.toDate
                        ? email.receivedAt.toDate().toLocaleString()
                        : new Date(email.receivedAt.seconds * 1000).toLocaleString()}
                    </p>
                    <p className="mt-2">{email.bodyPlain}</p>
                  </div>
                ))}

                <h3 className="text-lg font-bold mb-2 mt-4">Reply</h3>
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
              <p>Select an email thread to view its content.</p>
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
