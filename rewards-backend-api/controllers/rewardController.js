import TelegramBot from 'node-telegram-bot-api';

const token = '7665493064:AAE5oXMgvUFp3x6tDzQEVSygelEVYavDWDQ';
const chatId = -1002183224911;//-1002333200183;

const bot = new TelegramBot(token, { polling: true });

// Example of a JSON structure for the /rewards/notify endpoint sent using CURL
/*
curl -X POST http://localhost:3000/rewards/notify \
-H "Content-Type: application/json" \
-d '{
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
    const { wallets, transactionUrl } = req.body;

    if (!wallets || !Array.isArray(wallets) || !transactionUrl) {
        return res.status(400).send({ success: false, error: 'Invalid JSON structure. Ensure wallets, and transactionUrl are provided.' });
    }

    let formattedMessage = `\n\n*System Status:* Online\n\n*Distribution Cycle:* Complete\n\n`;

    let txTotal = 0.0;

    wallets.forEach((wallet, index) => {
        const { walletAddress, amountEarned, tokenSymbol } = wallet;

        txTotal += amountEarned;

        // Format wallet address with ellipsis
        const formattedWalletAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

        // Generate Solscan URL for the wallet
        //const solScanUrl = `https://solscan.io/account/${walletAddress}`;

        // Add wallet details to the message
        formattedMessage += `🔸 ${formattedWalletAddress}  \`${amountEarned.toFixed(6)}\` ${tokenSymbol}\n`;
    });

    // Add the transaction URL at the bottom
    formattedMessage += `\n💲 [TX](${transactionUrl})`;

    // Add the transaction total
    const tokenSymbol = wallets[0].tokenSymbol || 'Unknown Token';
    formattedMessage += ` Total: \`${txTotal.toFixed(6)}\` ${tokenSymbol} 💲\n\n`;

    const gifUrl = 'http://ipfs.io/ipfs/bafkreihvohw4mva6tqnbjkkp3dwq2lzlfmmos5wig2e2sncjxrkfakbb6e';

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
}