const axios = require('axios');
const HealthService = require('./HealthService');

const generateTTS = async (text, languageCode = 'hi-IN', speaker = 'priya') => {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY not found in environment');
    }

    try {
        // Sarvam AI strictly requires lowercase speaker names.
        // We use 'bulbul:v2' as it is the only model currently processing billing for this account.
        const formattedSpeaker = speaker.toLowerCase();

        console.log(`🎙️ [Backend] Requesting Sarvam TTS: Model=bulbul:v2, Speaker=${formattedSpeaker}, Lang=${languageCode}`);

        const response = await axios.post('https://api.sarvam.ai/text-to-speech', {
            inputs: [text],
            target_language_code: languageCode,
            speaker: formattedSpeaker,
            model: 'bulbul:v2',
            pace: 1.0,
            speech_sample_rate: 16000
        }, {
            headers: {
                'api-subscription-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 25000 // Increased for high-quality v3 generation
        });

        if (response.data && response.data.audios && response.data.audios[0]) {
            HealthService.logStatus('Sarvam', 'SUCCESS');
            return response.data.audios[0]; // This is typically a base64 encoded audio string
        } else {
            throw new Error('Invalid response from Sarvam AI');
        }
    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error('Sarvam AI TTS Error:', errorMsg);
        HealthService.logStatus('Sarvam', 'ERROR', errorMsg);
        throw error;
    }
};

module.exports = { generateTTS };
