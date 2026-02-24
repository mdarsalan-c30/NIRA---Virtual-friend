const axios = require('axios');

/**
 * SearchService handles internet search using Tavily API.
 */
class SearchService {
    constructor() {
        this.apiKey = process.env.TAVILY_API_KEY;
    }

    async search(query) {
        if (!this.apiKey) {
            console.error("❌ [SearchService] TAVILY_API_KEY missing");
            return null;
        }

        try {
            console.log(`🌐 [SearchService] Searching the web for: "${query}"`);
            const response = await axios.post('https://api.tavily.com/search', {
                api_key: this.apiKey,
                query: query,
                search_depth: "basic",
                max_results: 3
            });

            if (response.data && response.data.results) {
                const results = response.data.results.map(r => `[${r.title}](${r.url}): ${r.content}`).join('\n');
                console.log("✅ [SearchService] Search successful.");
                return results;
            }
            return null;
        } catch (error) {
            console.error("❌ [SearchService] Error:", error.response ? error.response.data : error.message);
            return null;
        }
    }

    /**
     * Determines if a message requires a web search.
     */
    shouldSearch(message) {
        const triggers = [
            'weather', 'mausam', 'news', 'khabar', 'taza', 'latest', 'today', 'aaj',
            'score', 'match', 'price', 'bhaav', 'rate', 'who is', 'kon hai', 'what is', 'kya hai',
            'youtube', 'yt', 'video', 'link', 'sunao', 'play'
        ];
        const lowerMsg = message.toLowerCase();
        return triggers.some(t => lowerMsg.includes(t)) && (lowerMsg.length > 5);
    }
}

module.exports = new SearchService();
