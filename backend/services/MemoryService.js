const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

class MemoryService {
    constructor() {
        this.db = admin.firestore();
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    }

    /**
     * Extracts core facts and emotional milestones from a conversation chunk.
     */
    async extractFacts(userId, messages) {
        if (!messages || messages.length < 2) return;

        const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

        const prompt = `
            Analyze the following conversation between a user and an AI friend.
            Extract key "Core Memories" about the user. These should be facts, preferences, life events, or emotional milestones.
            Focus on things that make a friendship deep (e.g., jobs, pets, family names, fears, dreams, favorite places).
            
            Return ONLY a JSON array of strings, where each string is a concise fact. 
            Example: ["The user has a dog named Bruno", "The user is studying for their final exams", "The user loves black coffee"]
            If nothing significant is found, return [].

            CONVERSATION:
            ${conversationText}
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
                console.log(`✅ Extracted ${facts.length} facts for user ${userId}`);
            }
        } catch (error) {
            console.error("Fact extraction failed:", error.message);
        }
    }

    /**
     * Summarizes recent history and handles long-term archival.
     */
    async summarizeHistory(userId, messages) {
        // Logic to compress history when it gets too long
        // Not strictly required for the first pass but good for scale
        console.log(`Summarizing history for ${userId}...`);
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
