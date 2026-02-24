const { Telegraf } = require('telegraf');
const gemini = require('./gemini');
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
        this.bot.start((ctx) => {
            ctx.reply('Namaste! NIRA here. Hum Telegram pe bhi dost ban sakte hain! Bolo, kya haal hai?');
        });

        this.bot.on('text', async (ctx) => {
            const userMessage = ctx.message.text;
            console.log(`📱 [Telegram] Message from ${ctx.from.first_name}: ${userMessage}`);

            // For now, Telegram bot starts with empty memory or simple context
            // In a startup level, we would link this to the user's Firebase UID via a login command.
            const memory = { history: [], longTerm: [], stats: { days: 1, interactions: 0 } };

            try {
                const response = await gemini.getChatResponse(userMessage, memory);
                // Remove Markdown links for Telegram (or keep them if Telegram supports)
                // Telegram supports basic markdown.
                await ctx.reply(response, { parse_mode: 'Markdown' });
            } catch (error) {
                console.error("❌ [Telegram] Chat Error:", error.message);
                ctx.reply("Yaar, thoda network issue hai. Phir se batana?");
            }
        });

        this.bot.on('photo', async (ctx) => {
            const photo = ctx.message.photo.pop(); // Get largest version
            const fileId = photo.file_id;
            const link = await ctx.telegram.getFileLink(fileId);
            const userMessage = ctx.message.caption || "Ye photo dekho!";

            console.log(`📸 [Telegram] Photo from ${ctx.from.first_name}`);
            ctx.reply("Hmm, dekh rahi hoon... ek second... 💭");

            try {
                const axios = require('axios');
                const responseImg = await axios.get(link.href, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(responseImg.data, 'binary').toString('base64');
                const imageUri = `data:image/jpeg;base64,${base64}`;

                const memory = { history: [], longTerm: [], stats: { days: 1, interactions: 0 } };
                const aiResponse = await gemini.getChatResponse(userMessage, memory, imageUri);
                await ctx.reply(aiResponse, { parse_mode: 'Markdown' });
            } catch (error) {
                console.error("❌ [Telegram Photo] Error:", error.message);
                ctx.reply("Yaar, photo dekhne me thodi dikat aa rahi hai. Phir se bhejoge?");
            }
        });

        this.bot.launch();
        console.log("🚀 [Telegram] Bot is running...");

        // Enable graceful stop
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }
}

module.exports = new TelegramService();
