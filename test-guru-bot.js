import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GOOGLE_AI_API_KEY = 'AIzaSyDTz-epGmwh0ZQ9muOzfME8HWBt_pyTGt8';
const TG_BOT_TOKEN = '7940512914:AAE5IGAtTQ7urC8LvPn-RFOQk15VHNdo5ME';

async function main() {
    const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY});
    const systemInstruction = fs.readFileSync('system_instruction.txt', 'utf-8');

    const chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: {
            systemInstruction: systemInstruction,
        },
        history: [],
    });

    const bot = new TelegramBot(TG_BOT_TOKEN, { polling: true });

    bot.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const botInfo = await bot.getMe();

        // Respond when the bot is mentioned or replied to
        if (msg.text && (msg.text.includes(`@${botInfo.username}`) || msg.reply_to_message?.from?.username === botInfo.username)) {
            const response = await chat.sendMessage({ message: msg.text });
            bot.sendMessage(chatId, response.text);
        }
    });
}

main().catch((error) => { console.error(error) });
