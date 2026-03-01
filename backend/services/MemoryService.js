const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class MemoryService {
    constructor() {
        this.db = admin.firestore();
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    }

    /**
     * Extracts core facts and emotional milestones from a conversation chunk.
     */
    async extractFacts(userId, messages) {
        if (!messages || messages.length < 2) return;

        const conversationText = messages.map(m => `${m.role === 'user' ? 'User' : 'NYRA'}: ${m.content}`).join('\n');

        // We no longer clean Devanagari here so the AI sees the dual-script context.
        const cleanConversation = conversationText;

        const prompt = `
            Analyze the following conversation between a user and their AI friend NYRA.
            Extract key "Core Memories" about the user. These should be specific facts, preferences, life events, or emotional milestones.
            Focus on things that make a friendship deep (e.g., jobs, pets, family names, fears, dreams, favorite places, daily routines, specific likes/dislikes).
            
            Return ONLY a JSON array of strings, where each string is a concise, descriptive fact starting with "The user...". 
            Example: ["The user has a dog named Bruno", "The user is studying for their final exams", "The user loves black coffee"]
            If nothing significant is found, return [].

            CRITICAL: Use ONLY English alphabet (Latin script). Never use Devanagari script.

            CONVERSATION:
            ${cleanConversation}
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text().trim();
            const facts = JSON.parse(responseText.replace(/```json|```/g, ''));

            if (Array.isArray(facts) && facts.length > 0) {
                const profileRef = this.db.collection('users').doc(userId);

                // Add facts to longTermMemory collection
                const batch = this.db.batch();
                facts.forEach(fact => {
                    const factRef = profileRef.collection('longTermMemory').doc();
                    batch.set(factRef, {
                        summary: fact,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        type: 'fact'
                    });
                });
                await batch.commit();
                console.log(`✅ [Memory] Extracted ${facts.length} facts for user ${userId}`);
            }
        } catch (error) {
            console.error("❌ [Memory] Fact extraction failed:", error.message);
        }
    }

    /**
     * Summarizes recent history and handles long-term archival.
     */
    async summarizeHistory(userId, messages, existingSummary = "") {
        if (!messages || messages.length < 5) return existingSummary;

        console.log(`🧠 [Memory] Summarizing history for ${userId}...`);

        const conversationText = messages.map(m => `${m.role === 'user' ? 'User' : 'NYRA'}: ${m.content}`).join('\n');

        // We no longer clean Devanagari here so the AI sees the dual-script context.
        const cleanConversation = conversationText;

        const prompt = `
            You are NYRA's memory processor. 
            Below is a conversation history and an optional existing summary.
            Your task is to create a highly accurate, CONCISE summary (max 100 words).
            
            IMPORTANT:
            - Do NOT hallucinate. Only summarize what was actually said.
            - If the user says their day was good/bad, record that ACCURATELY.
            - Focus on: User's mood, key topics discussed, and any decisions made.
            
            Existing Summary: ${existingSummary || "None"}
            
            New Conversation Data:
            ${cleanConversation}
            
            Return ONLY the new consolidated summary. No intro.
            
            CRITICAL: Use ONLY English alphabet (Latin script) for Hindi words. NEVER use Devanagari script.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const newSummary = result.response.text().trim();

            if (newSummary) {
                await this.db.collection('users').doc(userId).set({
                    memorySummary: newSummary,
                    lastSummarized: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`✅ [Memory] Updated summary for user ${userId}`);
                return newSummary;
            }
        } catch (error) {
            console.error("❌ [Memory] History summarization failed:", error.message);
        }
        return existingSummary;
    }

    /**
     * Calculates friendship stats (Duration, Interaction count).
     */
    async getFriendshipStats(userId) {
        const profileRef = this.db.collection('users').doc(userId);
        const doc = await profileRef.get();

        if (!doc.exists) return { days: 1, interactions: 0 };

        const data = doc.data();
        const firstSeen = data.createdAt?.toDate() || new Date();
        const diffTime = Math.abs(new Date() - firstSeen);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
            days: diffDays,
            interactions: data.totalInteractions || 0
        };
    }
}

module.exports = new MemoryService();
