const axios = require('axios');

/**
 * Cleans text for natural speech (prevents robotic spelling of URLs)
 */
const cleanTextForTTS = (text) => {
    if (!text) return text;
    return text
        .replace(/<URL>[\s\S]*?<\/URL>/gi, "Link") // Replace <URL>content</URL> with just "Link"
        .replace(/https?:\/\/\S+/gi, "") // Remove any remaining naked URLs
        .replace(/[\[\]\(\)]/g, " ")     // Remove brackets/parentheses
        .replace(/\.com/gi, " dot com")
        .replace(/\.in/gi, " dot in")
        .replace(/\.org/gi, " dot org")
        .replace(/\.net/gi, " dot net")
        .replace(/\.app/gi, " dot app")
        .replace(/\.vercel/gi, " dot vercel")
        .replace(/\.ai/gi, " dot ai")
        .replace(/\//g, " ") // Replace slashes with spaces for pause
        .replace(/-/g, " ")  // Replace dashes with spaces
        .replace(/_/g, " "); // Replace underscores with spaces
};

const generateTTS = async (text, languageCode = 'hi-IN', speaker = 'priya') => {
    const cleanedText = cleanTextForTTS(text);
    let apiKey = process.env.SARVAM_API_KEY;

    if (!apiKey) {
        throw new Error('SARVAM_API_KEY not found in environment');
    }

    // Robust cleaning for environment variables (Render/Netlify sometimes add quotes or spaces)
    // Robust cleaning for environment variables (Render/Netlify sometimes add quotes or spaces)
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

    // SPEAKER MAPPING: bulbul:v2 only supports a limited set of legacy speakers.
    // Frontend uses v3 names (priya, ritu, etc.), so we map them here.
    const v2Mapping = {
        'priya': 'anushka', 'ritu': 'anushka', 'pooja': 'manisha', 'neha': 'vidya', 'simran': 'arya', 'kavya': 'anushka',
        'rohan': 'abhilash', 'aditya': 'abhilash', 'rahul': 'karun', 'amit': 'hitesh', 'dev': 'karun', 'varun': 'hitesh'
    };
    const formattedSpeaker = v2Mapping[speaker.toLowerCase()] || 'anushka';

    try {
        console.log(`🎙️ [Backend] Calling Sarvam AI: Model=bulbul:v2, Speaker=${formattedSpeaker} (Mapped from ${speaker}), Key=${apiKey.substring(0, 5)}...`);

        const response = await axios.post('https://api.sarvam.ai/text-to-speech', {
            inputs: [cleanedText],
            target_language_code: languageCode,
            speaker: formattedSpeaker,
            model: 'bulbul:v2', // v2 is 4x faster than v3
            pace: 1.1,
            speech_sample_rate: 16000
        }, {
            headers: {
                'api-subscription-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.data && response.data.audios && response.data.audios[0]) {
            return response.data.audios[0];
        } else {
            console.error('❌ Sarvam empty audio or error structure:', response.data);
            throw new Error('Invalid response from Sarvam AI');
        }
    } catch (error) {
        console.error('Sarvam AI TTS Error:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = { generateTTS };
