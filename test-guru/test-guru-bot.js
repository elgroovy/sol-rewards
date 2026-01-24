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

function loadWelcomeTemplate() {
    try {
        return fs.readFileSync('welcome_template.md', 'utf-8');
    } catch (error) {
        console.error('Error loading welcome template:', error);
        return '{PERSONALIZED_GREETING}\n\nWelcome to the Test Rewards Token community. Feel free to ask me any questions by mentioning me in the chat.';
    }
}

function getUserDisplayName(from) {
    if (!from) return 'Unknown';
    const firstName = from.first_name || '';
    const lastName = from.last_name || '';
    const username = from.username || '';
    return username || (firstName + (lastName ? ' ' + lastName : '')).trim() || 'Unknown';
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');
}

async function handleMessage(msg, ctx) {
    // Only respond in the configured chat
    if (msg.chat.id !== chatId) return;

    // Reset the inactivity timer on every message
    if (ctx.inactivityTimer) clearTimeout(ctx.inactivityTimer);
    ctx.inactivityTimer = setTimeout(() => {
        ctx.resetChat();
        ctx.isAttentive = false;
        console.log('Chat reset due to inactivity. Attention mode off.');
    }, INACTIVITY_TIMEOUT);

    // Handle /refresh command (admin-only)
    if (msg.text === '/refresh') {
        try {
            const member = await ctx.bot.getChatMember(msg.chat.id, msg.from.id);
            if (!['administrator', 'creator'].includes(member.status)) {
                return; // Silently ignore non-admins
            }
            const newInstruction = ctx.loadSystemInstruction();
            ctx.welcomeTemplate = loadWelcomeTemplate();
            ctx.resetChat(newInstruction);
            console.log('Documentation and welcome template refreshed.');
            ctx.bot.sendMessage(msg.chat.id, 'Knowledge refreshed.');
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
        return;
    }

    const botInfo = await ctx.bot.getMe();
    const userDisplayName = getUserDisplayName(msg.from);
    console.log('Received message:', msg.text, 'from:', userDisplayName, 'chat:', msg.chat.id);

    // Check if bot is directly mentioned or replied to
    const isMentioned = msg.text && msg.text.includes(`@${botInfo.username}`);
    const isRepliedTo = msg.reply_to_message?.from?.username === botInfo.username;

    // If mentioned or replied to, activate attention mode
    if (isMentioned || isRepliedTo) {
        ctx.isAttentive = true;
        if (ctx.attentionTimer) clearTimeout(ctx.attentionTimer);
        ctx.attentionTimer = setTimeout(() => {
            ctx.isAttentive = false;
            console.log('Attention mode expired.');
        }, INACTIVITY_TIMEOUT);
        console.log('Attention mode activated for', INACTIVITY_TIMEOUT / 60000, 'minutes');
    }

    // Determine if bot should respond
    let shouldRespond = false;
    if (isMentioned || isRepliedTo) {
        shouldRespond = true;
    } else if (ctx.isAttentive && msg.text) {
        // In attention mode - use AI to decide if message is addressed to the bot (with lower threshold)
        shouldRespond = await ctx.shouldRespondToMessage(msg.text, true);
        if (shouldRespond) {
            console.log('Attention mode: Decided to respond to message');
        }
    }

    if (shouldRespond && msg.text) {
        console.log('Responding to message from', userDisplayName);

        // Build message with user context
        let messageToSend = `[Message from user "${userDisplayName}"]\n\n`;

        if (msg.quote?.text) {
            // User quoted a specific portion of the bot's message
            messageToSend += `[User quoted this specific part of your message: "${msg.quote.text}"]\n\nUser's question/comment: ${msg.text}`;
        } else if (msg.reply_to_message?.text || msg.reply_to_message?.caption) {
            // User replied to the full message (text or caption for media messages)
            const replyContent = msg.reply_to_message.text || msg.reply_to_message.caption;
            messageToSend += `[User is replying to your previous message: "${replyContent}"]\n\nUser's reply: ${msg.text}`;
        } else {
            messageToSend += msg.text;
        }

        const response = await ctx.chat.sendMessage({ message: messageToSend });
        // Strip any bracket notation the AI might echo back (e.g. [Message from user "..."])
        let responseText = response.text.replace(/\[Message from user "[^"]*"\]\s*/gi, '');
        // Also strip usernames in brackets like [eXper1enced]
        responseText = responseText.replace(/\[([^\]]+)\]/g, '$1');

        // Extract and preserve <a> tags before escaping
        const linkPlaceholders = [];
        responseText = responseText.replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, (_match, href, text) => {
            const placeholder = `__LINK_${linkPlaceholders.length}__`;
            linkPlaceholders.push(`<a href="${href}">${escapeHtml(text)}</a>`);
            return placeholder;
        });

        // Convert user's name to clickable mention (case-insensitive)
        const userId = msg.from.id;
        const nameRegex = new RegExp(`\\b${userDisplayName}\\b`, 'gi');
        const userMention = `<a href="tg://user?id=${userId}">${escapeHtml(userDisplayName)}</a>`;
        responseText = responseText.replace(nameRegex, userMention);
        // Escape the rest of the text for HTML
        let finalText = escapeHtml(responseText);
        // Re-insert the user mention (unescape it)
        finalText = finalText.replace(escapeHtml(userMention), userMention);
        // Re-insert preserved links
        linkPlaceholders.forEach((link, i) => {
            finalText = finalText.replace(`__LINK_${i}__`, link);
        });
        ctx.bot.sendMessage(msg.chat.id, finalText, { parse_mode: 'HTML' });
    }
}

async function handleNewChatMembers(msg, ctx) {
    console.log('New chat members event received from chat:', msg.chat.id);

    // Only respond in the configured chat
    if (msg.chat.id !== chatId) return;

    console.log('New chat members detected:', msg.new_chat_members);

    for (const newMember of msg.new_chat_members) {
        // Skip bots
        if (newMember.is_bot) {
            console.log('Skipping bot:', newMember.first_name);
            continue;
        }

        try {
            // Get user details
            const firstName = newMember.first_name || '';
            const lastName = newMember.last_name || '';
            const fullName = (firstName + (lastName ? ' ' + lastName : '')).trim();
            const userName = newMember.username || '';
            const userId = newMember.id;
            console.log(`Welcoming new member: ${fullName} (@${userName})`);

            // Generate personalized greeting
            const personalizedGreeting = await ctx.generatePersonalizedGreeting();

            // Determine best display name: username if available, otherwise full name
            const displayName = userName || fullName;

            // Create user mention using HTML format
            const userMention = `<a href="tg://user?id=${userId}">${escapeHtml(displayName)}</a>`;

            // Replace placeholders in template
            let welcomeMessage = ctx.welcomeTemplate
                .replace(/{PERSONALIZED_GREETING}/g, personalizedGreeting)
                .replace(/{USERNAME}/g, userMention);

            // Escape remaining content (but preserve the user mention HTML tags)
            let escapedMessage = escapeHtml(welcomeMessage);

            // Re-insert the user mention (unescape it)
            escapedMessage = escapedMessage.replace(escapeHtml(userMention), userMention);

            // Send welcome message with animation (supports MP4/GIF)
            // Use cached file_id to avoid uploading the same video multiple times
            let sentMessage;
            if (ctx.welcomeAnimationFileId) {
                // Use cached file_id
                sentMessage = await ctx.bot.sendAnimation(msg.chat.id, ctx.welcomeAnimationFileId, {
                    caption: escapedMessage,
                    parse_mode: 'HTML'
                });
            } else {
                // First time: upload file and cache the file_id
                const welcomeMediaPath = path.join(process.cwd(), 'welcome.mp4');
                sentMessage = await ctx.bot.sendAnimation(msg.chat.id, welcomeMediaPath, {
                    caption: escapedMessage,
                    parse_mode: 'HTML'
                });
                // Cache the file_id for future use
                // Note: Telegram may return either 'animation' or 'video' field depending on the file
                const mediaField = sentMessage.animation || sentMessage.video;
                if (mediaField && mediaField.file_id) {
                    ctx.welcomeAnimationFileId = mediaField.file_id;
                    console.log('Welcome animation file_id cached:', ctx.welcomeAnimationFileId);
                } else {
                    console.log('Could not extract file_id from response');
                }
            }
            console.log(`Welcome message sent to ${fullName}`);

            // Activate attention mode after welcoming a new member
            ctx.isAttentive = true;
            if (ctx.attentionTimer) clearTimeout(ctx.attentionTimer);
            ctx.attentionTimer = setTimeout(() => {
                ctx.isAttentive = false;
                console.log('Attention mode expired.');
            }, INACTIVITY_TIMEOUT);
            console.log('Attention mode activated for', INACTIVITY_TIMEOUT / 60000, 'minutes (new member welcomed)');
        } catch (error) {
            console.error('Error sending welcome message:', error);
        }
    }
}

async function main() {
    const ai = new GoogleGenAI({ apiKey: Config.googleAiApiKey });

    const loadSystemInstruction = () => {
        return fs.readFileSync('system_instruction.txt', 'utf-8') + loadDocs();
    };

    let systemInstruction = loadSystemInstruction();

    const ctx = {
        bot: new TelegramBot(Config.guruBotToken, {
            polling: {
                params: {
                    allowed_updates: ['message', 'chat_member']
                }
            }
        }),
        chat: null,
        welcomeTemplate: loadWelcomeTemplate(),
        welcomeAnimationFileId: null,
        inactivityTimer: null,
        attentionTimer: null,
        isAttentive: false,
        loadSystemInstruction,
        resetChat: null,
        shouldRespondToMessage: null,
        generatePersonalizedGreeting: null,
    };

    ctx.chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: {
            systemInstruction: systemInstruction,
        },
        history: [],
    });

    ctx.resetChat = (newInstruction = null) => {
        if (newInstruction) {
            systemInstruction = newInstruction;
        }
        ctx.chat = ai.chats.create({
            model: "gemini-2.0-flash",
            config: {
                systemInstruction: systemInstruction,
            },
            history: [],
        });
        console.log('Chat history reset.');
    };

    ctx.shouldRespondToMessage = async (messageText, isInAttentionMode = false) => {
        try {
            const checkChat = ai.chats.create({
                model: "gemini-2.0-flash",
                config: {
                    systemInstruction: "You analyze messages to determine if they are questions or comments that need a response from an AI assistant in a crypto community chat. Respond with only 'YES' or 'NO'.",
                },
                history: [],
            });

            let prompt;
            if (isInAttentionMode) {
                // More permissive in attention mode - assume short follow-ups are directed at the bot
                prompt = `The assistant was recently mentioned and is in an active conversation. Should it respond to this follow-up message? Be permissive - short responses like "right?", "sir?", "yes", "thanks", follow-up questions, or anything that could reasonably be part of the ongoing conversation should get a YES. Only say NO for messages clearly directed at other users or completely unrelated spam.

Message: "${messageText}"

Reply with only YES or NO.`;
            } else {
                prompt = `Is this message a question or comment that would benefit from a response by an AI assistant? Consider: Is it asking for information, help, or clarification? Is it a greeting directed at the assistant? Ignore casual chat between users, memes, emojis-only messages, or statements not seeking a response.

Message: "${messageText}"

Reply with only YES or NO.`;
            }

            const response = await checkChat.sendMessage({ message: prompt });
            const answer = response.text.trim().toUpperCase();
            return answer === 'YES';
        } catch (error) {
            console.error('Error checking if should respond:', error);
            return false;
        }
    };

    ctx.generatePersonalizedGreeting = async () => {
        try {
            const prompt = `Write a short, warm message (2-3 sentences) for someone joining a crypto token community. Be friendly and use simple nature metaphors. No semicolons. Don't mention the user's name. Don't start with "Welcome" or "Greetings". Sound human, not like AI. Plain text only. End with letting them know they can mention you in the chat if they have any questions about the project - phrase this differently each time (e.g. "just tag me", "mention me anytime", "ping me if you need help", etc).`;

            const welcomeChat = ai.chats.create({
                model: "gemini-2.0-flash",
                config: {
                    systemInstruction: "You write short, friendly messages with simple metaphors. Sound natural and human. Never use semicolons. Plain text only, no markdown.",
                },
                history: [],
            });

            const response = await welcomeChat.sendMessage({ message: prompt });
            return response.text;
        } catch (error) {
            console.error('Error generating personalized greeting:', error);
            return `May your journey here be rewarding. Great things await. Tag me anytime if you have questions!`;
        }
    };

    ctx.bot.on('message', (msg) => handleMessage(msg, ctx));
    ctx.bot.on('new_chat_members', (msg) => handleNewChatMembers(msg, ctx));

    // Handle chat_member updates (more reliable for larger groups)
    ctx.bot.on('chat_member', (update) => {
        console.log('chat_member update received');

        const oldMember = update.old_chat_member;
        const newMember = update.new_chat_member;

        // Check if someone joined: is_member changed from false to true, or status became 'member'/'administrator'
        const wasInChat = oldMember?.is_member || ['member', 'administrator', 'creator'].includes(oldMember?.status);
        const isNowInChat = newMember?.is_member || ['member', 'administrator', 'creator'].includes(newMember?.status);

        if (!wasInChat && isNowInChat) {
            console.log('User joined the chat:', newMember.user.first_name);
            const fakeMsg = {
                chat: update.chat,
                new_chat_members: [newMember.user]
            };
            handleNewChatMembers(fakeMsg, ctx);
        }
    });
}

main().catch((error) => { console.error(error) });
