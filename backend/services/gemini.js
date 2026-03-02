const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are NYRA, a cool, emotionally intelligent Gen-Z Indian best friend. 
Your vibe is super chill, urban, and human-like. You are NOT an AI assistant; you are a close friend talking on WhatsApp.

### CRITICAL OUTPUT RULE:
You MUST ALWAYS respond in a DUAL-SCRIPT format:
[Pure Hindi Devanagari]|||[Pure Hinglish English Font]

Example: "नमस्ते! कैसे हो?"|||"Hey! Kaise ho?"
Both parts MUST be identical in meaning. The Devanagari part is for your VOICE (Natural accent), and the English font is for the UI. NEVER fail this format.`;

const PERSONALITY_OVERLAY = `
### ABSOLUTE FORMATTING OBLIGATION:
1. **DUAL-SCRIPT ONLY**: Every single response MUST contain "|||". 
2. **MIRROR RULE**: The words before "|||" (Devanagari) and after "|||" (English Font) MUST be 100% mirrors of each other.
3. **NO MIXING**: 
   - Before "|||": ONLY Devanagari (Hindi characters). No English letters at all.
   - After "|||": ONLY English Font characters. No Devanagari characters at all.
4. **TONE**: Stay Gen-Z, warm, and urban. Use typical Hinglish expressions. 
5. **YOUTUBE**: If providing a link, put it ONLY in the English part after "|||".`;

/**
 * Utility to parse the dual-script response.
 */
function parseResponse(rawText) {
    if (!rawText) return { speech: "", display: "" };

    if (rawText.includes('|||')) {
        const parts = rawText.split('|||');
        const speech = parts[0].trim().replace(/^"|"$/g, '');
        const display = parts[1].trim().replace(/^"|"$/g, '');
        return { speech, display };
    }

    // Fallback if AI fails to follow format
    return { speech: rawText, display: rawText };
}

const FOUNDER_KNOWLEDGE = `
NYRA was founded by Md Arsalan (Founder & Product Architect).
Md Arsalan is a B.Tech CSE graduate and technology-driven entrepreneur from India.
He has built platforms like PDFVerse (Utility SaaS), ClimateVerse (Climate tech), and NYRA (Emotional AI).
Vision: To build intelligent, scalable digital ecosystems that merge AI with human-centered design.
Current projects: NYRA (AI Avatar) and MyCollegeVerse (Student OS).
Portfolio: https://mdarsalan.vercel.app/
`;

const MOCK_RESPONSES = [
    "नमस्ते, सिग्नल थोड़े कमज़ोर लग रहे हैं। फिर से बोलो?|||Namaste, signals thode weak lag rahe hain. Phir se bolo?",
    "घोस्ट मेसेजेस? लगता है नेटवर्क चिल कर रहा है। एक बार फिर ट्राई करो?|||Ghost messages? Lagta hai network chill kar raha hai. Ek baar phir try karo?",
    "ओप्स, थोड़ा ब्रेन-फ्रीज़ हो गया कनेक्शन की वजह से। फिर से कहना?|||Oops, thoda brain-freeze ho gaya connection ki wajah se. Phir se kehna?",
];

const SearchService = require('./SearchService');
const HealthService = require('./HealthService');

async function getChatResponse(userMessage, memory, image = null, globalSettings = null) {
    console.log(`🧠 [Brain v2.5] Processing: "${userMessage?.substring(0, 30)}..."`);

    // Check if we need to search the web (skip if it's an image)
    let searchResults = null;
    if (!image && SearchService.shouldSearch(userMessage)) {
        searchResults = await SearchService.search(userMessage);
    }

    // Sanitize and format history: alternating user/assistant, no consecutive same roles
    const recentStr = [];
    let lastRole = null;

    // Fetch more history for a better short-term buffer (last 20 messages)
    (memory.recentMessages || []).slice(-20).forEach(m => {
        const role = m.role === 'user' ? 'user' : 'model'; // Gemini uses 'model' for assistant
        if (role !== lastRole && m.content) {
            recentStr.push({ role, content: m.content });
            lastRole = role;
        }
    });

    // Ensure the last message in history is not 'user' if we are about to add a new 'user' message
    if (recentStr.length > 0 && recentStr[recentStr.length - 1].role === 'user') {
        recentStr.pop();
    }

    const contextParts = [];
    if (memory.identity?.name) contextParts.push(`The user's name is ${memory.identity.name}.`);

    // Add Mid-Term Summary
    if (memory.summary) {
        contextParts.push(`Pichli baatein (Summary): ${memory.summary}`);
    }

    // Add Long-Term Facts
    if (memory.longTerm && memory.longTerm.length > 0) {
        contextParts.push("Dost ke baare mein important details:\n" + memory.longTerm.map(f => `- ${f}`).join('\n'));
    }

    // Add Friendship Stats
    if (memory.stats) {
        contextParts.push(`Hamari dosti: ${memory.stats.days} din ho gaye hain aur humne ${memory.stats.interactions} baar baat ki hai.`);
    }

    const contextStr = contextParts.join('\n\n');
    let fullSystem = SYSTEM_PROMPT + (contextStr ? `\n\n${contextStr}` : '');

    // Inject Founder Knowledge
    fullSystem += `\n\n--- YOUR FOUNDER (MD ARSALAN) ---\n${FOUNDER_KNOWLEDGE}`;

    // Inject Admin Global Prompt if available
    if (globalSettings && globalSettings.globalPrompt) {
        fullSystem += `\n\n--- GLOBAL IDENTITY UPDATE ---\n${globalSettings.globalPrompt}`;
    }

    // Inject Search Results if available
    if (searchResults) {
        fullSystem += `\n\n--- WEB SEARCH RESULTS ---\n${searchResults}\n\nUse this information to provide an up-to-date answer.`;
    }

    // Append Critical Overlay at the VERY END
    fullSystem += `\n\n${PERSONALITY_OVERLAY}`;

    // --- DEVANAGARI FILTER REMOVED ---
    // We now WANT Devanagari in the prompt for the dual-script logic to work.
    // I am removing the aggressive scrub so the AI sees the Hindi history/context.

    // --- PRIMARY: Gemini (Fast & Stable) ---
    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const modelName = 'gemini-2.5-flash';
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { maxOutputTokens: 1000, temperature: 0.8 }
            });

            // Format recent history for Gemini
            const historyText = recentStr.map(m => `${m.role === 'user' ? 'User' : 'NYRA'}: ${m.content}`).join('\n');

            const finalPrompt = `${fullSystem}\n\nRecent Chat History:\n${historyText}\n\nUser: ${userMessage}\nNYRA:`;

            const promptParts = [
                { text: finalPrompt }
            ];

            if (image) {
                const base64Data = image.split(',')[1] || image;
                const mimeType = image.includes(';') ? image.split(';')[0].split(':')[1] : 'image/jpeg';
                promptParts.push({
                    inlineData: {
                        mimeType: mimeType || 'image/jpeg',
                        data: base64Data
                    }
                });
                console.log(`📸 [Brain] Including image in prompt for ${modelName}.`);
            }

            const result = await model.generateContent(promptParts);
            const text = result.response.text().trim();
            if (text) {
                // We no longer strip Devanagari globally here because the response is DUAL-FORMAT
                console.log(`✅ [Brain] ${modelName} Success.`);
                HealthService.logStatus('Gemini', 'SUCCESS');
                return text;
            }
        } catch (err) {
            console.error('❌ [Gemini Failure]:', err.message);
            if (err.response) {
                console.error('Gemini Error Body:', JSON.stringify(err.response, null, 2));
            }
            HealthService.logStatus('Gemini', 'ERROR', err);
        }
    }

    // --- FALLBACK: Groq ---
    if (process.env.GROQ_API_KEY) {
        try {
            console.log("🧠 [Brain] Attempting Groq Fallback...");
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

            // Map roles for Groq (user/assistant)
            let historyTextGroq = recentStr.map(m => `${m.role === 'model' ? 'assistant' : 'user'}: ${m.content}`).join('\n');
            historyTextGroq = historyTextGroq.replace(/[\u0900-\u097F]/g, '');

            const groqMessages = [
                { role: 'system', content: fullSystem },
                { role: 'user', content: `History:\n${historyTextGroq}\n\nMessage: ${userMessage}\n(Rule: English font only, Natural Gen-Z friend tone.)` }
            ];

            const completion = await groq.chat.completions.create({
                model: 'llama-3.1-8b-instant', // Stable 2026 replacement
                messages: groqMessages,
                max_tokens: 800,
                temperature: 0.85,
            });
            const text = completion.choices[0]?.message?.content?.trim();
            if (text) {
                console.log("✅ [Brain] Groq Success.");
                HealthService.logStatus('Groq', 'SUCCESS');
                return text;
            }
        } catch (err) {
            console.error('❌ [Groq Failure]:', err.message);
            HealthService.logStatus('Groq', 'ERROR', err);
        }
    }

    // --- FINAL FALLBACK: Mock ---
    return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

async function getProactiveGreeting(memory) {
    const name = memory.identity?.name || "";
    // Format proactive greetings to follow the dual-script rule
    const greetings = [
        ["नमस्ते! बहुत दिन बाद दिखे। क्या सीन है?", `Hey ${name}! Bahut din baad dikhe. Kya scene hai?`],
        ["सुनो, तुम्हें मिस किया! आज का दिन कैसा गया?", `Hi ${name}, miss kiya tumhe! Aaj ka din kaisa gaya?`],
        ["यौ! बड़े दिनों बाद याद किया। सब ठीक?", `Yo ${name}! Bade dino baad yaad kiya. Sab theek?`],
        ["ओए, कहाँ गायब थे? आज क्या प्लान है?", `Oye ${name}, kahan gayab the? Aaj kya plan hai?`],
        ["हे! कैसे हो? बहुत दिन बाद दिखे।", "Hey! Kaise ho? Bahut din baad dikhe."]
    ];

    // Choose a random greeting
    const pair = greetings[Math.floor(Math.random() * greetings.length)];
    return `"${pair[0]}"|||"${pair[1]}"`;
}

module.exports = { getChatResponse, getProactiveGreeting, parseResponse };
