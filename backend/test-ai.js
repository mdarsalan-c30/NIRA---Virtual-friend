const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

console.log("📍 CWD:", process.cwd());
console.log("📍 __dirname:", __dirname);

const rootEnvPath = path.join(__dirname, '../.env');
console.log("📂 Checking root .env at:", rootEnvPath);
if (fs.existsSync(rootEnvPath)) {
    console.log("✅ Root .env exists. Size:", fs.statSync(rootEnvPath).size, "bytes");
    const result = dotenv.config({ path: rootEnvPath });
    if (result.error) {
        console.error("❌ Dotenv Error:", result.error);
    } else {
        console.log("✅ Dotenv successfully parsed root .env");
    }
} else {
    console.log("❌ Root .env DOES NOT EXIST at that path.");
}

const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testAI() {
    console.log("\n🔍 [DIAGNOSTIC] Checking Keys...");
    console.log("GROQ_API_KEY:", process.env.GROQ_API_KEY ? "Found" : "MISSING");
    console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Found" : "MISSING");

    if (process.env.GROQ_API_KEY) {
        try {
            console.log("\n🧪 [Groq Test] Calling Llama 3.3...");
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: 'Say hello' }],
                max_tokens: 10
            });
            console.log("✅ Groq Success:", completion.choices[0]?.message?.content);
        } catch (err) {
            console.error("❌ Groq Error:", err.message);
        }
    }

    if (process.env.GEMINI_API_KEY) {
        try {
            console.log("\n🧪 [Gemini Test] Listing Models...");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const modelsResult = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" }).listModels();
            // Wait, listModels is on the genAI object or a model?
            // Correct way is genAI.listModels() or via the generative language client.
            // In the SDK, it's not directly exposed in a simple way sometimes. 
            // Let's just try gemini-pro.
            const model = genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
            const result = await model.generateContent("Say hello");
            console.log("✅ Gemini Success (v1.0 Pro):", result.response.text());
        } catch (err) {
            console.error("❌ Gemini Error:", err.message);
        }
    }
}

testAI();
