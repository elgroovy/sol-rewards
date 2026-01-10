import TelegramBot from 'node-telegram-bot-api';
import { Config } from '../../config.js';

const bot = new TelegramBot(Config.rewardsTelegramBotToken, { polling: true });

// Example of a JSON structure for the /rewards/notify endpoint sent using CURL
/*
// Message mode - simple message with optional media
curl -X POST http://localhost:3000/rewards/notify \
-H "Content-Type: application/json" \
-d '{
    "messageType": "simple",
    "messageText": "Sample Text",
    "mediaUrl": "https://example.com/image.jpg",
    "isAnimated": false
}'

// Rewards mode - reward distribution notifications
curl -X POST http://localhost:3000/rewards/notify \
-H "Content-Type: application/json" \
-d '{
    "messageType": "rewards",
    "wallets": [
        {
            "walletAddress": "3fA1bC2dE4FgH5IjK6LmN7OpQ8RsT9UvWxYzA1B2",
            "amountEarned": 0.000123456,
            "tokenSymbol": "SOL"
        }
    ],
    "transactionUrl": "https://solscan.io/tx/fake_transaction_url"
}'
*/

// Sends notifications to the Telegram bot
export async function notify(req, res) {
    const messageType = req.body.messageType;

    if (!messageType) {
        return res.status(400).send({ success: false, error: 'Invalid JSON structure. Ensure that messageType is provided.' });
    }

    let promise;

    if (messageType === 'simple') {
        const messageText = req.body.messageText || '';
        const mediaUrl = req.body.mediaUrl || '';
        const isAnimated = req.body.isAnimated || false;

        let formattedMessage = `⚙️ *SYSTEM NOTIFICATION* ⚙️\n\n`;
        formattedMessage += `${messageText}`;

        // Send image/GIF along with the formatted text
        if (isAnimated) {
            promise = bot.sendAnimation(Config.telegramChatId, mediaUrl, {
                caption: formattedMessage,
                parse_mode: 'Markdown'
            });
        } else {
            promise = bot.sendPhoto(Config.telegramChatId, mediaUrl, {
                caption: formattedMessage,
                parse_mode: 'Markdown'
            });
        }
    } else if (messageType === 'rewards') {
        const { wallets, transactionUrl } = req.body;

        if (!wallets || !Array.isArray(wallets) || !transactionUrl) {
            return res.status(400).send({ success: false, error: 'Invalid JSON structure. Ensure wallets and transactionUrl are provided for rewards mode.' });
        }

        let formattedMessage = `\n\n*System Status:* Online\n\n*Distribution Cycle:* Complete\n\n`;

        let txTotal = 0.0;

        wallets.forEach((wallet, index) => {
            const { walletAddress, amountEarned, tokenSymbol } = wallet;

            txTotal += amountEarned;

            // Format wallet address with ellipsis
            const formattedWalletAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

            // Generate Solscan URL for the wallet
            const solScanUrl = `https://solscan.io/account/${walletAddress}`;

            // Add wallet details to the message
            formattedMessage += `🔸 [${formattedWalletAddress}](${solScanUrl})  ${amountEarned.toFixed(6)} ${tokenSymbol}\n`;
        });

        // Add the transaction URL at the bottom
        formattedMessage += `━━━━━━━━━━━━━━━\n💲 [TX](${transactionUrl})`;

        // Add the transaction total
        const tokenSymbol = wallets[0].tokenSymbol || 'Unknown Token';
        formattedMessage += ` Total: ${txTotal.toFixed(6)} ${tokenSymbol} 💲\n\n`;

        const gifUrl = 'http://ipfs.io/ipfs/bafkreihvohw4mva6tqnbjkkp3dwq2lzlfmmos5wig2e2sncjxrkfakbb6e';

        // Send GIF along with the formatted text
        promise = bot.sendAnimation(Config.telegramChatId, gifUrl, {
            caption: formattedMessage,
            parse_mode: 'Markdown'
        });
    } else {
        return res.status(400).send({ success: false, error: 'Invalid messageType. Use "message" or "rewards".' });
    }

    promise.then(() => {
        res.status(200).send({ success: true, message: 'Message sent to Telegram bot.' });
    })
    .catch((error) => {
        console.error('Error sending message to Telegram bot:', error);
        res.status(500).send({ success: false, error: 'Failed to send message to Telegram bot.' });
    });
}