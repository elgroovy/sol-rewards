import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import { Config } from '../config.js';

const chatId = Number(Config.telegramChatId);
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

function loadDocs() {
    const docsDir = path.join(process.cwd(), '..', 'docs');
    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

    let docs = '';
    for (const file of files) {
        const content = fs.readFileSync(path.join(docsDir, file), 'utf-8');
        docs += `\n## ${file.replace('.md', '')}\n${content}\n`;
    }
    return docs;
}

async function main() {
    const ai = new GoogleGenAI({ apiKey: Config.googleAiApiKey });

    const loadSystemInstruction = () => {
        return fs.readFileSync('system_instruction.txt', 'utf-8') + loadDocs();
    };

    let systemInstruction = loadSystemInstruction();

    let chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: {
            systemInstruction: systemInstruction,
        },
        history: [],
    });

    const resetChat = (newInstruction = null) => {
        if (newInstruction) {
            systemInstruction = newInstruction;
        }
        chat = ai.chats.create({
            model: "gemini-2.0-flash",
            config: {
                systemInstruction: systemInstruction,
            },
            history: [],
        });
        console.log('Chat history reset.');
    };

    const bot = new TelegramBot(Config.guruBotToken, { polling: true });

    let inactivityTimer;

    bot.on('message', async (msg) => {
        // Reset the inactivity timer on every message
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(resetChat, INACTIVITY_TIMEOUT);

        // Handle /refresh command
        if (msg.text === '/refresh') {
            const newInstruction = loadSystemInstruction();
            resetChat(newInstruction);
            console.log('Documentation refreshed.');
            bot.sendMessage(msg.chat.id, 'Knowledge refreshed.');
            return;
        }

        const botInfo = await bot.getMe();
        console.log('Received message:', msg.text, 'from chat:', msg.chat.id);

        // Respond when the bot is mentioned or replied to
        if (msg.text && (msg.text.includes(`@${botInfo.username}`) || msg.reply_to_message?.from?.username === botInfo.username)) {
            console.log('Responding to message...');
            const escapeMarkdownV2 = (text) => {
                return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
            };

            // Include context from the replied-to message
            let messageToSend = msg.text;
            if (msg.quote?.text) {
                // User quoted a specific portion of the bot's message
                messageToSend = `[User quoted this specific part of your message: "${msg.quote.text}"]\n\nUser's question/comment: ${msg.text}`;
            } else if (msg.reply_to_message?.text) {
                // User replied to the full message
                messageToSend = `[User is replying to your previous message: "${msg.reply_to_message.text}"]\n\nUser's reply: ${msg.text}`;
            }

            const response = await chat.sendMessage({ message: messageToSend });
            const escapedText = escapeMarkdownV2(response.text);
            bot.sendMessage(chatId, escapedText, { parse_mode: 'MarkdownV2' });
        }
    });
}

main().catch((error) => { console.error(error) });
