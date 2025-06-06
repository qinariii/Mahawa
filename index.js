const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const pino = require('pino');

// Fungsi untuk mencari mahasiswa
async function searchMahasiswa(nama) {
    try {
        const encodedNama = encodeURIComponent(nama);
        const response = await axios.get(`https://api-pddikti.ridwaanhall.com/search/mhs/${encodedNama}/`);
        
        if (response.data && response.data.length > 0) {
            let result = '*🎓 HASIL PENCARIAN MAHASISWA*\n\n';
            
            response.data.forEach((mhs, index) => {
                result += `*${index + 1}. ${mhs.nama || 'Tidak tersedia'}*\n`;
                result += `📋 NIM: ${mhs.nim || 'Tidak tersedia'}\n`;
                result += `🏫 Perguruan Tinggi: ${mhs.nama_pt || 'Tidak tersedia'}\n`;
                result += `🔤 Singkatan PT: ${mhs.sinkatan_pt || 'Tidak tersedia'}\n`;
                result += `📚 Program Studi: ${mhs.nama_prodi || 'Tidak tersedia'}\n`;
                result += `━━━━━━━━━━━━━━━━━━━━\n`;
            });
            
            return result;
        } else {
            return '❌ Data mahasiswa tidak ditemukan. Pastikan nama yang dicari sudah benar.';
        }
    } catch (error) {
        console.error('Error searching mahasiswa:', error);
        return '❌ Terjadi kesalahan saat mencari data mahasiswa. Silakan coba lagi nanti.';
    }
}

// Fungsi untuk mencari dosen
async function searchDosen(nama) {
    try {
        const encodedNama = encodeURIComponent(nama);
        const response = await axios.get(`https://api-pddikti.ridwaanhall.com/search/dosen/${encodedNama}/`);
        
        if (response.data && response.data.length > 0) {
            let result = '*👨‍🏫 HASIL PENCARIAN DOSEN*\n\n';
            
            response.data.forEach((dosen, index) => {
                result += `*${index + 1}. ${dosen.nama || 'Tidak tersedia'}*\n`;
                result += `🆔 NIDM: ${dosen.nidm || 'Tidak tersedia'}\n`;
                result += `📝 NUPTK: ${dosen.nuptk || 'Tidak tersedia'}\n`;
                result += `🏫 Perguruan Tinggi: ${dosen.nama_pt || 'Tidak tersedia'}\n`;
                result += `🔤 Singkatan PT: ${dosen.sinkatan_pt || 'Tidak tersedia'}\n`;
                result += `📚 Program Studi: ${dosen.nama_prodi || 'Tidak tersedia'}\n`;
                result += `━━━━━━━━━━━━━━━━━━━━\n`;
            });
            
            return result;
        } else {
            return '❌ Data dosen tidak ditemukan. Pastikan nama yang dicari sudah benar.';
        }
    } catch (error) {
        console.error('Error searching dosen:', error);
        return '❌ Terjadi kesalahan saat mencari data dosen. Silakan coba lagi nanti.';
    }
}

// Fungsi untuk menampilkan menu bantuan
function getHelpMenu() {
    return `*🤖 BOT PENCARIAN PDDIKTI*

*Perintah yang tersedia:*

*1. Pencarian Mahasiswa:*
\`!mhs [nama mahasiswa]\`
Contoh: \`!mhs Gilang ramadhan\`

*2. Pencarian Dosen:*
\`!dosen [nama dosen]\`
Contoh: \`!dosen Ridwan UTY\`

*3. Bantuan:*
\`!help\` atau \`!menu\`

*Catatan:*
• Gunakan nama lengkap untuk hasil yang lebih akurat
• Bot akan menampilkan semua hasil yang ditemukan

Powered by UNOFFICIAL PDDIKTI API 🚀`;
}

async function startBot() {
    // Menggunakan multi-file auth state untuk menyimpan sesi
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['Bot PDDIKTI', 'Desktop', '6.7.8']
    });

    // Event ketika QR code ditampilkan
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('🔍 Scan QR Code di atas untuk login WhatsApp Web');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Koneksi terputus karena:', lastDisconnect.error, ', mencoba reconnect...', shouldReconnect);
            
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot berhasil terhubung ke WhatsApp!');
            console.log('🤖 Bot PDDIKTI siap digunakan');
        }
    });

    // Menyimpan kredensial ketika ada update
    sock.ev.on('creds.update', saveCreds);

    // Event untuk menangani pesan masuk
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        if (!msg.key.fromMe && msg.message) {
            const from = msg.key.remoteJid;
            const messageText = msg.message.conversation || 
                              msg.message.extendedTextMessage?.text || '';
            
            console.log(`📨 Pesan dari ${from}: ${messageText}`);
            
            // Perintah bantuan
            if (messageText.toLowerCase() === '!help' || messageText.toLowerCase() === '!menu') {
                await sock.sendMessage(from, { text: getHelpMenu() });
            }
            
            // Perintah pencarian mahasiswa
            else if (messageText.toLowerCase().startsWith('!mhs ')) {
                const namaMahasiswa = messageText.substring(5).trim();
                if (namaMahasiswa) {
                    await sock.sendMessage(from, { text: '🔍 Mencari data mahasiswa, mohon tunggu...' });
                    const result = await searchMahasiswa(namaMahasiswa);
                    await sock.sendMessage(from, { text: result });
                } else {
                    await sock.sendMessage(from, { 
                        text: '❌ Format salah! Gunakan: !mhs [nama mahasiswa]\nContoh: !mhs Gilang Ramadhan' 
                    });
                }
            }
            
            // Perintah pencarian dosen
            else if (messageText.toLowerCase().startsWith('!dosen ')) {
                const namaDosen = messageText.substring(7).trim();
                if (namaDosen) {
                    await sock.sendMessage(from, { text: '🔍 Mencari data dosen, mohon tunggu...' });
                    const result = await searchDosen(namaDosen);
                    await sock.sendMessage(from, { text: result });
                } else {
                    await sock.sendMessage(from, { 
                        text: '❌ Format salah! Gunakan: !dosen [nama dosen]\nContoh: !dosen Ridwan UTY' 
                    });
                }
            }
            
            // Pesan selamat datang untuk pesan lain
            else if (messageText && !messageText.startsWith('!')) {
                await sock.sendMessage(from, { 
                    text: `Halo! 👋\n\nSaya adalah Bot Pencarian PDDIKTI.\n\nKetik *!help* untuk melihat daftar perintah yang tersedia.` 
                });
            }
        }
    });

    return sock;
}

// Menjalankan bot
console.log('🚀 Memulai WhatsApp Bot PDDIKTI...');
startBot().catch(err => console.error('Error starting bot:', err));