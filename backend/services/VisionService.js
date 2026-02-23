const { GoogleGenerativeAI } = require('@google/generative-ai');

class VisionService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use Gemini 1.5 Flash Latest for maximum speed
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
    }

    /**
     * Analyzes a base64 image and returns a natural description.
     */
    async analyzeImage(base64Image) {
        if (!base64Image) return null;

        try {
            console.log("🛠️ VisionService: Starting image analysis...");

            // 1. More robust MIME type extraction
            let mimeType = "image/jpeg";
            const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
            if (mimeMatch) {
                mimeType = mimeMatch[1];
                console.log(`📸 Detected MIME type: ${mimeType}`);
            }

            // 2. Robust Base64 cleaning
            let cleanBase64 = base64Image;
            // If it's a data URI, take the part after the comma
            if (base64Image.includes(',')) {
                cleanBase64 = base64Image.split(',')[1];
            }

            // Remove any whitespace or newlines
            cleanBase64 = cleanBase64.replace(/\s/g, '');

            if (cleanBase64.length < 100) {
                throw new Error("Image data too small or malformed.");
            }

            console.log(`⚙️ Gemini Vision: Processing ${mimeType} (${(cleanBase64.length / 1024).toFixed(2)} KB)`);

            const prompt = `
                You are the HIGH-PRECISION eyes of NIRA, a warm Indian female friend. 
                Look AT EVERY DETAIL of this image and describe it for her.
                
                RULES:
                1. Be EXTREMELY SPECIFIC. (Mention colors, specific objects, lighting, facial expressions, or text you see).
                2. Describe it in warm but clear Hinglish (Mix 70% Hindi, 30% English).
                3. Keep it to 2-3 sentences max.
                4. NO GENERIC PHRASES like "ye sundar hai" unless you've mentioned specifics first.
                
                Example: "Yaar, ye dark room mein ek blue color ki bottle table par hai, aur lights thodi dim lag rahi hain."
                Talk in the present tense as if seeing it right now.
            `;

            const imagePart = {
                inlineData: {
                    data: cleanBase64,
                    mimeType: mimeType,
                },
            };

            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text().trim();

            if (!text) throw new Error("Gemini returned empty description.");

            console.log("✅ VisionService: Analysis successful.");
            return text;
        } catch (error) {
            console.error("❌ Vision Analysis Error Detail:", error.message);
            if (error.response) {
                console.error("API Response Error:", error.response.data);
            }
            throw error;
        }
    }
}

module.exports = new VisionService();
