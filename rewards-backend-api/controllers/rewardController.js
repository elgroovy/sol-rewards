const TelegramBot = require('node-telegram-bot-api');

const token = '7665493064:AAE5oXMgvUFp3x6tDzQEVSygelEVYavDWDQ';
const chatId = -1002333200183;

const bot = new TelegramBot(token, { polling: true });

// Example of a JSON structure for the /api/rewards/notify endpoint sent using CURL
/*
curl -X POST http://localhost:3000/api/rewards/notify \
-H "Content-Type: application/json" \
-d '{
    "messageType": "rewards",
    "wallets": [
        {
            "walletAddress": "3fA1bC2dE4FgH5IjK6LmN7OpQ8RsT9UvWxYzA1B2",
            "solEarned": 0.000123456
        }
    ],
    "transactionUrl": "https://solscan.io/tx/fake_transaction_url"
}'
*/

// Sends notifications to the Telegram bot
const notify = async (req, res) => {
    const { messageType, wallets, transactionUrl } = req.body;

    if (!messageType || !wallets || !Array.isArray(wallets) || !transactionUrl) {
        return res.status(400).send({ success: false, error: 'Invalid JSON structure. Ensure messageType, wallets, and transactionUrl are provided.' });
    }

    let formattedMessage = `💲 *${messageType.toUpperCase()} NOTIFICATION* 💲\n\nTo Test or Not to Test, That is the Question... 🤔\n\n`;

    let txTotal = 0.0;

    wallets.forEach((wallet, index) => {
        const { walletAddress, solEarned } = wallet;

        txTotal += solEarned;

        // Format wallet address with ellipsis
        const formattedWalletAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

        // Generate Solscan URL for the wallet
        //const solScanUrl = `https://solscan.io/account/${walletAddress}`;

        // Add wallet details to the message
        //formattedMessage += `🔸 [${formattedWalletAddress}](${solScanUrl}) \`${solEarned.toFixed(9)}\` SOL\n`;
        formattedMessage += `🔸 ${formattedWalletAddress} \`${solEarned.toFixed(9)}\` SOL\n`;
    });

    // Add the transaction URL at the bottom
    formattedMessage += `\n👉 [TX](${transactionUrl})`;

    // Add the transaction total
    formattedMessage += ` Total: \`${txTotal.toFixed(6)}\` SOL 👈\n\n`;

    const gifUrl = 'http://ipfs.io/ipfs/bafybeihi4r7z36d6rkxrd3ftyh4oxahhrmw43jhzmotb72itihgswnr46a';

    // Send GIF along with the formatted text
    bot.sendAnimation(chatId, gifUrl, {
        caption: formattedMessage,
        parse_mode: 'Markdown'
    })
    .then(() => {
        res.status(200).send({ success: true, message: 'GIF and message sent to Telegram bot.' });
    })
    .catch((error) => {
        console.error('Error sending GIF and message to Telegram bot:', error);
        res.status(500).send({ success: false, error: 'Failed to send GIF and message to Telegram bot.' });
    });
};

module.exports = {
    notify
};