const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// Get full memory (Profile + Emotional State + Recent Messages)
router.get('/', async (req, res) => {
    const userId = req.user.uid;

    try {
        const profileRef = db.collection('users').doc(userId);
        const [profileDoc, emotionalDoc, longTermSnapshot, conversationsSnapshot] = await Promise.all([
            profileRef.get(),
            profileRef.collection('emotionalState').doc('current').get(),
            profileRef.collection('longTermMemory').orderBy('timestamp', 'desc').limit(10).get(),
            profileRef.collection('conversations').orderBy('timestamp', 'desc').limit(20).get()
        ]);

        const profileData = profileDoc.data() || {};
        const firstSeen = profileData.createdAt?.toDate() || new Date();
        const diffDays = Math.ceil(Math.abs(new Date() - firstSeen) / (1000 * 60 * 60 * 24));

        res.json({
            profile: profileData,
            emotionalState: emotionalDoc.data() || {},
            longTerm: longTermSnapshot.docs.map(doc => doc.data().summary),
            conversations: conversationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse(),
            stats: {
                days: diffDays,
                interactions: profileData.totalInteractions || 0
            }
        });
    } catch (error) {
        console.error("Memory fetch error:", error);
        res.status(500).send('Internal Server Error');
    }
});

// Update Identity Memory
router.post('/update-identity', async (req, res) => {
    const userId = req.user.uid;
    const profileData = req.body;

    try {
        await db.collection('users').doc(userId).set(profileData, { merge: true });
        res.json({ success: true, message: 'Identity updated' });
    } catch (error) {
        console.error("Identity update error:", error);
        res.status(500).send('Internal Server Error');
    }
});

// Summarize Memory (Manual trigger or internal call)
router.post('/summarize', async (req, res) => {
    const userId = req.user.uid;
    // Implementation for long-term summarization would go here
    // Fetch last N messages -> Ask Gemini to summarize -> Save to longTermMemory collection
    res.json({ success: true, message: 'Summarization triggered' });
});

module.exports = router;
