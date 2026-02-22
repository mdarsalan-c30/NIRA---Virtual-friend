const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const path = require('path');

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin using the JSON file (most reliable method)
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://nira---virtual-friend-default-rtdb.asia-southeast1.firebasedatabase.app"
});

console.log("✅ Firebase Admin initialized successfully.");

const db = admin.firestore();

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('NIRA Backend is running. ✅');
});

// Auth Middleware
const authenticate = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
        return res.status(401).send('Unauthorized');
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Auth error:", error);
        res.status(401).send('Unauthorized');
    }
};

// Routes
const chatRoutes = require('./routes/chat');
app.use('/api/chat', authenticate, chatRoutes);

const memoryRoutes = require('./routes/memory');
app.use('/api/memory', authenticate, memoryRoutes);

app.listen(PORT, () => {
    console.log(`🚀 NIRA Backend running on port ${PORT}`);
});
