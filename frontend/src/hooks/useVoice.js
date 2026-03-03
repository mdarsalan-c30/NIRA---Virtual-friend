import { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { auth } from '../firebase';

export const useVoice = () => {
    const [isListening, setIsListening] = useState(false);
    const audioRef = useRef(null);

    const stop = useCallback(() => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current = null;
        }
    }, []);

    const sanitizeTextForTTS = (text) => {
        if (!text) return "";
        // 1. Replace Markdown links [Title](URL) with just Title
        let cleanText = text.replace(/\[(.*?)\]\((.*?)\)/g, "$1");
        // 2. Remove raw URLs
        cleanText = cleanText.replace(/https?:\/\/\S+/g, "");
        // 3. Remove asterisks (common in AI bolding)
        cleanText = cleanText.replace(/\*/g, "");
        // 4. Normalize spaces
        return cleanText.trim();
    };

    const splitTextIntoChunks = (text, maxLength = 250) => {
        if (!text || text.length <= maxLength) return [text];

        // Handle Hindi characters by splitting by sentences
        const sentences = text.match(/[^.।!?]+[.।!?]*/g) || [text];
        const chunks = [];
        let currentChunk = "";

        for (let sentence of sentences) {
            if (sentence.length > maxLength) {
                // If a single sentence is too long, split it by words or spaces
                if (currentChunk) {
                    chunks.push(currentChunk.trim());
                    currentChunk = "";
                }
                const subPeriods = sentence.split(/[,،]/); // Split by comma as well
                for (let sub of subPeriods) {
                    if ((currentChunk + sub).length > maxLength && currentChunk) {
                        chunks.push(currentChunk.trim());
                        currentChunk = sub;
                    } else {
                        currentChunk += sub;
                    }
                }
                continue;
            }

            if ((currentChunk + sentence).length > maxLength && currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk += sentence;
            }
        }
        if (currentChunk) chunks.push(currentChunk.trim());
        return chunks;
    };

    const speak = useCallback(async (text, onStart, onEnd, lang = 'en', speaker = 'priya', gender = 'female') => {
        stop(); // Always stop previous audio first
        const ttsText = sanitizeTextForTTS(text);
        if (!ttsText) {
            if (onEnd) onEnd();
            return;
        }

        const chunks = splitTextIntoChunks(ttsText);
        let currentChunkIndex = 0;

        const speakNextChunk = async () => {
            if (currentChunkIndex >= chunks.length) {
                if (onEnd) onEnd();
                return;
            }

            const chunk = chunks[currentChunkIndex];

            // Fallback to Browser TTS
            const browserFallback = () => {
                if (!window.speechSynthesis) return;
                const utterance = new SpeechSynthesisUtterance(chunk);
                const voices = window.speechSynthesis.getVoices();
                let preferredVoice;

                if (lang === 'hi') {
                    // CRITICAL: Force Hindi voice and lang for fallback to avoid English accent
                    const hiVoices = voices.filter(v => v.lang.includes('hi'));
                    preferredVoice = hiVoices.find(v => v.name.includes(gender === 'male' ? 'Male' : 'Female')) || hiVoices[0];
                    utterance.lang = 'hi-IN';
                } else {
                    const enVoices = voices.filter(v => v.lang.includes('en'));
                    preferredVoice = enVoices.find(v => v.name.includes(gender === 'male' ? 'Male' : 'Female')) || enVoices[0];
                    utterance.lang = 'en-IN';
                }

                if (preferredVoice) utterance.voice = preferredVoice;
                if (currentChunkIndex === 0 && onStart) utterance.onstart = onStart;

                utterance.onend = () => {
                    currentChunkIndex++;
                    speakNextChunk();
                };
                utterance.onerror = () => {
                    if (onEnd) onEnd();
                };
                window.speechSynthesis.speak(utterance);
            };

            try {
                const token = await auth.currentUser?.getIdToken();
                if (!token) {
                    browserFallback();
                    return;
                }

                let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
                if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
                if (!apiUrl.endsWith('/api')) apiUrl += '/api';

                const targetSpeaker = speaker || (gender === 'male' ? 'abhilash' : 'anushka');

                const response = await axios.post(`${apiUrl}/tts`, {
                    text: chunk,
                    languageCode: lang === 'hi' ? 'hi-IN' : 'en-IN',
                    speaker: targetSpeaker
                }, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 60000 // Boosted to 60s for long high-quality audio
                });

                if (response.data && response.data.audio) {
                    if (currentChunkIndex === 0 && onStart) onStart();
                    const audio = new Audio(`data:audio/wav;base64,${response.data.audio}`);
                    audioRef.current = audio;
                    audio.onended = () => {
                        audioRef.current = null;
                        currentChunkIndex++;
                        speakNextChunk();
                    };
                    audio.onerror = (e) => {
                        console.error("❌ Audio playback error:", e);
                        audioRef.current = null;
                        browserFallback();
                    };
                    await audio.play();
                } else {
                    throw new Error('Sarvam returned empty audio data');
                }
            } catch (error) {
                console.error('🛑 SARVAM ERROR:', error.response?.data?.details || error.message);
                browserFallback();
            }
        };

        speakNextChunk();
    }, [stop]);

    const listen = useCallback((onResult, lang = 'hi') => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported in this browser.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        recognition.interimResults = false;
        recognition.continuous = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error("Speech recognition error:", event.error);
            setIsListening(false);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            onResult(transcript);
        };

        recognition.start();
    }, []);

    return { speak, stop, listen, isListening };
};
