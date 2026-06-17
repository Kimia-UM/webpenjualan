import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// Helper: Calculate Subscription Status
const getSubscriptionStatus = (expiryDateStr: string) => {
  if (!expiryDateStr) return 'habis';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'habis';
  if (diffDays <= 3) return 'akan_habis';
  return 'aktif';
};

// Helper: Calculate remaining days
const getRemainingDays = (expiryDateStr: string) => {
  if (!expiryDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export async function POST(request: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;

  try {
    const body = await request.json();
    
    // Extract message info from Telegram payload
    const message = body.message;
    if (!message || !message.text || !message.chat) {
      return NextResponse.json({ ok: true }); // Acknowledge to Telegram
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // 1. Security Check: Only allow requests from the admin chat ID
    if (String(chatId) !== String(adminChatId)) {
      console.warn(`Unauthorized access attempt from Chat ID: ${chatId}`);
      // Send unauthorized message to the stranger
      if (botToken) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '⚠️ *Akses Ditolak:* Anda bukan admin dari bot ini.',
            parse_mode: 'Markdown',
          }),
        });
      }
      return NextResponse.json({ ok: true });
    }

    // Check if Firebase database is ready
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin DB not initialized' }, { status: 500 });
    }

    // 2. Handle commands
    if (text === '/start' || text === '/help') {
      const helpMsg = 
        `👋 *Halo Admin PremiumShare!*\n\n` +
        `Berikut adalah perintah interaktif yang tersedia:\n` +
        `- /stok : Cek akun induk yang masih memiliki sisa slot kosong.\n` +
        `- /infocustomer : Cek daftar customer dengan masa habis terdekat.\n\n` +
        `💡 *Info:* Pengingat otomatis harian tetap berjalan setiap pagi jam 08:00 WIB.`;
      
      await sendTelegramReply(botToken, chatId, helpMsg);
    } 
    
    else if (text === '/stok') {
      // Fetch data
      const [subsSnapshot, hostsSnapshot] = await Promise.all([
        adminDb.ref('subscriptions').once('value'),
        adminDb.ref('host_accounts').once('value')
      ]);

      const subsData = subsSnapshot.val() || {};
      const hostsData = hostsSnapshot.val() || {};

      const subscriptions = Object.keys(subsData).map(key => ({ id: key, ...subsData[key] }));
      const hostAccounts = Object.keys(hostsData).map(key => ({ id: key, ...hostsData[key] }));

      // Filter active hosts with available slots
      const availableHosts = hostAccounts
        .filter((host: any) => host.status === 'aktif')
        .map((host: any) => {
          const activeSubs = subscriptions.filter((sub: any) => {
            if (sub.host_account_id !== host.id) return false;
            return getSubscriptionStatus(sub.expiry_date) !== 'habis';
          });
          const sisa = host.total_slot - activeSubs.length;
          return {
            email: host.account_email,
            billing: host.billing_type,
            sisa,
            total: host.total_slot
          };
        })
        .filter(h => h.sisa > 0);

      // Build reply
      let reply = '📦 *Stok Akun Induk Tersedia:*\n\n';
      if (availableHosts.length === 0) {
        reply += '❌ Semua akun stok penuh atau tidak ada akun aktif.';
      } else {
        availableHosts.forEach(h => {
          reply += `- \`${h.email}\` (${h.sisa}/${h.total} slot sisa, ${h.billing})\n`;
        });
      }
      
      await sendTelegramReply(botToken, chatId, reply);
    } 
    
    else if (text === '/infocustomer') {
      // Fetch data
      const [subsSnapshot, hostsSnapshot] = await Promise.all([
        adminDb.ref('subscriptions').once('value'),
        adminDb.ref('host_accounts').once('value')
      ]);

      const subsData = subsSnapshot.val() || {};
      const hostsData = hostsSnapshot.val() || {};

      const subscriptions = Object.keys(subsData).map(key => ({ id: key, ...subsData[key] }));
      const hostAccounts = Object.keys(hostsData).map(key => ({ id: key, ...hostsData[key] }));

      const getHostEmail = (hostId: string) => {
        const host = hostAccounts.find((h: any) => h.id === hostId);
        return host ? host.account_email : 'Tidak dikenal';
      };

      // Filter active customer subscriptions with exactly 5 days left
      const activeSubs = subscriptions
        .map((sub: any) => {
          const daysLeft = getRemainingDays(sub.expiry_date);
          return {
            email: sub.customer_email,
            hostEmail: getHostEmail(sub.host_account_id),
            daysLeft,
            status: getSubscriptionStatus(sub.expiry_date)
          };
        })
        .filter((sub: any) => sub.status !== 'habis' && sub.daysLeft === 5);

      let reply = '📅 *Infocustomer (Sisa 5 Hari Lagi):*\n\n';
      if (activeSubs.length === 0) {
        reply += '❌ Tidak ada customer dengan sisa masa aktif tepat 5 hari lagi.';
      } else {
        activeSubs.forEach(sub => {
          reply += `- \`${sub.email}\`\n  (Host: \`${sub.hostEmail}\`)\n`;
        });
      }

      await sendTelegramReply(botToken, chatId, reply);
    } 
    
    else {
      // Unsupported command
      const errorMsg = '❓ Perintah tidak dikenal. Kirim /help untuk daftar perintah.';
      await sendTelegramReply(botToken, chatId, errorMsg);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error in Telegram Webhook endpoint:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Send message back to Telegram
async function sendTelegramReply(botToken: string | undefined, chatId: number, text: string) {
  if (!botToken) return;
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    }),
  });
}
