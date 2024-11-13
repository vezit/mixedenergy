// /pages/api/cron/deleteOldSessions.js

import { db } from '../../../lib/firebaseAdmin';
import { addDays } from 'date-fns';

export default async function handler(req, res) {
  try {
    // Optional: Implement a simple security check
    const authToken = req.headers['x-cron-auth'];
    if (authToken !== process.env.CRON_AUTH_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Calculate the timestamp for sessions older than 8 days
    const eightDaysAgo = addDays(new Date(), -1);

    // Query sessions older than 8 days
    const oldSessionsSnapshot = await db
      .collection('sessions')
      .where('_createdAt', '<', eightDaysAgo)
      .get();

    if (oldSessionsSnapshot.empty) {
      console.log('No old sessions to delete.');
      return res.status(200).json({ message: 'No old sessions to delete.' });
    }

    const batch = db.batch();

    oldSessionsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.log(`Deleted ${oldSessionsSnapshot.size} old sessions.`);
    res.status(200).json({ message: `Deleted ${oldSessionsSnapshot.size} old sessions.` });
  } catch (error) {
    console.error('Error deleting old sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
