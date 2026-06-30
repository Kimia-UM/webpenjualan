import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // 1. Validate Cron Secret for security
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  
  const authHeader = request.headers.get('authorization');
  const headerSecret = authHeader ? authHeader.replace('Bearer ', '') : null;
  
  const expectedSecret = process.env.CRON_SECRET;
  
  // Only enforce validation if CRON_SECRET is configured
  if (expectedSecret && querySecret !== expectedSecret && headerSecret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized: Secret tidak valid' },
      { status: 401 }
    );
  }

  // Check if Firebase Admin DB is initialized
  if (!adminDb) {
    return NextResponse.json(
      { error: 'Firebase Admin SDK tidak terinisialisasi. Cek kredensial server.' },
      { status: 500 }
    );
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Fetch all subscriptions and host accounts from Firebase RTDB
    const [subsSnapshot, hostsSnapshot] = await Promise.all([
      adminDb.ref('subscriptions').once('value'),
      adminDb.ref('host_accounts').once('value')
    ]);

    const subsData = subsSnapshot.val() || {};
    const hostsData = hostsSnapshot.val() || {};

    const subscriptions = Object.keys(subsData).map(key => ({
      id: key,
      ...subsData[key]
    }));

    const hostAccounts = Object.keys(hostsData).map(key => ({
      id: key,
      ...hostsData[key]
    }));

    // Helper: Find host email by ID
    const getHostEmail = (hostId: string) => {
      const host = hostAccounts.find((h: any) => h.id === hostId);
      return host ? host.account_email : 'Tidak dikenal';
    };

    // 3. Filter expiring subscriptions (<= 3 days left or expiring today)
    const expiringSubs = subscriptions.filter((sub: any) => {
      if (!sub.expiry_date || sub.status === 'habis') return false;
      
      const expiry = new Date(sub.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      
      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 1;
    }).map((sub: any) => {
      const expiry = new Date(sub.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        email: sub.customer_email,
        hostEmail: getHostEmail(sub.host_account_id),
        daysLeft
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    // 4. Filter expiring host accounts (<= 7 days left)
    const expiringHosts = hostAccounts.filter((host: any) => {
      if (!host.active_until || host.status !== 'aktif') return false;
      
      const activeUntil = new Date(host.active_until);
      activeUntil.setHours(0, 0, 0, 0);
      
      const diffTime = activeUntil.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 7;
    }).map((host: any) => {
      const activeUntil = new Date(host.active_until);
      activeUntil.setHours(0, 0, 0, 0);
      const diffTime = activeUntil.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        email: host.account_email,
        daysLeft
      };
    }).sort((a, b) => a.daysLeft - b.daysLeft);

    // 5. Construct Telegram Message
    let message = '';
    
    if (expiringSubs.length === 0 && expiringHosts.length === 0) {
      message = '🌟 *Reminder Harian PremiumShare*\n\n✅ _Semua aman! Tidak ada customer atau akun induk yang akan habis dalam waktu dekat._ 🎉';
    } else {
      message = '🔔 *Reminder Harian PremiumShare*\n\n';
      
      if (expiringSubs.length > 0) {
        message += `🚨 *${expiringSubs.length} Customer Akan Habis (≤1 hari):*\n`;
        expiringSubs.forEach(sub => {
          const isToday = sub.daysLeft === 0;
          const dayLabel = isToday ? '🔴 HARI INI' : `⏳ ${sub.daysLeft} Hari Lagi`;
          message += `👤 \`${sub.email}\`\n      ├ ${dayLabel}\n      └ 🏠 Host: \`${sub.hostEmail}\`\n\n`;
        });
      }
      
      if (expiringHosts.length > 0) {
        message += `⚠️ *Stok Akun Induk Menipis (≤7 hari):*\n`;
        expiringHosts.forEach(host => {
          const isToday = host.daysLeft === 0;
          const dayLabel = isToday ? '🔴 HARI INI' : `⏳ ${host.daysLeft} Hari Lagi`;
          message += `🟢 \`${host.email}\`\n      └ ${dayLabel}\n\n`;
        });
      }
      
      message += `💡 _Jangan lupa untuk perbarui data lewat bot ini ya!_`;
    }

    // 6. Send to Telegram via Fetch API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!botToken || !chatId) {
      console.warn("Telegram Token atau Chat ID tidak terkonfigurasi. Pesan tercetak di log saja:\n", message);
      return NextResponse.json({
        success: true,
        message: 'Firebase checked successfully. Telegram not sent (credentials missing in env).',
        payload: {
          expiringCustomers: expiringSubs,
          expiringHosts: expiringHosts
        }
      });
    }

    const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!telegramRes.ok) {
      const errText = await telegramRes.text();
      console.error('Error sending Telegram notification:', errText);
      return NextResponse.json(
        { error: 'Gagal mengirim pesan ke Telegram', details: errText },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notifikasi berhasil diproses dan dikirim ke Telegram.',
      payload: {
        expiringCustomers: expiringSubs,
        expiringHosts: expiringHosts
      }
    });

  } catch (error: any) {
    console.error('Error in cron reminder endpoint:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
