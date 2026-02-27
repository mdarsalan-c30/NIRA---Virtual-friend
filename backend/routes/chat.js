const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { getChatResponse } = require('../services/gemini');
const memoryService = require('../services/MemoryService');

const db = admin.firestore();

router.post('/', async (req, res) => {
    const { message, image } = req.body;
    const userId = req.user.uid;

    if (!message) {
        return res.status(400).send('Message is required');
    }

    try {
        // 1. Fetch user data in parallel
        const profileRef = db.collection('users').doc(userId);

        // 1.5. Fetch Global Settings & User Data in parallel
        const [settingsDoc, profileDoc, emotionalDoc, longTermSnapshot, conversationsSnapshot, stats] = await Promise.all([
            db.collection('system').doc('settings').get(),
            profileRef.get(),
            profileRef.collection('emotionalState').doc('current').get(),
            profileRef.collection('longTermMemory').orderBy('timestamp', 'desc').limit(10).get().catch(() => ({ docs: [] })),
            profileRef.collection('conversations').orderBy('timestamp', 'desc').limit(15).get().catch(() => ({ docs: [] })),
            memoryService.getFriendshipStats(userId)
        ]);

        const globalSettings = settingsDoc.exists ? settingsDoc.data() : { trialLimitMinutes: 5, maintenanceMode: false, globalPrompt: "" };
        const userData = profileDoc.exists ? profileDoc.data() : {};
        const isPro = userData.isPro || false;
        const usedMinutes = userData.usageMinutes || 0;

        // Check if limit exceeded (only for trial users)
        if (!isPro && usedMinutes >= globalSettings.trialLimitMinutes) {
            return res.status(403).json({
                error: 'TRIAL_ENDED',
                message: "Yaar, hamara free trial khatam ho gaya! 🥺 Kya tum mujhe support karke NYRA Pro me upgrade karoge?",
                link: "https://mdarsalan.vercel.app/" // Link to founder for payment/upgrade
            });
        }

        // --- [NAME ONBOARDING LOGIC] ---
        const setupStep = userData.setupStep || 'NEW';

        // Step 1: Force name request if missing
        if (!userData.name && setupStep !== 'AWAITING_NAME') {
            const onboardingMsg = "Namaste! Main NYRA hoon. 😊 Hume dosti toh karni hi hai, par main tumhe kis pyaare naam se bulaun? Batao!";

            // Update Firestore to wait for name
            await profileRef.set({ setupStep: 'AWAITING_NAME' }, { merge: true });

            return res.json({ response: onboardingMsg });
        }

        // Step 2: Capture name from user response
        if (setupStep === 'AWAITING_NAME') {
            const capturedName = message.trim().substring(0, 20); // Limit name length
            const responseAfterName = `Shukriya! Toh ab se tum mere dost "${capturedName}" ho. ✨ Chalo, batao aaj ka din kaisa raha?`;

            // Save name and finish setup
            await profileRef.set({
                name: capturedName,
                setupStep: 'COMPLETE'
            }, { merge: true });

            return res.json({ response: responseAfterName });
        }
        // --- [END ONBOARDING LOGIC] ---

        const memory = {
            identity: userData,
            emotionalState: emotionalDoc.exists ? emotionalDoc.data() : {},
            longTerm: longTermSnapshot.docs.map(doc => doc.data().summary).filter(Boolean),
            recentMessages: conversationsSnapshot.docs.map(doc => doc.data()).reverse(),
            stats
        };

        console.log(`Fetched memory for ${userId}. Used: ${usedMinutes.toFixed(1)} mins. Limit: ${globalSettings.trialLimitMinutes} mins.`);

        // 2. Get Gemini response
        const aiResponse = await getChatResponse(message, memory, image, globalSettings);

        // 3. Save messages in a batch
        const batch = db.batch();
        const userMsgRef = profileRef.collection('conversations').doc();

        // Calculate usage time (delta since last message)
        let timeIncrement = 0;
        const lastMsg = memory.recentMessages[memory.recentMessages.length - 1];
        if (lastMsg && lastMsg.timestamp) {
            const lastTime = lastMsg.timestamp.toDate ? lastMsg.timestamp.toDate().getTime() : new Date(lastMsg.timestamp).getTime();
            const nowTime = Date.now();
            const diffMin = (nowTime - lastTime) / (1000 * 60);

            // Only count if gap is less than 10 mins (active session)
            if (diffMin < 10) {
                timeIncrement = diffMin;
            } else {
                timeIncrement = 0.5; // Flat 30 sec for a new session start
            }
        } else {
            timeIncrement = 0.5; // First message
        }

        batch.set(userMsgRef, {
            role: 'user',
            content: message,
            image: image || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        const aiMsgRef = profileRef.collection('conversations').doc();
        batch.set(aiMsgRef, {
            role: 'model',
            content: aiResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update interaction count, usage time and metadata
        const profileUpdate = {
            totalInteractions: admin.firestore.FieldValue.increment(1),
            usageMinutes: admin.firestore.FieldValue.increment(timeIncrement),
            lastActive: admin.firestore.FieldValue.serverTimestamp()
        };
        // Set createdAt if it doesn't exist (only happens once)
        if (!profileDoc.exists || !profileDoc.data().createdAt) {
            profileUpdate.createdAt = admin.firestore.FieldValue.serverTimestamp();
            profileUpdate.isPro = false; // Default to trial
        }
        batch.set(profileRef, profileUpdate, { merge: true });

        await batch.commit();

        // 4. Return response
        res.json({ response: aiResponse });

        // 5. Fire-and-forget: update emotional state & extract facts
        updateEmotionalState(userId, message, aiResponse);

        // Only extract facts every few messages or if the message is long/significant
        if (memory.recentMessages.length % 5 === 0 || message.length > 40) {
            memoryService.extractFacts(userId, [...memory.recentMessages, { role: 'user', content: message }, { role: 'model', content: aiResponse }]);
        }

    } catch (error) {
        console.error("Chat route error:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

async function updateEmotionalState(userId, userMsg, aiResponse) {
    try {
        const profileRef = db.collection('users').doc(userId);
        const mood = userMsg.length > 50 ? 'reflective' : userMsg.toLowerCase().includes('stress') ? 'stressed' : 'engaged';
        await profileRef.collection('emotionalState').doc('current').set({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            mood,
            energy: 'high'
        }, { merge: true });
    } catch (e) {
        console.error("Emotional state update failed:", e.message);
    }
}

router.get('/proactive', async (req, res) => {
    const userId = req.user.uid;

    try {
        const profileRef = db.collection('users').doc(userId);
        const [profileDoc, longTermSnapshot, stats] = await Promise.all([
            profileRef.get(),
            profileRef.collection('longTermMemory').orderBy('timestamp', 'desc').limit(10).get().catch(() => ({ docs: [] })),
            memoryService.getFriendshipStats(userId)
        ]);

        const userData = profileDoc.exists ? profileDoc.data() : {};

        // Don't greet if setup isn't complete
        if (userData.setupStep === 'AWAITING_NAME' || !userData.name) {
            return res.json({ response: "" });
        }

        const memory = {
            identity: userData,
            longTerm: longTermSnapshot.docs.map(doc => doc.data().summary).filter(Boolean),
            stats
        };

        const { getProactiveGreeting } = require('../services/gemini');
        const greeting = await getProactiveGreeting(memory);

        res.json({ response: greeting });
    } catch (error) {
        console.error("Proactive route error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
