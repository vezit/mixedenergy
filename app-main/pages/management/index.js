// /pages/management/index.js

// ... existing imports ...
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
  limit,
  startAfter,
  endBefore,
} from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';
import Modal from '../../components/Modal';

export default function ManagementPage() {
  // ... existing state variables ...
  const [currentView, setCurrentView] = useState('inbox'); // 'inbox' or 'sent'

  // ... existing useEffect hooks ...

  useEffect(() => {
    if (!loading) {
      fetchEmails();
    }
  }, [loading, currentView]);

  const fetchEmails = async (direction = 'initial', cursor = null) => {
    try {
      let emailsRef = collection(db, 'emails');
      let q;

      if (searchQuery.trim() !== '') {
        const field = currentView === 'inbox' ? 'recipient' : 'sender';
        q = query(
          emailsRef,
          where(field, '==', 'info@mixedenergy.dk'),
          where('subject', '>=', searchQuery),
          where('subject', '<=', searchQuery + '\uf8ff'),
          orderBy('subject'),
          limit(20)
        );
      } else {
        const field = currentView === 'inbox' ? 'recipient' : 'sender';
        q = query(
          emailsRef,
          where(field, '==', 'info@mixedenergy.dk'),
          orderBy('receivedAt', 'desc'),
          limit(20)
        );

        if (direction === 'next' && cursor) {
          q = query(
            emailsRef,
            where(field, '==', 'info@mixedenergy.dk'),
            orderBy('receivedAt', 'desc'),
            startAfter(cursor),
            limit(20)
          );
        } else if (direction === 'prev' && cursor) {
          q = query(
            emailsRef,
            where(field, '==', 'info@mixedenergy.dk'),
            orderBy('receivedAt', 'desc'),
            endBefore(cursor),
            limit(20)
          );
        }
      }

      const emailsSnapshot = await getDocs(q);

      if (emailsSnapshot.empty) {
        if (direction === 'next') {
          setNoMoreOlderEmails(true);
        } else if (direction === 'prev') {
          setNoMoreNewerEmails(true);
        }
        return;
      } else {
        setNoMoreOlderEmails(false);
        setNoMoreNewerEmails(false);
      }

      // Update pagination cursors
      const first = emailsSnapshot.docs[0];
      const last = emailsSnapshot.docs[emailsSnapshot.docs.length - 1];
      setFirstVisible(first);
      setLastVisible(last);

      // Group emails by threadId
      const threadsMap = new Map();
      const uniqueEmails = new Set();

      emailsSnapshot.docs.forEach((doc) => {
        const email = { docId: doc.id, ...doc.data() };
        const threadId = email.threadId || email.messageId;
        if (!threadsMap.has(threadId)) {
          threadsMap.set(threadId, email);
        }
        const otherPartyEmail =
          currentView === 'inbox' ? email.sender : email.recipient;
        uniqueEmails.add(otherPartyEmail);
      });

      setEmails(Array.from(threadsMap.values()));
      setSenderEmails(Array.from(uniqueEmails));
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  // ... existing code ...

  const handleReply = async () => {
    if (!selectedThread) return;

    const lastEmail = threadEmails[threadEmails.length - 1];

    try {
      console.log('Sending reply to:', lastEmail.sender);
      console.log('Reply content:', replyContent);

      const inReplyToMessageId = lastEmail.messageId;

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

      const data = await response.json();

      if (response.ok) {
        alert('Reply sent successfully.');
        setReplyContent('');
        closeModal();
        // Refresh emails
        fetchEmails();
      } else {
        console.error('Error sending email:', data);
        alert(`Error sending email: ${data.message}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error sending email.');
    }
  };

  // ... existing code ...

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Management Panel</h1>
        <div>
          <button
            onClick={() => setCurrentView(currentView === 'inbox' ? 'sent' : 'inbox')}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Switch to {currentView === 'inbox' ? 'Sent' : 'Inbox'}
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Rest of the component */}

      {/* Search Field */}
      <form onSubmit={handleSearchSubmit} className="mb-4">
        <input
          type="text"
          placeholder="Search by subject"
          value={searchQuery}
          onChange={handleSearch}
          className="border p-2 w-full"
        />
      </form>

      {/* Email List */}
      <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
        <h2 className="text-xl font-bold mb-2">
          {currentView === 'inbox' ? 'Inbox' : 'Sent Emails'}
        </h2>
        <table className="min-w-full table-auto border-collapse">
          <thead>
            <tr>
              <th className="border px-4 py-2 text-left">Subject</th>
              <th className="border px-4 py-2 text-left">
                {currentView === 'inbox' ? 'Sender' : 'Recipient'}
              </th>
              <th className="border px-4 py-2 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {emails.map((email) => (
              <tr
                key={email.threadId}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSelectedThread(email);
                  setIsModalOpen(true);
                }}
              >
                <td className="border px-4 py-2 font-semibold">
                  {email.subject}
                </td>
                <td className="border px-4 py-2 text-sm">
                  {currentView === 'inbox' ? email.sender : email.recipient}
                </td>
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

      {/* Pagination */}
      <div className="flex justify-center mt-4">
        {!noMoreNewerEmails && (
          <button
            onClick={() => fetchEmails('prev', firstVisible)}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2"
          >
            &larr; Newer
          </button>
        )}
        {!noMoreOlderEmails && (
          <button
            onClick={() => fetchEmails('next', lastVisible)}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded"
          >
            Older &rarr;
          </button>
        )}
      </div>

      {/* Compose New Email */}
      {/* ... existing compose email code ... */}

      {/* Modal for Conversation */}
      {/* ... existing modal code ... */}
    </div>
  );
}
