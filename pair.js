const { Client, LocalAuth } = require('whatsapp-web.js');

const BOT_PHONE_NUMBER = '923XXXXXXXXX';

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-session' }),
    puppeteer: {
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
    }
});

client.on('pair_code', (code) => {
    console.log('\n🔗 ===== PAIR CODE =====');
    console.log(`📱 Pair Code: ${code}`);
    console.log('📲 Open WhatsApp → Linked Devices → Link with Phone Number');
    console.log(`📞 Enter phone: ${BOT_PHONE_NUMBER}`);
    console.log('========================\n');
});

client.on('authenticated', () => {
    console.log('✅ Pair code authenticated! Session saved.');
    process.exit(0);
});

client.on('auth_failure', (msg) => {
    console.error('❌ Auth failed:', msg);
    process.exit(1);
});

client.initialize();

console.log('🔄 Generating pair code...');