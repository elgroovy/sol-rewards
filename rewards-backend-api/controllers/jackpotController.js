const db = require('../db');

const TelegramBot = require('node-telegram-bot-api');

const token = '8005799591:AAHXQvTg4Cr2oVDrEETjTNhqow9Z9pvX36c';
const chatId = -1002183224911; //-1002333200183;

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;
  
    if (messageText === '/jackpot') {
        const msg = `Great\\!`;
        console.log(msg);
      bot.sendMessage(chatId, msg, {parse_mode: 'MarkdownV2'});
    }
});

// Example of a JSON structure for the /api/jackpots/notify endpoint sent using CURL
/*
curl -X POST http://localhost:3000/api/jackpots/notify \
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

    let formattedMessage = `💲 *${messageType.toUpperCase()} NOTIFICATION* 💲\n\nTurns out, testing pays. Who knew? 🤫\n\n`;

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

    //console.log(formattedMessage);

    const gifUrl = 'http://ipfs.io/ipfs/bafybeihi4r7z36d6rkxrd3ftyh4oxahhrmw43jhzmotb72itihgswnr46a'; // Replace with your GIF URL

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

    /*bot.sendMessage(chatId, formattedMessage, { parse_mode: 'Markdown', link_preview_options: {"is_disabled":true}})
        .then(() => {
            res.status(200).send({ success: true, message: 'Message sent to Telegram bot.' });
        })
        .catch((error) => {
            console.error('Error sending message to Telegram bot:', error);
            res.status(500).send({ success: false, error: 'Failed to send message to Telegram bot.' });
        });*/
};

async function test(req, res) {
    res.status(200).send("<h1>Hello, from Jackpot!</h1>");
};

async function getEligibleHolders(req, res) {
    try {
        const [rows] = await db.query('SELECT * FROM eligible_holders');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Database error', error: err });
    }
};

async function updateHolders(req, res) {
    const snapshotAddresses = req.body.addresses;

    if (!snapshotAddresses || !Array.isArray(snapshotAddresses)) {
        return res.status(400).json({ error: 'Invalid or missing addresses array' });
    }

    try {

        // TODO: make addresses unique?
        //const uniqueAddresses = [...new Set(snapshotAddresses)];

        // Create a temporary table.
        await db.query('DROP TEMPORARY TABLE IF EXISTS temp_snapshot;');
        await db.query('CREATE TEMPORARY TABLE temp_snapshot (wallet_address VARCHAR(255) UNIQUE)');

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

module.exports = {
    notify,
    getEligibleHolders,
    updateHolders,
    test
};