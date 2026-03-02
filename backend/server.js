const dotenv = require('dotenv');
const path = require('path');

// Initialize environment
dotenv.config();

console.log("🎬 [NYRA] SYSTEM STARTING...");

const express = require('express');
const cors = require('cors');
const admin = require('./services/firebase');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const PORT = process.env.PORT || 5001;
const db = admin.firestore();

// Auth Middleware (Stub for now)
const authenticate = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) return res.status(401).send('Unauthorized');
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        res.status(401).send('Unauthorized');
    }
};

// Routes
app.get('/', (req, res) => res.send('NYRA Backend is running. v1.3.5 (Soul Restored) ✅'));

const chatRoutes = require('./routes/chat');
app.use('/api/chat', authenticate, chatRoutes);

const memoryRoutes = require('./routes/memory');
app.use('/api/memory', authenticate, memoryRoutes);

const ttsRoutes = require('./routes/tts');
app.use('/api/tts', authenticate, ttsRoutes);

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NYRA Backend listening on Port ${PORT}`);
});
