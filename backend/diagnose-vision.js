const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

console.log("--- Vision Diagnostic Start ---");

const envPath = path.join(__dirname, '../.env');
console.log("Checking .env at:", envPath);
console.log("File exists:", fs.existsSync(envPath));

dotenv.config({ path: envPath });
console.log("GEMINI_API_KEY present:", !!process.env.GEMINI_API_KEY);

try {
    const visionService = require('./services/VisionService');
    console.log("VisionService loaded successfully.");

    const base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

    visionService.analyzeImage(base64)
        .then(desc => {
            console.log("SUCCESS! Description:", desc);
            process.exit(0);
        })
        .catch(err => {
            console.error("ANALYSIS FAILED:", err);
            process.exit(1);
        });

} catch (err) {
    console.error("LOAD FAILED:", err);
    process.exit(1);
}
