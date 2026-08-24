const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Auto-detect Chromium path for Replit
let puppeteerArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
];

// On Replit, use system chromium
if (process.env.REPLIT || process.env.PUPPETEER_EXECUTABLE_PATH) {
    const chromiumPaths = [
        process.env.PUPPETEER_EXECUTABLE_PATH,
        '/nix/store/$(ls /nix/store 2>/dev/null | grep chromium | head -1)/bin/chromium',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
    ].filter(Boolean);
    
    for (const p of chromiumPaths) {
        try {
            if (fs.existsSync(p)) {
                puppeteerArgs.unshift(`--executable-path=${p}`);
                console.log(`🌐 Using Chromium: ${p}`);
                break;
            }
        } catch (e) {}
    }
}

const BOT_PHONE_NUMBER = '923XXXXXXXXX';
const ADMIN_NUMBERS = [`${BOT_PHONE_NUMBER}@c.us`];
const BOT_PREFIX = '.';
const USE_PAIR_CODE = true;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-session' }),
    puppeteer: {
        headless: true,
        args: puppeteerArgs
    }
});

function isAdmin(senderId) {
    return ADMIN_NUMBERS.includes(senderId);
}

function isGroupLink(text) {
    const linkPatterns = [
        /https?:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/gi,
        /https?:\/\/whatsapp\.com\/group\/invite\/[A-Za-z0-9]+/gi
    ];
    return linkPatterns.some(pattern => pattern.test(text));
}

async function playSong(chat, query) {
    try {
        await chat.sendStateTyping();
        await chat.sendMessage('🔍 Searching for song...');
        
        const info = await ytdl.getInfo(query);
        const videoUrl = info.videoDetails.video_url;
        const title = info.videoDetails.title;
        
        await chat.sendMessage(`🎵 Playing: ${title}\n🔗 ${videoUrl}`);
        
        const stream = ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' });
        const media = await MessageMedia.fromStream(stream, { mimetype: 'audio/mpeg', filename: `${title}.mp3` });
        
        await chat.sendMessage(media, { sendAudioAsVoice: false });
    } catch (error) {
        console.error('Play error:', error);
        await chat.sendMessage('❌ Failed to play song. Try a different query or YouTube link.');
    }
}

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Scan QR code above to login');
    if (USE_PAIR_CODE) {
        console.log('🔗 Or use Pair Code: Run `node pair.js` separately');
    }
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated successfully');
});

client.on('pair_code', (code) => {
    console.log('\n🔗 ===== PAIR CODE =====');
    console.log(`📱 Pair Code: ${code}`);
    console.log('📲 Open WhatsApp → Linked Devices → Link with Phone Number');
    console.log(`📞 Enter: ${BOT_PHONE_NUMBER}`);
    console.log('========================\n');
});

client.on('ready', () => {
    console.log('✅ Bot is ready!');
    console.log('🤖 Features active: Anti-link, Admin Kick, Music Play');
});

client.on('disconnected', (reason) => {
    console.log('🔌 Client disconnected:', reason);
    console.log('🔄 Attempting to reconnect...');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failure:', msg);
    console.log('🔄 Please re-scan QR code or regenerate pair code');
});

client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();
        const senderId = msg.author || msg.from;
        const body = msg.body.trim();
        
        if (chat.isGroup) {
            if (isGroupLink(body)) {
                if (!isAdmin(senderId)) {
                    try {
                        await msg.delete(true);
                        await chat.sendMessage(`@${senderId.split('@')[0]} ❌ Group links are not allowed!`, { mentions: [senderId] });
                    } catch (e) {
                        console.log('Could not delete link message');
                    }
                }
                return;
            }
        }
        
        if (!body.startsWith(BOT_PREFIX)) return;
        
        const args = body.slice(BOT_PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        switch (command) {
            case 'kick':
                if (!isAdmin(senderId)) {
                    await msg.reply('❌ Only admins can use this command!');
                    return;
                }
                
                if (!chat.isGroup) {
                    await msg.reply('❌ This command only works in groups!');
                    return;
                }
                
                const mentionedIds = msg.mentionedIds;
                if (mentionedIds.length === 0) {
                    await msg.reply('❌ Mention users to kick! Usage: .kick @user1 @user2');
                    return;
                }
                
                for (const userId of mentionedIds) {
                    try {
                        await chat.removeParticipants([userId]);
                        await msg.reply(`✅ Kicked @${userId.split('@')[0]}`, { mentions: [userId] });
                    } catch (e) {
                        await msg.reply(`❌ Failed to kick @${userId.split('@')[0]} (Bot needs admin rights)`, { mentions: [userId] });
                    }
                }
                break;
                
            case 'play':
            case 'p':
                if (args.length === 0) {
                    await msg.reply('🎵 Usage: .play <song name or YouTube link>\nExample: .play shape of you');
                    return;
                }
                const query = args.join(' ');
                await playSong(chat, query);
                break;
                
            case 'help':
            case 'menu':
                const helpText = `🤖 *Bot Commands*
                
*Admin Commands:*
.kick @user - Remove user from group (admin only)

*Music Commands:*
.play <song name/link> - Play song from YouTube
.p <song name/link> - Shortcut for play

*Auto Features:*
🔗 Auto-removes group invite links (non-admins)
✅ Bot must be admin for kick to work

*Setup:*
1. Add bot to group
2. Make bot admin for kick feature
3. Add your number to ADMIN_NUMBERS in code`;
                await msg.reply(helpText);
                break;
                
            case 'ping':
                await msg.reply('🏓 Pong! Bot is active.');
                break;
        }
    } catch (error) {
        console.error('Message handler error:', error);
    }
});

client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        if (chat.isGroup) {
            const joiner = notification.recipientIds[0];
            await chat.sendMessage(`Welcome @${joiner.split('@')[0]}! 👋\n\n*Rules:*\n• No group links allowed\n• Respect everyone\n• Use .help for commands`, { mentions: [joiner] });
        }
    } catch (error) {
        console.error('Group join handler error:', error);
    }
});

// Express server for Replit/UptimeRobot keep-alive
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Web server on port ${PORT}`));

// Global error handlers - prevent crashes
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('warning', (warning) => {
    console.warn('⚠️ Warning:', warning.name, warning.message);
});

try {
    client.initialize();
} catch (error) {
    console.error('❌ Failed to initialize client:', error);
}

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.destroy();
    process.exit(0);
});