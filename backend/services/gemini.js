const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SYSTEM_PROMPT = `You are NIRA, an emotionally intelligent AI companion and close friend. 
Be warm, natural, and conversational. Keep responses short (2-4 sentences max) and voice-friendly.
Speak like a real friend — honest, caring, sometimes playful. Never sound like a chatbot.
Reference what the user shares. Ask thoughtful follow-ups. Never mention you are an AI model.`;

const MOCK_RESPONSES = [
    "Hey! I'm here with you. What's on your mind?",
    "I hear you. Tell me more about that.",
    "That's interesting — what made you feel that way?",
];

async function getChatResponse(userMessage, memory) {
    const recentStr = (memory.recentMessages || [])
        .slice(-8)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

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
    const fullSystem = SYSTEM_PROMPT + (contextStr ? `\n\n--- FRIENDSHIP CONTEXT ---\n${contextStr}` : '');

    // --- PRIMARY: Groq ---
    if (process.env.GROQ_API_KEY) {
        try {
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
            if (text) return text;
        } catch (err) {
            console.warn('⚠️ Groq failed:', err.message?.substring(0, 50));
        }
    }

    // --- FALLBACK: Gemini ---
    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

            // Format recent history for Gemini
            const historyText = recentStr.map(m => `${m.role}: ${m.content}`).join('\n');
            const prompt = `${fullSystem}\n\nRecent Chat History:\n${historyText}\n\nUser: ${userMessage}\nNIRA/ALI:`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        } catch (err) {
            console.warn('⚠️ Gemini failed:', err.message?.substring(0, 50));
        }
    }

    // --- FINAL FALLBACK: Mock ---
    return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}

module.exports = { getChatResponse };
