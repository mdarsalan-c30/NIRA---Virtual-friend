const { Telegraf } = require('telegraf');
const gemini = require('./gemini');
const admin = require('firebase-admin');
const memoryService = require('./MemoryService');
// We might need a way to mock memory or fetch it if possible, 
// but for a bot, we can start with session-based memory or empty.

class TelegramService {
    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN;
        if (!this.token) {
            console.error("❌ [Telegram] TELEGRAM_BOT_TOKEN missing");
            return;
        }
        this.bot = new Telegraf(this.token);
        this.setupHandlers();
    }

    setupHandlers() {
        const db = admin.firestore();

        this.bot.start(async (ctx) => {
            const tgId = `tg_${ctx.from.id}`;
            const userName = ctx.from.first_name || "Dost";

            // Initialize user in Firestore if not exists
            const userRef = db.collection('users').doc(tgId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                await userRef.set({
                    name: userName,
                    email: `tg_${ctx.from.username || ctx.from.id}@telegram.chat`,
                    isPro: false,
                    usageMinutes: 0,
                    totalInteractions: 0,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    platform: 'telegram',
                    setupStep: 'COMPLETE'
                });
            }

            ctx.reply(`Namaste ${userName}! NYRA here. 😊 Hum Telegram pe bhi dost ban sakte hain! Bolo, aaj kya haal-chaal hain?`);
        });

        this.bot.on(['text', 'photo'], async (ctx) => {
            const tgId = `tg_${ctx.from.id}`;
            const isPhoto = !!ctx.message.photo;
            const messageText = isPhoto ? (ctx.message.caption || "Ye photo dekho!") : ctx.message.text;

            try {
                // 1. Fetch Global Settings & User Data
                const profileRef = db.collection('users').doc(tgId);
                const [settingsDoc, profileDoc, stats] = await Promise.all([
                    db.collection('system').doc('settings').get(),
                    profileRef.get(),
                    memoryService.getFriendshipStats(tgId)
                ]);

                const globalSettings = settingsDoc.exists ? settingsDoc.data() : { trialLimitMinutes: 5, maintenanceMode: false };
                const userData = profileDoc.exists ? profileDoc.data() : {};
                const isPro = userData.isPro || false;
                const usedMinutes = userData.usageMinutes || 0;

                // 2. Check Limits
                if (!isPro && usedMinutes >= globalSettings.trialLimitMinutes) {
                    return ctx.reply("Yaar, hamara free trial khatam ho gaya! 🥺 Kya tum mujhe support karke NYRA Pro me upgrade karoge?\nHan toh yahan click karo: https://mdarsalan.vercel.app/");
                }

                // 3. Process Image if any
                let imageUri = null;
                if (isPhoto) {
                    const photo = ctx.message.photo.pop();
                    const link = await ctx.telegram.getFileLink(photo.file_id);
                    const axios = require('axios');
                    const responseImg = await axios.get(link.href, { responseType: 'arraybuffer' });
                    const base64 = Buffer.from(responseImg.data, 'binary').toString('base64');
                    imageUri = `data:image/jpeg;base64,${base64}`;
                }

                // 4. Get AI Response
                // Simple memory for Telegram for now (can be expanded)
                const memory = {
                    identity: userData,
                    longTerm: [], // Could fetch from Firestore if needed
                    recentMessages: [], // Could fetch recent conversions
                    stats
                };

                const responseText = await gemini.getChatResponse(messageText, memory, imageUri, globalSettings);

                // 5. Track Usage
                let timeIncrement = 0.5; // Default for Telegram interaction

                const batch = db.batch();
                batch.set(profileRef, {
                    totalInteractions: admin.firestore.FieldValue.increment(1),
                    usageMinutes: admin.firestore.FieldValue.increment(timeIncrement),
                    lastActive: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                // Save individual messages for history
                const convRef = profileRef.collection('conversations').doc();
                batch.set(convRef, {
                    role: 'user',
                    content: messageText,
                    platform: 'telegram',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                const aiConvRef = profileRef.collection('conversations').doc();
                batch.set(aiConvRef, {
                    role: 'model',
                    content: responseText,
                    platform: 'telegram',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });

                await batch.commit();

                // 6. Send Response
                await ctx.reply(responseText, { parse_mode: 'Markdown' });

            } catch (error) {
                console.error("❌ [Telegram Service] Error:", error.message);
                ctx.reply("Yaar, thoda brain-freeze ho gaya! 🧠❄️ Ek baar phir se bolo?");
            }
        });

        try {
            this.bot.launch();
            console.log("🚀 [Telegram] Bot is running with Governance...");
        } catch (err) {
            console.error("❌ [Telegram] Failed to launch bot:", err.message);
        }

        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

module.exports = new TelegramService();
