require('dotenv').config();
const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => res.send("Express on Vercel"));

app.post("/send-telegram", async (req, res) => {
  try {
    if (req.body && req.body[0]) {
      // Detailed logging for accountData
      if (req.body[0].accountData) {
        console.log("\n=== ACCOUNT DATA ===");
        req.body[0].accountData.forEach((acc, index) => {
          console.log(`Account ${index}:`, JSON.stringify(acc, null, 2));
        });
      }

      // Detailed logging for instructions
      if (req.body[0].instructions) {
        console.log("\n=== INSTRUCTIONS ===");
        req.body[0].instructions.forEach((inst, index) => {
          console.log(`Instruction ${index}:`, JSON.stringify(inst, null, 2));
        });
      }

      // Detailed logging for tokenTransfers
      if (req.body[0].tokenTransfers) {
        console.log("\n=== TOKEN TRANSFERS ===");
        req.body[0].tokenTransfers.forEach((transfer, index) => {
          console.log(`Transfer ${index}:`, JSON.stringify(transfer, null, 2));
        });
      }
    }

    // Signature logging
    const signature = req.body[0].signature;
    if(signature) {
      console.log("SIGNATURE", signature);
    }


    // Original logging
    console.log("\n=== FULL REQUEST BODY ===");
    console.log("LOG CUY", JSON.stringify(req.body, null, 2));
    
    let action, tokenName, amount, wallet;
    const MIN_SOL_THRESHOLD = 0.2;

    if (req.body && Array.isArray(req.body) && req.body.length > 0) {
      const accountData = req.body[0].accountData;
      const tokenChanges = accountData.filter(acc => acc.tokenBalanceChanges.length > 0);
      
      // Cek pergerakan SOL
      const solSpender = accountData
        .filter(acc => acc.nativeBalanceChange < 0)
        .reduce((total, acc) => total + Math.abs(acc.nativeBalanceChange), 0) / 1e9;

      if (solSpender > MIN_SOL_THRESHOLD && tokenChanges.length > 0) {
        // Cari account yang mengalami perubahan SOL negatif
        const solSpenderAccount = accountData.find(acc => acc.nativeBalanceChange < 0);
        
        tokenChanges.forEach(acc => {
          const tokenChange = parseFloat(acc.tokenBalanceChanges[0].rawTokenAmount.tokenAmount);
          
          // Jika account yang mengeluarkan SOL mendapat token, berarti BUY
          if (solSpenderAccount && 
              acc.tokenBalanceChanges[0].userAccount === solSpenderAccount.account && 
              tokenChange > 0) {
            action = 'BUY';
          } 
          // Jika account yang mengeluarkan SOL kehilangan token, berarti SELL
          else if (solSpenderAccount && 
                   acc.tokenBalanceChanges[0].userAccount === solSpenderAccount.account && 
                   tokenChange < 0) {
            action = 'SELL';
          }
          
          tokenName = acc.tokenBalanceChanges[0].mint;
          amount = solSpender;
          wallet = acc.tokenBalanceChanges[0].userAccount; // Gunakan userAccount sebagai wallet
        });

        if (action) {
          const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
          const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

          let actionText = action === 'BUY' ? '🟢 Whales Buy!' : '🔴 Whales Sell!';
          let emojiLine = '🐋'.repeat(10);
          const message = `${actionText}
${emojiLine}

🔀 ${amount.toFixed(2)} SOL
👤 ${wallet.slice(0, 6)}...${wallet.slice(-4)} | [Account](https://solscan.io/account/${wallet})
📈 [Chart](https://birdeye.so/token/${tokenName}?chain=solana)
🔍 [View Transaction](https://solscan.io/tx/${signature})

🟣 | HANGRU BOT TRADING by @sopyan\\_alansory`;

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
        } else {
          res.json({ success: true, message: "Not a buy/sell transaction" });
        }
      } else {
        res.json({ success: true, message: "Transaction below 0.2 SOL threshold" });
      }
    } else {
      res.json({ success: false, message: "Invalid data format" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
