const admin = require('firebase-admin');

class HealthService {
    static async logStatus(serviceName, status, error = null) {
        try {
            const db = admin.firestore();
            const docRef = db.collection('system').doc('api_status');

            const updateDate = new Date().toISOString();
            const data = {
                [serviceName]: {
                    status: status, // 'SUCCESS' or 'ERROR'
                    lastUsed: updateDate,
                    lastError: error ? (error.message || String(error)).substring(0, 500) : null,
                }
            };

            await docRef.set(data, { merge: true });
            console.log(`📡 [Health] Logged ${serviceName} as ${status}`);
        } catch (err) {
            console.error(`❌ [Health] Failed to log status for ${serviceName}:`, err.message);
        }
    }
}

module.exports = HealthService;
