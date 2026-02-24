const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Firebase Admin
let serviceAccount;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim().replace(/\\n/g, '\n').replace(/\\/g, '');
    serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey
    };
} else {
    try {
        serviceAccount = require('./serviceAccountKey.json');
    } catch (e) {
        console.error("❌ No Firebase credentials found.");
        process.exit(1);
    }
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initSettings() {
    const settingsRef = db.collection('system').doc('settings');
    const doc = await settingsRef.get();

    if (!doc.exists) {
        console.log("🚀 Initializing Global Settings...");
        await settingsRef.set({
            trialLimitMinutes: 5,
            maintenanceMode: false,
            globalPrompt: "Respond with love and care. Use 'yaar' and 'bhai' often. Stay emotionally intelligent.",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("✅ Settings Initialized.");
    } else {
        console.log("ℹ️ Settings already exist.");
    }
    process.exit();
}

initSettings().catch(console.error);
