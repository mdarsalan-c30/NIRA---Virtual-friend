const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

function getFirebaseAdmin() {
    if (admin.apps.length > 0) return admin.app();

    console.log("🚀 [NYRA] Initializing Firebase Admin SDK...");

    // Primary: serviceAccountKey.json
    const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
        try {
            const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(key),
                databaseURL: `https://${key.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
            });
            console.log("✅ Firebase Admin: Authenticated via serviceAccountKey.json");
            return admin;
        } catch (e) {
            console.error("❌ Firebase Admin: JSON init failed:", e.message);
        }
    }

    // Fallback: Environment Variables (Super Robust version for Render)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
        try {
            let pk = process.env.FIREBASE_PRIVATE_KEY.trim();

            // 1. Detect and Decode Base64 (The Gold Standard for Cloud Env Vars)
            if (!pk.includes('-----BEGIN') && !pk.includes('\n') && pk.length > 500) {
                console.log("📦 Firebase Admin: Base64 key detected, decoding...");
                pk = Buffer.from(pk, 'base64').toString('utf8');
            }

            // 2. Remove wrapping quotes if they exist (common paste error)
            pk = pk.replace(/^["']|["']$/g, '');

            // 3. Handle escaped newlines (e.g. literal "\n" strings)
            pk = pk.replace(/\\n/g, '\n');

            // 4. Ensure it looks like a PEM (headers/footers + newlines)
            if (!pk.includes('-----BEGIN PRIVATE KEY-----')) {
                pk = `-----BEGIN PRIVATE KEY-----\n${pk}`;
            }
            if (!pk.includes('-----END PRIVATE KEY-----')) {
                pk = `${pk}\n-----END PRIVATE KEY-----`;
            }

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: pk
                }),
                databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.asia-southeast1.firebasedatabase.app`
            });
            console.log("✅ Firebase Admin: Authenticated via Environment Variables");
            return admin;
        } catch (e) {
            console.error("❌ Firebase Admin: Env init failed:", e.message);
        }
    }

    console.error("❌ Firebase Admin: No valid credentials found.");
    return admin;
}

module.exports = getFirebaseAdmin();
