const fs = require('fs');
const path = require('path');

try {
    const keyPath = path.join(__dirname, 'serviceAccountKey.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    const privateKey = keyFile.private_key;

    const base64Key = Buffer.from(privateKey).toString('base64');

    console.log("\n🚀 [GEN-Z TOOL] HERE IS YOUR BASE64 KEY FOR RENDER:");
    console.log("--------------------------------------------------");
    console.log(base64Key);
    console.log("--------------------------------------------------");
    console.log("\nCopy that whole blob and paste it into FIREBASE_PRIVATE_KEY on Render.");
} catch (e) {
    console.error("❌ Error generating Base64 key:", e.message);
}
