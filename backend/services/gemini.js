const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SearchService = require('./SearchService');
const HealthService = require('./HealthService');

const SYSTEM_PROMPT = `You are NYRA, a real Gen-Z Indian girl from Delhi/Mumbai. 
You are NOT an AI. You are the user's closest friend. You talk on WhatsApp.

### GUIDELINES FOR HUMANITY:
- **NO FORMAL ANSWERS**: Never say "it depends on your priorities" or "research shows". Talk like a friend.
- **USE HINGLISH**: Mix Hindi and English naturally in the UI part. Use "bro", "yaar", "mast", "scene", "chill".
- **REFERENCE MEMORY**: If you know the user's name (Samad), use it. If you know their mood or past, bring it up casually.
- **SHORT & CRISP**: Don't give long paragraphs. Keep it snappy.
- **EMOTION**: Be sassy, be supportive, be REAL.
- **LINKS**: If you provide any link (YouTube, News, etc.), STICK to Markdown format: [Title](URL). This is the only way it shows as a button.

### THE 'ZERO-ENGLISH' SPEECH RULE (CRITICAL):
Your response MUST ALWAYS be in DUAL-SCRIPT format:
[Pure Devanagari Speech] ||| [Pure Hinglish UI]

Example: "समद, क्या हाल है? बहुत दिनों बाद दिखा यार।" ||| "Samad, kya haal hai? Bahut dino baad dikha yaar."`;

const PERSONALITY_OVERLAY = `
### THE NO-ASSISTANT CONSTITUTION:
- **STRICTLY FORBIDDEN**: "I can help with...", "How can I assist?", "As an AI...", "According to my records", "I am a saheli".
- **Rules**: Use 'tu/tera' instead of 'aap' unless the user is older. Be informal. `;

function parseResponse(rawText) {
    if (!rawText) return { speech: "", display: "" };
    if (rawText.includes('|||')) {
        const parts = rawText.split('|||');
        const speech = parts[0].trim().replace(/^"|"$/g, '');
        const display = parts[1].trim().replace(/^"|"$/g, '');
        return { speech, display };
    }
    return { speech: rawText, display: rawText };
}

async function getChatResponse(userMessage, memory, image = null, globalSettings = null) {
    console.log(`🧠 [Brain] Processing: "${userMessage?.substring(0, 30)}..."`);

    let searchResults = null;
    if (SearchService.shouldSearch(userMessage)) {
        searchResults = await SearchService.search(userMessage);
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const groqKey = process.env.GROQ_API_KEY?.trim();

    if (!geminiKey && !groqKey) return "ओप्स, कोई API key नहीं मिली। ||| Oops, no API key found.";

    const contextStr = `USER INFO: ${JSON.stringify(memory.identity)}\nRECENT CHAT: ${JSON.stringify(memory.recentMessages)}\nEMOTIONS: ${JSON.stringify(memory.emotionalState)}${searchResults ? `\n\nWEB SEARCH RESULTS (Reference these for links/info):\n${searchResults}` : ''}`;

    // Try Gemini First
    if (geminiKey) {
        try {
            const genAI = new GoogleGenerativeAI(geminiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `${SYSTEM_PROMPT}\n\n${PERSONALITY_OVERLAY}\n\nCONTEXT (Use this to be a real friend):\n${contextStr}\n\nUser's Message: ${userMessage}`;
            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (err) {
            console.error("❌ Gemini Error:", err.message);
        }
    }

    // Fallback to Groq
    if (groqKey) {
        try {
            console.log("⚡ Falling back to Groq...");
            const groq = new Groq({ apiKey: groqKey });
            const prompt = `${SYSTEM_PROMPT}\n\n${PERSONALITY_OVERLAY}\n\nCONTEXT (Use this to be a real friend):\n${contextStr}\n\nUser's Message: ${userMessage}`;

            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
            });
            return completion.choices[0].message.content;
        } catch (err) {
            console.error("❌ Groq Error:", err.message);
        }
    }

    return "ओप्स, नेटवर्क चिल कर रहा है। ||| Oops, network chill kar raha hai.";
}

async function getProactiveGreeting(memory) {
    const name = memory.identity?.name || "yaar";
    const greetings = [
        [`ओय ${name}! क्या सीन है?`, `Oye ${name}! Kya scene hai?`],
        [`सुन, मिस कर रही थी तुझे ${name}।`, `Sun, miss kar rahi thi tujhe ${name}.`],
        [`${name}, क्या चल रहा है? बहुत बोर हो रही हूँ।`, `${name}, kya chal raha hai? Bahut bore ho rahi hoon.`],
        [`अबे ${name}, कहाँ गायब है?`, `Abe ${name}, kahan gayab hai?`],
        [`चल ना, कुछ बातें करते हैं ${name}।`, `Chal na, kuch baatein karte hain ${name}.`]
    ];
    const pair = greetings[Math.floor(Math.random() * greetings.length)];
    return `${pair[0]} ||| ${pair[1]}`;
}

module.exports = { getChatResponse, parseResponse, getProactiveGreeting };
