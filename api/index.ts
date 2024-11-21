require('dotenv').config();
const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => res.send("Express on Vercel"));

app.post("/send-telegram", async (req, res) => {
  try {
    const {
      action, // 'BUY' atau 'SELL'
      tokenName,
      amount,
      price,
      wallet,
    } = req.body;

    console.log("hereee", JSON.stringify(req.body, null, 2));
    // atau untuk object spesifik
    console.log("accountData:", JSON.stringify(req.body[0].accountData, null, 2));
    console.log("instructions:", JSON.stringify(req.body[0].instructions, null, 2));
    console.log("tokenTransfers:", JSON.stringify(req.body[0].tokenTransfers, null, 2));
// ... existing code ...

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    let actionIcon = '';
    let actionText = '';
    if (action === 'BUY') {
      actionText = 'BUY 🟢'; // Green circle for BUY
    } else if (action === 'SELL') {
      actionText = 'SELL 🔴'; // Red circle for SELL
    }

    // Format pesan untuk tracking
    const message = `
      🔔 *${actionText} ALERT*
      Token: \`${tokenName}\`
      Amount: \`${amount} SOL\`
      Price: \`$${price}\`
      Wallet: \`${wallet}\`
      Time: \`${new Date().toLocaleString()}\`
    `;

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;