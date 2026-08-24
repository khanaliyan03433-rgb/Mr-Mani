# WhatsApp Bot - Anti-Link, Kick & Music Player

Simple WhatsApp bot with:
- 🔗 **Anti-Link**: Auto-deletes group invite links (non-admins)
- 👢 **Admin Kick**: `.kick @user` removes members (admin only)
- 🎵 **Music Player**: `.play <song>` plays from YouTube
- 💾 **Session Persistence**: Stays logged in across restarts

---

## Quick Deploy on Replit (Recommended - Free 24/7)

### 1. Fork/Import to Replit
- Go to [replit.com](https://replit.com)
- Click **"Create Repl"** → **"Import from GitHub"**
- Or create new Repl → **Node.js** → Upload these files

### 2. Add Required Secrets (Environment Variables)
In Replit, go to **Tools → Secrets** and add:
```
PUPPETEER_EXECUTABLE_PATH = /nix/store/*/bin/chromium
```

### 3. Run
Click **Run** button. First run will show QR code in console.

### 4. Keep Alive (Optional)
Add to `index.js` before `client.initialize()`:
```javascript
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, () => console.log('Web server on port 3000'));
```
Then add `express` to package.json dependencies.

---

## Local Development

### Prerequisites
- Node.js 18+
- Chrome/Chromium installed

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Run bot
npm start
```

### First Run
1. QR code appears in terminal
2. Open WhatsApp → Linked Devices → Link Device
3. Scan QR code
4. Bot saves session in `.wwebjs_auth/` folder

---

## Configuration

Edit `index.js` - **BOT_PHONE_NUMBER** (line ~8) and **ADMIN_NUMBERS**:
```javascript
const BOT_PHONE_NUMBER = '923XXXXXXXXX';  // Your WhatsApp number (country code + number)
const ADMIN_NUMBERS = [`${BOT_PHONE_NUMBER}@c.us`];
const USE_PAIR_CODE = true;  // true = pair code, false = QR code
```

**Format**: Country code + number (e.g., `923001234567` for Pakistan, `15551234567` for USA)

---

## Login Methods

### Option 1: QR Code (Default)
```bash
npm start
```
Scan QR code in terminal with WhatsApp → Linked Devices → Link Device

### Option 2: Pair Code (Easier - No Camera Needed)
```bash
# 1. Set USE_PAIR_CODE = true in index.js (already set)
# 2. Run pair code generator
node pair.js
```
**Output:**
```
🔗 ===== PAIR CODE =====
📱 Pair Code: ABC-DEF-GHI
📲 Open WhatsApp → Linked Devices → Link with Phone Number
📞 Enter phone: 923001234567
========================
```

3. Open WhatsApp → **Linked Devices** → **Link with Phone Number**
4. Enter your **phone number** (same as BOT_PHONE_NUMBER)
5. Enter the **pair code** shown
6. Done! Session saved automatically

**After first login**, just run `npm start` - it uses saved session.

---

## Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `.kick @user` | Remove user from group | Admin only |
| `.play <song>` | Play song from YouTube | Everyone |
| `.p <song>` | Shortcut for play | Everyone |
| `.help` / `.menu` | Show all commands | Everyone |
| `.ping` | Check bot status | Everyone |

---

## How It Works for Users

### For Group Admins:
1. Add bot to group
2. **Make bot admin** (required for kick)
3. Add your number to `ADMIN_NUMBERS` in code
4. Use `.kick @user` to remove members

### For Regular Users:
- Use `.play song name` to get music
- Bot auto-deletes any WhatsApp group links they send
- Use `.help` to see commands

---

## Troubleshooting

**QR not scanning?**
- Clear `.wwebjs_auth` folder and restart
- Ensure stable internet

**Kick not working?**
- Bot MUST be group admin
- Your number must be in ADMIN_NUMBERS

**Music not playing?**
- ytdl-core may need update: `npm update ytdl-core`
- Some videos blocked by region/copyright

**Bot disconnects on Replit?**
- Add UptimeRobot monitor to your Repl URL
- Or use `express` keep-alive server (see above)

---

## File Structure
```
├── index.js          # Main bot code
├── pair.js           # Pair code generator
├── package.json      # Dependencies
├── .replit          # Replit config
├── replit.nix       # System dependencies
└── .wwebjs_auth/    # Session data (auto-created)
```

---

## Deploy to Vercel (Not Recommended)

WhatsApp bots need **persistent WebSocket connections** - Vercel serverless functions timeout after 10-60s. Use **Replit**, **Railway**, **Render**, or **VPS** instead.

---

## Support

- **Library**: [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- **Music**: Uses `ytdl-core` for YouTube audio
- **Session**: `LocalAuth` saves login locally

---

**Ready in 2 minutes on Replit!** 🚀