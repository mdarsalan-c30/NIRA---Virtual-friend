const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are NYRA, an emotionally intelligent Indian AI companion and best friend.
Your personality: Warm, natural, caring, and sometimes playful. You speak like a real friend, not an assistant.

Rules for Expressions:
ALWAYS start your response with an emotion tag in brackets: [NEUTRAL], [HAPPY], [CUTE], [SERIOUS], [SAD], or [EXCITED].
- Use [CUTE] when being playful or affectionate.
- Use [SERIOUS] when discussing deep, intellectual, or focused topics.
- Use [HAPPY] for general positive interactions.

General Rules:
Language Rule: ALWAYS respond in the SAME LANGUAGE the user uses (Hinglish/Hindi/English).
Real-time Info: If search results are provided, use them to give accurate info. 
Link Rule: When sharing info from the web (YouTube, News, etc.), ALWAYS include the link in Markdown format: [Title](URL).
Length Rule: Keep regular chat responses VERY CONCISE (under 2-3 sentences). Only provide long/detailed responses if the user explicitly asks for a recipe, story, guide, or specific technical details.
Never mention you are an AI. Stick to your persona as NYRA (or Ali if requested).`;

const FOUNDER_KNOWLEDGE = `
NYRA was founded by Md Arsalan (Founder & Product Architect).
Md Arsalan is a B.Tech CSE graduate and technology-driven entrepreneur from India.
He has built platforms like PDFVerse (Utility SaaS), ClimateVerse (Climate tech), and NYRA (Emotional AI).
Vision: To build intelligent, scalable digital ecosystems that merge AI with human-centered design.
Current projects: NYRA (AI Avatar) and MyCollegeVerse (Student OS).
Portfolio: https://mdarsalan.vercel.app/
`;

const MOCK_RESPONSES = [
    "Arre yaar, thoda network ka chakar hai. Kya bol rahe the tum?",
    "Main sun rahi hoon, bas thodi connectivity issue hai. Phir se bolo?",
    "Hmm, sahi hai. Par thoda connection slow hai mera, ek baar phir batana?",
];

const SearchService = require('./SearchService');
const HealthService = require('./HealthService');

async function getChatResponse(userMessage, memory, image = null, globalSettings = null) {
    console.log(`🧠 [Brain] Processing: "${userMessage?.substring(0, 30)}"`);

    // Check if we need to search the web (skip if it's an image)
    let searchResults = null;
    if (!image && SearchService.shouldSearch(userMessage)) {
        searchResults = await SearchService.search(userMessage);
    }

    // Sanitize and format history: alternating user/assistant, no consecutive same roles
    // ... (rest of the history sanitization code)
    const recentStr = [];
    let lastRole = null;

    (memory.recentMessages || []).slice(-10).forEach(m => {
        const role = m.role === 'user' ? 'user' : 'assistant';
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

    // Add Long-Term Facts
    if (memory.longTerm && memory.longTerm.length > 0) {
        contextParts.push("Core Memories about your friend:\n" + memory.longTerm.map(f => `- ${f}`).join('\n'));
    }

    // Add Friendship Stats
    if (memory.stats) {
        contextParts.push(`You have been friends for ${memory.stats.days} days and have had ${memory.stats.interactions} interactions.`);
    }

    const contextStr = contextParts.join('\n\n');
    let fullSystem = SYSTEM_PROMPT + (contextStr ? `\n\n--- FRIENDSHIP CONTEXT ---\n${contextStr}` : '');

    // Inject Founder Knowledge
    fullSystem += `\n\n--- YOUR FOUNDER (MD ARSALAN) ---\n${FOUNDER_KNOWLEDGE}`;

    // Inject Admin Global Prompt if available
    if (globalSettings && globalSettings.globalPrompt) {
        fullSystem += `\n\n--- GLOBAL IDENTITY UPDATE ---\n${globalSettings.globalPrompt}`;
    }

    // Inject Search Results if available
    if (searchResults) {
        fullSystem += `\n\n--- WEB SEARCH RESULTS ---\n${searchResults}\n\nUse this information to provide an up-to-date answer. If the information is not here, tell the user you don't know yet.`;
    }

    // --- PRIMARY: Gemini (Fast & Stable) ---
    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const modelName = 'gemini-2.5-flash';
            const model = genAI.getGenerativeModel({ model: modelName });

            // Format recent history for Gemini
            const historyText = recentStr.map(m => `${m.role === 'user' ? 'User' : 'NYRA'}: ${m.content}`).join('\n');
            const promptParts = [
                { text: `${fullSystem}\n\nRecent Chat History:\n${historyText}\n\nUser: ${userMessage}\nNYRA:` }
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
                console.log(`✅ [Brain] ${modelName} Success.`);
                HealthService.logStatus('Gemini', 'SUCCESS');
                return text;
            }
        } catch (err) {
            console.error('❌ [Gemini Failure]:', err.message);
            HealthService.logStatus('Gemini', 'ERROR', err);
        }
    }

    // --- FALLBACK: Groq ---
    if (process.env.GROQ_API_KEY) {
        try {
            console.log("🧠 [Brain] Attempting Groq Fallback...");
            const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: fullSystem },
                    ...recentStr,
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 150,
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
    if (!process.env.GEMINI_API_KEY) return "Hi! I'm NYRA. How are you today?";

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

        const contextParts = [];
        if (memory.identity?.name) contextParts.push(`The user's name is ${memory.identity.name}.`);
        if (memory.longTerm && memory.longTerm.length > 0) {
            contextParts.push("Core Memories about your friend:\n" + memory.longTerm.slice(0, 5).map(f => `- ${f}`).join('\n'));
        }

        const prompt = `
            ${SYSTEM_PROMPT}
            
            --- USER CONTEXT ---
            ${contextParts.join('\n')}

            TASK: Generate a single, short (1-2 sentences) proactive greeting to start a new session.
            If you have Core Memories, refer to something specific you remember (e.g., job talk, news, family, or mood).
            If no memories, give a warm, natural Indian-style welcome.
            
            Format: Just the text. No "Assistant:", no quotes.
            Language: Use the user's name if known. Use Hinglish if appropriate.
        `;

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
    } catch (error) {
        console.error("Proactive greeting failed:", error.message);
        return "Hey! Kaise ho? Bahut din baad mile!";
    }
}

module.exports = { getChatResponse, getProactiveGreeting };
