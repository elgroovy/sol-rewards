import * as db from "../../db.js";
import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../../config.js';

const bot = new TelegramBot(Config.jackpotTelegramBotToken, { polling: true });

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
  
    if (messageText === '/jackpot') {
        const msg = `You meant JackBOT\\? That\\'s me\\!`;
        console.log(msg);
      bot.sendMessage(chatId, msg, {parse_mode: 'MarkdownV2'});
    }
});

// Example of a JSON structure for the /jackpots/notify endpoint sent using CURL
/*
curl -X POST http://localhost:3000/jackpots/notify \
-H "Content-Type: application/json" \
-d '{
    "messageType": "simple",
    "messageText": "Sample Text",
    "mediaUrl": "https://example.com/image.jpg",
    "isAnimated": false
}'
*/

// Sends notifications to the Telegram bot
export async function notify(req, res) {

    console.log("Received notification request:", req.body);
    const messageType = req.body.messageType;

    if (!messageType) {
        return res.status(400).send({ success: false, error: 'Invalid JSON structure. Ensure that the required fields are provided.' });
    }

    const messageText = req.body.messageText || '';
    const mediaUrl = req.body.mediaUrl || '';
    const isAnimated = req.body.isAnimated || false;

    let promise;
    if (messageType === 'simple') {
        let formattedMessage = `🎲 *JackBOT NoTiFiCaTioN* 🎲\n\n`;
        formattedMessage += `${messageText}`;

        // Send image/GIF along with the formatted text
        if (isAnimated) {
            promise = bot.sendAnimation(Config.telegramChatId, mediaUrl, {
                caption: formattedMessage,
                parse_mode: 'Markdown'
            });
        }
        else {
            promise = bot.sendPhoto(Config.telegramChatId, mediaUrl, {
                caption: formattedMessage,
                parse_mode: 'Markdown'
            });
        }
    }
    else if (messageType === 'command') {
        promise = bot.sendMessage(Config.telegramChatId, messageText);
    }
    promise.then(() => {
        res.status(200).send({ success: true, message: 'Message sent to Telegram bot.' });
    })
    .catch((error) => {
        console.error('Error sending message to Telegram bot:', error);
        res.status(500).send({ success: false, error: 'Failed to send message to Telegram bot.' });
    });
}

export async function getEligibleHolders(req, res) {
    try {
        const [rows] = await db.query('SELECT wallet_address FROM eligible_holders');
        const holders = rows.map(row => row.wallet_address); // Extract only the wallet_address values
        res.json({ holders: holders });
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err });
    }
}

export async function updateEligibleHolders(req, res) {
    const snapshotAddresses = req.body.addresses;

    if (!snapshotAddresses || !Array.isArray(snapshotAddresses)) {
        return res.status(400).json({ error: 'Invalid or missing addresses array' });
    }

    try {

        // TODO: make addresses unique?
        //const uniqueAddresses = [...new Set(snapshotAddresses)];

        // Create a temporary table.
        await db.query('DROP TEMPORARY TABLE IF EXISTS temp_snapshot;');
        await db.query('CREATE TEMPORARY TABLE temp_snapshot (wallet_address VARCHAR(255) UNIQUE) COLLATE utf8mb4_0900_ai_ci');

        // Insert snapshot into temporary table.
        const snapshotValues = /*uniqueAddresses*/snapshotAddresses.map((address) => [address]);
        if (snapshotValues.length > 0) {
            await db.query('INSERT INTO temp_snapshot (wallet_address) VALUES ?', [snapshotValues]);
        }

        // Find new addresses using SQL.
        const [newHolders] = await db.query(
        'SELECT temp_snapshot.wallet_address FROM temp_snapshot LEFT JOIN eligible_holders ON temp_snapshot.wallet_address = eligible_holders.wallet_address WHERE eligible_holders.wallet_address IS NULL'
        );

        const newAddresses = newHolders.map(holder => holder.wallet_address);

        // Update the main table.
        await db.query('TRUNCATE TABLE eligible_holders;');
        await db.query('INSERT INTO eligible_holders SELECT * from temp_snapshot;');

        // Drop the temporary table.
        await db.query('DROP TEMPORARY TABLE temp_snapshot;');

        res.json({ newHolders: newAddresses });
    } catch (error) {
        console.error('Error processing new holders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
