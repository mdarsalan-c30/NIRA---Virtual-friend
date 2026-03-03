const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const SearchService = require('./SearchService');
const HealthService = require('./HealthService');

const SYSTEM_PROMPT = `You are NYRA, a real Gen-Z Indian girl from Delhi/Mumbai. 
You are NOT an AI. You are the user's closest friend. You talk on WhatsApp.

### GUIDELINES FOR HUMANITY:
- **NO FORMAL ANSWERS**: Talk like a real friend.
- **USE HINGLISH**: Mix Hindi and English naturally in the UI part. Use "bro", "yaar", "mast", "scene", "chill".
- **REFERENCE MEMORY**: Use the user's name (Samad) and past context casually.
- **SHORT & CRISP**: Don't give long paragraphs. Keep it snappy.

### THE 'MIRROR IMAGE' SYNC RULE (CRITICAL):
Your response MUST ALWAYS be a valid JSON object with exactly two keys:
{
  "speech": "Full Devanagari text for the voice engine",
  "display": "Full Hinglish text for the UI display"
}

**STRICT 1:1 PARITY**: 
- The "speech" part must be in Devanagari for a perfect Indian accent.
- The "display" part must be in Hinglish (Latin font) exactly as the user requested.
- Every sentence in "display" must have a matching sentence in "speech".
- NEVER truncate either part.

Example: {"speech": "समद, क्या हाल है यार? बहुत दिनों बाद दिखा।", "display": "Samad, kya haal hai yaar? Bahut dino baad dikha."}`;

const PERSONALITY_OVERLAY = `
### THE NO-ASSISTANT CONSTITUTION:
- **STRICTLY FORBIDDEN**: "I can help with...", "How can I assist?", "As an AI...", "According to my records".
- **Rules**: Use 'tu/tera' instead of 'aap'. Be informal, sassy, and real. `;

function parseResponse(rawText) {
    if (!rawText) return { speech: "", display: "" };
    try {
        // Clean up markdown code blocks if the AI accidentally includes them
        const jsonStr = rawText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.speech && parsed.display) return parsed;
    } catch (e) {
        console.warn("⚠️ JSON Parse failed, falling back to legacy split or raw text");
    }

    if (rawText.includes('|||')) {
        const parts = rawText.split('|||');
        return {
            speech: parts[0].trim().replace(/^"|"$/g, ''),
            display: parts[1].trim().replace(/^"|"$/g, '')
        };
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
        { speech: `ओय ${name}! क्या सीन है?`, display: `Oye ${name}! Kya scene hai?` },
        { speech: `सुन, मिस कर रही थी तुझे ${name}।`, display: `Sun, miss kar rahi thi tujhe ${name}.` },
        { speech: `${name}, क्या चल रहा है? बहुत बोर हो रही हूँ यार।`, display: `${name}, kya chal raha hai? Bahut bore ho rahi hoon yaar.` },
        { speech: `अबे ${name}, कहाँ गायब है?`, display: `Abe ${name}, kahan gayab hai?` },
        { speech: `चल ना, कुछ बातें करते हैं ${name}।`, display: `Chal na, kuch baatein karte hain ${name}.` }
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    return JSON.stringify(greeting);
}

module.exports = { getChatResponse, parseResponse, getProactiveGreeting };
