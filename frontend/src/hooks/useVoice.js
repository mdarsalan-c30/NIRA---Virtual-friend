import { useState, useCallback } from 'react';

export const useVoice = () => {
    const [isListening, setIsListening] = useState(false);

    const speak = useCallback((text, onStart, onEnd, lang = 'en', gender = 'female') => {
        if (!window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voices = window.speechSynthesis.getVoices();
        let preferredVoice;

        if (lang === 'hi') {
            // Find Hindi voices
            const hiVoices = voices.filter(v => v.lang.includes('hi'));
            if (gender === 'male') {
                preferredVoice = hiVoices.find(v => v.name.includes('Male') || v.name.includes('Rishi') || v.name.includes('Google India'));
            } else {
                preferredVoice = hiVoices.find(v => v.name.includes('Female') || v.name.includes('Heera') || v.name.includes('Kalpana') || v.name.includes('Natural'));
            }
            // Fallback to any Hindi voice
            if (!preferredVoice) preferredVoice = hiVoices[0];

            utterance.rate = 1.05;
            utterance.pitch = gender === 'male' ? 0.9 : 1.1;
        } else {
            // Find English voices
            const enVoices = voices.filter(v => v.lang.includes('en'));
            if (gender === 'male') {
                preferredVoice = enVoices.find(v => v.name.includes('Male') || v.name.includes('Google UK English Male') || v.name.includes('Microsoft David'));
            } else {
                preferredVoice = enVoices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female') || v.name.includes('Heera') || v.name.includes('Zira'));
            }
            // Fallback to any English voice
            if (!preferredVoice) preferredVoice = enVoices[0];

            utterance.rate = 0.95;
            utterance.pitch = gender === 'male' ? 0.9 : 1.1;
        }

        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = onStart;
        utterance.onend = onEnd;
        utterance.onerror = onEnd;

        window.speechSynthesis.speak(utterance);
    }, []);

    const listen = useCallback((onResult, lang = 'en') => {
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

    return { speak, listen, isListening };
};
