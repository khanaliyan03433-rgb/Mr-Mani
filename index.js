const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const express = require('express');

// Delete problematic env var that puppeteer reads directly
delete process.env.PUPPETEER_EXECUTABLE_PATH;

// Simple puppeteer config - let it use bundled chromium or system
const puppeteerConfig = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
    ]
};

// Try to use system chromium on Replit (without env var)
if (process.env.REPLIT) {
    try {
        const nixStore = '/nix/store';
        if (fs.existsSync(nixStore)) {
            const dirs = fs.readdirSync(nixStore);
            const chromiumDir = dirs.find(d => d.includes('chromium'));
            if (chromiumDir) {
                const chromiumPath = path.join(nixStore, chromiumDir, 'bin', 'chromium');
                if (fs.existsSync(chromiumPath)) {
                    puppeteerConfig.executablePath = chromiumPath;
                    console.log(`🌐 Using system Chromium: ${chromiumPath}`);
                }
            }
        }
    } catch (e) {
        console.log('⚠️ Using bundled chromium');
    }
}

const ADMIN_NUMBERS = ['923XXXXXXXXX@c.us'];
const BOT_PREFIX = '.';

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-session' }),
    puppeteer: puppeteerConfig
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
});

client.on('authenticated', () => {
    console.log('🔐 Authenticated successfully');
});

client.on('ready', () => {
    console.log('✅ Bot is ready!');
    console.log('🤖 Features: Anti-link, Admin Kick, Music Play');
});

client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failure:', msg);
});

client.on('message', async (msg) => {
    try {
        const chat = await msg.getChat();
        const senderId = msg.author || msg.from;
        const body = msg.body.trim();
        
        if (chat.isGroup && isGroupLink(body) && !isAdmin(senderId)) {
            try {
                await msg.delete(true);
                await chat.sendMessage(`@${senderId.split('@')[0]} ❌ Group links not allowed!`, { mentions: [senderId] });
            } catch (e) {}
            return;
        }
        
        if (!body.startsWith(BOT_PREFIX)) return;
        
        const args = body.slice(BOT_PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        switch (command) {
            case 'kick':
                if (!isAdmin(senderId)) return await msg.reply('❌ Admins only!');
                if (!chat.isGroup) return await msg.reply('❌ Groups only!');
                
                const mentionedIds = msg.mentionedIds;
                if (!mentionedIds.length) return await msg.reply('❌ Mention users: .kick @user');
                
                for (const userId of mentionedIds) {
                    try {
                        await chat.removeParticipants([userId]);
                        await msg.reply(`✅ Kicked @${userId.split('@')[0]}`, { mentions: [userId] });
                    } catch (e) {
                        await msg.reply(`❌ Failed to kick @${userId.split('@')[0]} (need admin)`, { mentions: [userId] });
                    }
                }
                break;
                
            case 'play':
            case 'p':
                if (!args.length) return await msg.reply('🎵 Usage: .play <song name>');
                await playSong(chat, args.join(' '));
                break;
                
            case 'help':
            case 'menu':
                await msg.reply(`🤖 *Bot Commands*
                
*Admin:* .kick @user
*Music:* .play <song> | .p <song>
*Auto:* Removes group links (non-admins)

*Setup:* Add bot to group → Make admin → Edit ADMIN_NUMBERS in code`);
                break;
                
            case 'ping':
                await msg.reply('🏓 Pong!');
                break;
        }
    } catch (error) {
        console.error('Message error:', error);
    }
});

client.on('group_join', async (notification) => {
    try {
        const chat = await notification.getChat();
        if (chat.isGroup) {
            const joiner = notification.recipientIds[0];
            await chat.sendMessage(`Welcome @${joiner.split('@')[0]}! 👋\n\nRules:\n• No group links\n• Respect everyone\n• .help for commands`, { mentions: [joiner] });
        }
    } catch (e) {}
});

// Express server with port fallback
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));

function startServer(port) {
    return new Promise((resolve) => {
        const server = app.listen(port, () => {
            console.log(`🌐 Web server on port ${port}`);
            resolve(server);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`⚠️ Port ${port} busy, trying ${port + 1}...`);
                resolve(startServer(port + 1));
            }
        });
    });
}

startServer(process.env.PORT || 3000);

// Global error handlers
process.on('uncaughtException', (e) => console.error('💥 Uncaught:', e));
process.on('unhandledRejection', (r) => console.error('💥 Rejection:', r));

try {
    client.initialize();
} catch (e) {
    console.error('❌ Init error:', e);
}

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.destroy();
    process.exit(0);
});