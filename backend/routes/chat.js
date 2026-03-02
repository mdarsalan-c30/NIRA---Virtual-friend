const express = require('express');
const router = express.Router();
const admin = require('../services/firebase');
const { getChatResponse, getProactiveGreeting } = require('../services/gemini');
const memoryService = require('../services/MemoryService');

const db = admin.firestore();

router.post('/', async (req, res) => {
    const { message, image } = req.body;
    const userId = req.user.uid;

    if (!message) {
        return res.status(400).send('Message is required');
    }

    try {
        const profileRef = db.collection('users').doc(userId);
        const [settingsDoc, profileDoc, emotionalDoc, longTermSnapshot, conversationsSnapshot, stats] = await Promise.all([
            db.collection('system').doc('settings').get(),
            profileRef.get(),
            profileRef.collection('emotionalState').doc('current').get(),
            profileRef.collection('longTermMemory').orderBy('timestamp', 'desc').limit(10).get().catch(() => ({ docs: [] })),
            profileRef.collection('conversations').orderBy('timestamp', 'desc').limit(10).get().catch(() => ({ docs: [] })),
            memoryService.getFriendshipStats(userId)
        ]);

        const globalSettings = settingsDoc.exists ? settingsDoc.data() : { trialLimitMinutes: 60 };
        const userData = profileDoc.exists ? profileDoc.data() : {};

        const memory = {
            identity: userData,
            emotionalState: emotionalDoc.exists ? emotionalDoc.data() : {},
            longTerm: longTermSnapshot.docs.map(doc => doc.data().summary).filter(Boolean),
            recentMessages: conversationsSnapshot.docs.map(doc => doc.data()).reverse(),
            stats
        };

        const aiResponse = await getChatResponse(message, memory, image, globalSettings);

        // Basic logging
        const batch = db.batch();
        const userMsgRef = profileRef.collection('conversations').doc();
        batch.set(userMsgRef, {
            role: 'user',
            content: message,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        const aiMsgRef = profileRef.collection('conversations').doc();
        batch.set(aiMsgRef, {
            role: 'model',
            content: aiResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        res.json({ response: aiResponse });

    } catch (error) {
        console.error("Chat route error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

router.get('/proactive', async (req, res) => {
    const userId = req.user.uid;
    try {
        const profileRef = db.collection('users').doc(userId);
        const [profileDoc, longTermSnapshot, stats] = await Promise.all([
            profileRef.get(),
            profileRef.collection('longTermMemory').orderBy('timestamp', 'desc').limit(10).get().catch(() => ({ docs: [] })),
            memoryService.getFriendshipStats(userId)
        ]);

        const memory = {
            identity: profileDoc.exists ? profileDoc.data() : {},
            longTerm: longTermSnapshot.docs.map(doc => doc.data().summary).filter(Boolean),
            stats
        };

        const greeting = await getProactiveGreeting(memory);
        res.json({ response: greeting });
    } catch (error) {
        console.error("Proactive route error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
