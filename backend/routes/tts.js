const express = require('express');
const router = express.Router();
const ttsService = require('../services/sarvam');

// POST /api/tts
router.post('/', async (req, res) => {
    try {
        const { text, languageCode, speaker } = req.body;
        console.log(`📡 [TTS REQUEST] Speaker: ${speaker}, Lang: ${languageCode}, Text: ${text?.substring(0, 20)}...`);

        const audioData = await ttsService.generateTTS(text, languageCode, speaker);

        if (audioData) {
            console.log(`✅ [TTS SUCCESS] Audio generated successfully for ${speaker}`);
            res.json({ audio: audioData });
        } else {
            console.error(`⚠️ [TTS EMPTY] No audio data returned for ${speaker}`);
            res.status(500).json({ error: 'No audio data' });
        }
    } catch (error) {
        const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`❌ [TTS ERROR] Error Details: ${errorMsg}`);
        res.status(500).json({ error: 'Failed to generate speech', details: errorMsg });
    }
});

// Diagnostic endpoint
router.get('/status', (req, res) => {
    res.json({ status: 'TTS Service is Active', mode: 'Sarvam AI (Bulbul:v3)' });
});

module.exports = router;
