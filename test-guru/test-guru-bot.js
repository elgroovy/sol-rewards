import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const GOOGLE_AI_API_KEY = 'AIzaSyDTz-epGmwh0ZQ9muOzfME8HWBt_pyTGt8';
const TG_BOT_TOKEN = '7940512914:AAE5IGAtTQ7urC8LvPn-RFOQk15VHNdo5ME';

const chatId = -1002333200183;
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

async function main() {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });
    const systemInstruction = fs.readFileSync('system_instruction.txt', 'utf-8');

    let chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: {
            systemInstruction: systemInstruction,
        },
        history: [],
    });

    const resetChat = () => {
        chat = ai.chats.create({
            model: "gemini-2.0-flash",
            config: {
                systemInstruction: systemInstruction,
            },
            history: [],
        });
        console.log('Chat history reset due to inactivity.');
    };

    const bot = new TelegramBot(TG_BOT_TOKEN, { polling: true });

    let inactivityTimer;

    bot.on('message', async (msg) => {
        // Reset the inactivity timer on every message
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(resetChat, INACTIVITY_TIMEOUT);

        const botInfo = await bot.getMe();

        // Respond when the bot is mentioned or replied to
        if (msg.text && (msg.text.includes(`@${botInfo.username}`) || msg.reply_to_message?.from?.username === botInfo.username)) {
            const escapeMarkdownV2 = (text) => {
                return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
            };

            const response = await chat.sendMessage({ message: msg.text });
            const escapedText = escapeMarkdownV2(response.text);
            bot.sendMessage(chatId, escapedText, { parse_mode: 'MarkdownV2' });
        }
    });
}

main().catch((error) => { console.error(error) });
