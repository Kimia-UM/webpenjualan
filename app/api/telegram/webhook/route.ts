import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Interface for active bot sessions
interface BotSession {
  step: 'idle' | 'awaiting_customer_email' | 'awaiting_customer_field' | 'awaiting_customer_value' | 'awaiting_host_email' | 'awaiting_host_field' | 'awaiting_host_value';
  data?: any;
  last_updated?: number;
}

// Session Helpers
const getSession = async (chatId: number): Promise<BotSession | null> => {
  if (!adminDb) return null;
  const snap = await adminDb.ref(`telegram_sessions/${chatId}`).once('value');
  return snap.val();
};

const saveSession = async (chatId: number, session: BotSession) => {
  if (!adminDb) return;
  await adminDb.ref(`telegram_sessions/${chatId}`).set({
    ...session,
    last_updated: Date.now(),
  });
};

const clearSession = async (chatId: number) => {
  if (!adminDb) return;
  await adminDb.ref(`telegram_sessions/${chatId}`).remove();
};

// Helper: Parse Indonesian and standard date formats to YYYY-MM-DD
const parseIndoDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim().toLowerCase();
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
    return cleanStr;
  }
  
  const months: Record<string, string> = {
    januari: '01', pebruari: '02', februari: '02', maret: '03',
    april: '04', mei: '05', juni: '06', juli: '07', agustus: '08',
    september: '09', oktober: '10', nopember: '11', november: '11',
    desember: '12', jan: '01', feb: '02', mar: '03', apr: '04',
    jun: '06', jul: '07', ags: '08', sep: '09', okt: '10', nov: '11', des: '12'
  };
  
  const parts = cleanStr.split(/[\s\-/,]+/);
  if (parts.length === 3) {
    let day = parts[0];
    let monthText = parts[1];
    let year = parts[2];
    
    if (day.length === 1) day = '0' + day;
    
    const monthVal = months[monthText];
    if (monthVal && /^\d{4}$/.test(year) && /^\d{2}$/.test(day)) {
      return `${year}-${monthVal}-${day}`;
    }
  }
  
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  
  return '';
};

// Helper: Calculate start date based on expiry date and duration label
const calculateStartDate = (expiryDateStr: string, durationLabel: string): string => {
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return new Date().toISOString().split('T')[0];
  
  const label = durationLabel.toLowerCase();
  if (label.includes('bulan')) {
    const months = parseInt(label) || 1;
    expiry.setMonth(expiry.getMonth() - months);
  } else if (label.includes('minggu')) {
    const weeks = parseInt(label) || 1;
    expiry.setDate(expiry.getDate() - (weeks * 7));
  } else if (label.includes('hari')) {
    const days = parseInt(label) || 1;
    expiry.setDate(expiry.getDate() - days);
  } else {
    expiry.setMonth(expiry.getMonth() - 1);
  }
  return expiry.toISOString().split('T')[0];
};

// Helper: Clean currency and price strings to integer
const parsePrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  const cleanStr = priceStr.replace(/[^0-9,]/g, '').split(',')[0];
  return parseInt(cleanStr, 10) || 0;
};

// Helper: Calculate Subscription Status
const getSubscriptionStatus = (expiryDateStr: string) => {
  if (!expiryDateStr) return "habis";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "habis";
  if (diffDays <= 1) return "akan_habis";
  return "aktif";
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
  const adminChatId =
    process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_ADMIN_CHAT_ID;

  try {
    const body = await request.json();

    // Extract message info from Telegram payload
    const message = body.message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true }); // Acknowledge to Telegram
    }

    const chatId = message.chat.id;

    // (Security Check removed to allow any user to use the bot)
    // Check if Firebase database is ready
    if (!adminDb) {
      return NextResponse.json(
        { error: "Firebase Admin DB not initialized" },
        { status: 500 },
      );
    }

    // 2. Handle CSV File uploads
    if (message.document) {
      const doc = message.document;
      const fileName = doc.file_name || "";
      if (fileName.toLowerCase().endsWith(".csv") || doc.mime_type === "text/csv") {
        await handleCsvUpload(botToken, chatId, doc.file_id);
        return NextResponse.json({ ok: true });
      }
    }

    if (!message.text) {
      return NextResponse.json({ ok: true });
    }

    const text = message.text.trim();

    // 3. Handle cancel command globally
    if (text === "/cancel") {
      await clearSession(chatId);
      await sendTelegramReply(botToken, chatId, "❌ Perubahan/proses update dibatalkan.", { remove_keyboard: true });
      return NextResponse.json({ ok: true });
    }

    // 4. Retrieve and process active session state if exists
    const session = await getSession(chatId);
    if (session && session.step !== 'idle') {
      const isHandled = await handleSessionState(botToken, chatId, text, session);
      if (isHandled) {
        return NextResponse.json({ ok: true });
      }
    }

    // 5. Handle standard slash commands
    if (text === "/start" || text === "/help") {
      const helpMsg =
        `✨ *PremiumShare Bot Assistant* ✨\n\n` +
        `Halo Admin! 👋 Saya siap membantu Anda mengelola data.\n\n` +
        `📋 *Daftar Perintah:*\n` +
        `🔹 /stok — Cek sisa slot akun induk\n` +
        `🔹 /infocustomer — Cek customer masa habis terdekat\n` +
        `🔹 /updatecustomer — Ubah data customer spesifik\n` +
        `🔹 /updatehost — Ubah data akun induk spesifik\n` +
        `🔹 /cancel — Batalkan proses yang berjalan\n\n` +
        `💡 *Tips:* Kirimkan file CSV manajemen data untuk sinkronisasi massal 🚀`;

      await sendTelegramReply(botToken, chatId, helpMsg);
    } else if (text === "/updatecustomer") {
      await saveSession(chatId, {
        step: 'awaiting_customer_email',
        data: {}
      });
      await sendTelegramReply(
        botToken, 
        chatId, 
        "✨ *Update Data Customer*\n\nSilakan ketik *Email Customer* yang ingin diperbarui datanya 👇\n\n_(Ketik /cancel jika ingin membatalkan)_",
        { remove_keyboard: true }
      );
    } else if (text === "/updatehost") {
      await saveSession(chatId, {
        step: 'awaiting_host_email',
        data: {}
      });
      await sendTelegramReply(
        botToken, 
        chatId, 
        "✨ *Update Akun Induk (Host)*\n\nSilakan ketik *Email Akun Induk* yang ingin diperbarui datanya 👇\n\n_(Ketik /cancel jika ingin membatalkan)_",
        { remove_keyboard: true }
      );
    } else if (text === "/stok") {
      // Fetch data
      const [subsSnapshot, hostsSnapshot] = await Promise.all([
        adminDb.ref("subscriptions").once("value"),
        adminDb.ref("host_accounts").once("value"),
      ]);

      const subsData = subsSnapshot.val() || {};
      const hostsData = hostsSnapshot.val() || {};

      const subscriptions = Object.keys(subsData).map((key) => ({
        id: key,
        ...subsData[key],
      }));
      const hostAccounts = Object.keys(hostsData).map((key) => ({
        id: key,
        ...hostsData[key],
      }));

      // Filter active hosts with available slots
      const availableHosts = hostAccounts
        .filter((host: any) => host.status === "aktif")
        .map((host: any) => {
          const activeSubs = subscriptions.filter((sub: any) => {
            if (sub.host_account_id !== host.id) return false;
            return getSubscriptionStatus(sub.expiry_date) !== "habis";
          });
          const sisa = host.total_slot - activeSubs.length;
          return {
            email: host.account_email,
            billing: host.billing_type,
            sisa,
            total: host.total_slot,
          };
        })
        .filter((h) => h.sisa > 0);

      // Build reply
      let reply = "📦 *Stok Akun Induk Tersedia:*\n\n";
      if (availableHosts.length === 0) {
        reply += "❌ _Semua akun stok penuh atau tidak ada akun aktif._";
      } else {
        availableHosts.forEach((h) => {
          reply += `🟢 \`${h.email}\`\n      └ 🎟️ *Sisa:* ${h.sisa}/${h.total} slot  |  ⏱️ *Tipe:* ${h.billing}\n\n`;
        });
        reply += `💡 _Ketik /updatehost untuk menambah stok/perpanjang._`;
      }

      await sendTelegramReply(botToken, chatId, reply);
    } else if (text === "/infocustomer") {
      // Fetch data
      const [subsSnapshot, hostsSnapshot] = await Promise.all([
        adminDb.ref("subscriptions").once("value"),
        adminDb.ref("host_accounts").once("value"),
      ]);

      const subsData = subsSnapshot.val() || {};
      const hostsData = hostsSnapshot.val() || {};

      const subscriptions = Object.keys(subsData).map((key) => ({
        id: key,
        ...subsData[key],
      }));
      const hostAccounts = Object.keys(hostsData).map((key) => ({
        id: key,
        ...hostsData[key],
      }));

      const getHostEmail = (hostId: string) => {
        const host = hostAccounts.find((h: any) => h.id === hostId);
        return host ? host.account_email : "Tidak dikenal";
      };

      // Filter active customer subscriptions with 5 days or less left
      const activeSubs = subscriptions
        .map((sub: any) => {
          const daysLeft = getRemainingDays(sub.expiry_date);
          return {
            email: sub.customer_email,
            hostEmail: getHostEmail(sub.host_account_id),
            daysLeft,
            status: getSubscriptionStatus(sub.expiry_date),
          };
        })
        .filter((sub: any) => sub.status !== "habis" && sub.daysLeft <= 5)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      let reply = "📅 *Info Customer (Sisa ≤ 5 Hari Lagi):*\n\n";
      if (activeSubs.length === 0) {
        reply +=
          "✅ _Aman! Tidak ada customer dengan sisa masa aktif kurang dari 5 hari._ 🎉";
      } else {
        activeSubs.forEach((sub) => {
          const isToday = sub.daysLeft === 0;
          const dayLabel = isToday ? "🚨 *HARI INI*" : `⏳ *${sub.daysLeft} Hari Lagi*`;
          reply += `👤 \`${sub.email}\`\n      ├ ${dayLabel}\n      └ 🏠 Host: \`${sub.hostEmail}\`\n\n`;
        });
        reply += `💡 _Segera ingatkan mereka dan perbarui lewat /updatecustomer_`;
      }

      await sendTelegramReply(botToken, chatId, reply);
    } else {
      // Unsupported command
      const errorMsg =
        "❓ Perintah tidak dikenal. Kirim /help untuk daftar perintah.";
      await sendTelegramReply(botToken, chatId, errorMsg);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error in Telegram Webhook endpoint:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Send message back to Telegram
async function sendTelegramReply(
  botToken: string | undefined,
  chatId: number,
  text: string,
  replyMarkup?: any
) {
  if (!botToken) return;
  const body: any = {
    chat_id: chatId,
    text: text,
    parse_mode: "Markdown",
  };
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Helper: Process Interactive Session State Machine
async function handleSessionState(
  botToken: string | undefined,
  chatId: number,
  text: string,
  session: BotSession
): Promise<boolean> {
  if (!botToken || !adminDb) return false;

  const step = session.step;
  const data = session.data || {};

  try {
    if (step === 'awaiting_customer_email') {
      const emailInput = text.toLowerCase().trim();
      // Search subscription for this email
      const subsSnapshot = await adminDb.ref("subscriptions").once("value");
      const subsData = subsSnapshot.val() || {};
      const subsList = Object.keys(subsData).map(key => ({ id: key, ...subsData[key] }));
      const userSubs = subsList.filter(s => s.customer_email.toLowerCase() === emailInput);

      if (userSubs.length === 0) {
        await sendTelegramReply(
          botToken, 
          chatId, 
          `❌ Customer dengan email \`${text}\` tidak ditemukan.\n\nSilakan ketik ulang email customer yang valid atau kirim /cancel:`
        );
        return true;
      }

      // Pick the most recent subscription
      userSubs.sort((a, b) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime());
      const sub = userSubs[0];

      // Save email and subId to session, change state to awaiting field choice
      await saveSession(chatId, {
        step: 'awaiting_customer_field',
        data: { subId: sub.id, email: sub.customer_email }
      });

      // Show keyboard options
      const keyboard = {
        keyboard: [
          [{ text: "Email Customer" }, { text: "Masa Aktif" }],
          [{ text: "Akun Induk" }, { text: "Payment Channel" }],
          [{ text: "Price" }, { text: "Batal" }]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      };

      await sendTelegramReply(
        botToken, 
        chatId, 
        `👤 *Customer ditemukan!*\n- Email: \`${sub.customer_email}\`\n- Host ID: \`${sub.host_account_id}\`\n- Expiry: \`${sub.expiry_date}\`\n- Price: \`Rp ${sub.price.toLocaleString('id-ID')}\`\n\nSilakan pilih field yang ingin diubah:`,
        keyboard
      );
      return true;
    }

    if (step === 'awaiting_customer_field') {
      if (text === "Batal") {
        await clearSession(chatId);
        await sendTelegramReply(botToken, chatId, "❌ Aksi dibatalkan.", { remove_keyboard: true });
        return true;
      }

      const fieldMap: Record<string, string> = {
        "Email Customer": "customer_email",
        "Masa Aktif": "expiry_date",
        "Akun Induk": "host_account_id",
        "Payment Channel": "payment_channel",
        "Price": "price"
      };

      const dbField = fieldMap[text];
      if (!dbField) {
        await sendTelegramReply(botToken, chatId, "❌ Pilihan tidak valid. Silakan gunakan tombol keyboard yang disediakan atau kirim /cancel.");
        return true;
      }

      // Save field to edit
      await saveSession(chatId, {
        step: 'awaiting_customer_value',
        data: { ...data, field: dbField }
      });

      if (dbField === 'customer_email') {
        await sendTelegramReply(botToken, chatId, "✉️ Masukkan *email baru* untuk customer ini:", { remove_keyboard: true });
      } else if (dbField === 'expiry_date') {
        await sendTelegramReply(botToken, chatId, "📅 Masukkan *tanggal expired baru* (format: `YYYY-MM-DD`, contoh: `2026-12-31`):", { remove_keyboard: true });
      } else if (dbField === 'payment_channel') {
        const keyboard = {
          keyboard: [
            [{ text: "QRIS" }],
            [{ text: "Batal" }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        };
        await sendTelegramReply(botToken, chatId, "💳 Pilih atau ketik *payment channel baru*:", keyboard);
      } else if (dbField === 'price') {
        await sendTelegramReply(botToken, chatId, "💰 Masukkan *nominal harga baru* (angka saja, contoh: `30000`):", { remove_keyboard: true });
      } else if (dbField === 'host_account_id') {
        // Fetch all active hosts to display
        const hostsSnapshot = await adminDb.ref("host_accounts").once("value");
        const hostsData = hostsSnapshot.val() || {};
        const hostsList = Object.keys(hostsData).map(key => ({ id: key, email: hostsData[key].account_email }));
        
        const rowButtons = hostsList.map(h => [{ text: h.email }]);
        rowButtons.push([{ text: "Batal" }]);

        const keyboard = {
          keyboard: rowButtons,
          one_time_keyboard: true,
          resize_keyboard: true
        };

        await sendTelegramReply(botToken, chatId, "📦 Pilih atau ketik *email akun induk baru*:", keyboard);
      }
      return true;
    }

    if (step === 'awaiting_customer_value') {
      if (text === "Batal") {
        await clearSession(chatId);
        await sendTelegramReply(botToken, chatId, "❌ Aksi dibatalkan.", { remove_keyboard: true });
        return true;
      }

      const { subId, field, email } = data;
      let updateValue: any = text;

      // Validation
      if (field === 'price') {
        const parsed = parsePrice(text);
        if (isNaN(parsed) || parsed <= 0) {
          await sendTelegramReply(botToken, chatId, "❌ Nominal tidak valid. Silakan masukkan angka nominal yang benar:");
          return true;
        }
        updateValue = parsed;
      } else if (field === 'expiry_date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          await sendTelegramReply(botToken, chatId, "❌ Format tanggal salah. Gunakan format `YYYY-MM-DD` (contoh: `2026-12-31`):");
          return true;
        }
        // Also recalculate status
        const status = getSubscriptionStatus(text);
        await adminDb.ref(`subscriptions/${subId}/status`).set(status);
      } else if (field === 'host_account_id') {
        // Find host by email
        const hostsSnapshot = await adminDb.ref("host_accounts").once("value");
        const hostsData = hostsSnapshot.val() || {};
        const hostsList = Object.keys(hostsData).map(key => ({ id: key, email: hostsData[key].account_email }));
        const host = hostsList.find(h => h.email.toLowerCase() === text.toLowerCase().trim());
        if (!host) {
          await sendTelegramReply(botToken, chatId, "❌ Email akun induk tidak ditemukan. Silakan masukkan email host yang terdaftar:");
          return true;
        }
        updateValue = host.id;
      } else if (field === 'customer_email') {
        if (!text.includes("@")) {
          await sendTelegramReply(botToken, chatId, "❌ Email tidak valid. Silakan masukkan format email yang benar:");
          return true;
        }
      }

      // Perform update
      await adminDb.ref(`subscriptions/${subId}/${field}`).set(updateValue);
      await clearSession(chatId);
      
      const readableField = field === "customer_email" ? "Email Customer" :
                            field === "expiry_date" ? "Masa Aktif" :
                            field === "host_account_id" ? "Akun Induk" :
                            field === "payment_channel" ? "Payment Channel" : "Price";

      await sendTelegramReply(
        botToken, 
        chatId, 
        `✅ *Update Sukses!*\n\nCustomer: \`${email}\`\nField *${readableField}* berhasil diubah menjadi: \`${text}\``,
        { remove_keyboard: true }
      );
      return true;
    }

    if (step === 'awaiting_host_email') {
      const emailInput = text.toLowerCase().trim();
      // Search host account for this email
      const hostsSnapshot = await adminDb.ref("host_accounts").once("value");
      const hostsData = hostsSnapshot.val() || {};
      const hostsList = Object.keys(hostsData).map(key => ({ id: key, ...hostsData[key] }));
      const host = hostsList.find(h => h.account_email.toLowerCase() === emailInput);

      if (!host) {
        await sendTelegramReply(
          botToken, 
          chatId, 
          `❌ Akun induk dengan email \`${text}\` tidak ditemukan.\n\nSilakan ketik ulang email akun induk yang valid atau kirim /cancel:`
        );
        return true;
      }

      // Save to session, change state to awaiting field choice
      await saveSession(chatId, {
        step: 'awaiting_host_field',
        data: { hostId: host.id, email: host.account_email }
      });

      // Show keyboard options for host
      const keyboard = {
        keyboard: [
          [{ text: "Email Host" }, { text: "Total Slot" }],
          [{ text: "Masa Aktif Host" }, { text: "Billing Type" }],
          [{ text: "Status" }, { text: "Batal" }]
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      };

      await sendTelegramReply(
        botToken, 
        chatId, 
        `📦 *Akun Induk ditemukan!*\n- Email: \`${host.account_email}\`\n- Total Slot: \`${host.total_slot}\`\n- Billing: \`${host.billing_type}\`\n- Active Until: \`${host.active_until}\`\n- Status: \`${host.status}\`\n\nSilakan pilih field yang ingin diubah:`,
        keyboard
      );
      return true;
    }

    if (step === 'awaiting_host_field') {
      if (text === "Batal") {
        await clearSession(chatId);
        await sendTelegramReply(botToken, chatId, "❌ Aksi dibatalkan.", { remove_keyboard: true });
        return true;
      }

      const fieldMap: Record<string, string> = {
        "Email Host": "account_email",
        "Total Slot": "total_slot",
        "Masa Aktif Host": "active_until",
        "Billing Type": "billing_type",
        "Status": "status"
      };

      const dbField = fieldMap[text];
      if (!dbField) {
        await sendTelegramReply(botToken, chatId, "❌ Pilihan tidak valid. Silakan gunakan tombol keyboard yang disediakan atau kirim /cancel.");
        return true;
      }

      // Save field to edit
      await saveSession(chatId, {
        step: 'awaiting_host_value',
        data: { ...data, field: dbField }
      });

      if (dbField === 'account_email') {
        await sendTelegramReply(botToken, chatId, "✉️ Masukkan *email baru* untuk akun induk ini:", { remove_keyboard: true });
      } else if (dbField === 'total_slot') {
        await sendTelegramReply(botToken, chatId, "🔢 Masukkan *total slot baru* (angka saja, contoh: `5`):", { remove_keyboard: true });
      } else if (dbField === 'active_until') {
        await sendTelegramReply(botToken, chatId, "📅 Masukkan *tanggal expired baru* (format: `YYYY-MM-DD`):", { remove_keyboard: true });
      } else if (dbField === 'billing_type') {
        const keyboard = {
          keyboard: [
            [{ text: "harian" }, { text: "mingguan" }],
            [{ text: "bulanan" }, { text: "Batal" }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        };
        await sendTelegramReply(botToken, chatId, "⏳ Pilih *billing type baru*:", keyboard);
      } else if (dbField === 'status') {
        const keyboard = {
          keyboard: [
            [{ text: "proses" }, { text: "aktif" }],
            [{ text: "nonaktif" }, { text: "Batal" }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        };
        await sendTelegramReply(botToken, chatId, "⚙️ Pilih *status baru*:", keyboard);
      }
      return true;
    }

    if (step === 'awaiting_host_value') {
      if (text === "Batal") {
        await clearSession(chatId);
        await sendTelegramReply(botToken, chatId, "❌ Aksi dibatalkan.", { remove_keyboard: true });
        return true;
      }

      const { hostId, field, email } = data;
      let updateValue: any = text;

      // Validation
      if (field === 'total_slot') {
        const parsed = parseInt(text, 10);
        if (isNaN(parsed) || parsed <= 0) {
          await sendTelegramReply(botToken, chatId, "❌ Nominal slot tidak valid. Silakan masukkan angka nominal yang benar:");
          return true;
        }
        updateValue = parsed;
      } else if (field === 'active_until') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          await sendTelegramReply(botToken, chatId, "❌ Format tanggal salah. Gunakan format `YYYY-MM-DD` (contoh: `2026-12-31`):");
          return true;
        }
      } else if (field === 'billing_type') {
        if (text !== 'harian' && text !== 'mingguan' && text !== 'bulanan') {
          await sendTelegramReply(botToken, chatId, "❌ Opsi tidak valid. Pilih dari keyboard:");
          return true;
        }
      } else if (field === 'status') {
        if (text !== 'proses' && text !== 'aktif' && text !== 'nonaktif') {
          await sendTelegramReply(botToken, chatId, "❌ Opsi tidak valid. Pilih dari keyboard:");
          return true;
        }
      } else if (field === 'account_email') {
        if (!text.includes("@")) {
          await sendTelegramReply(botToken, chatId, "❌ Email tidak valid. Silakan masukkan format email yang benar:");
          return true;
        }
      }

      // Perform update
      await adminDb.ref(`host_accounts/${hostId}/${field}`).set(updateValue);
      await clearSession(chatId);
      
      const readableField = field === "account_email" ? "Email Host" :
                            field === "total_slot" ? "Total Slot" :
                            field === "active_until" ? "Masa Aktif Host" :
                            field === "billing_type" ? "Billing Type" : "Status";

      await sendTelegramReply(
        botToken, 
        chatId, 
        `✅ *Update Sukses!*\n\nAkun Induk: \`${email}\`\nField *${readableField}* berhasil diubah menjadi: \`${text}\``,
        { remove_keyboard: true }
      );
      return true;
    }

  } catch (error: any) {
    console.error("Error handling session state:", error);
    await sendTelegramReply(botToken, chatId, `❌ *Terjadi kesalahan saat memproses data:* ${error.message}`, { remove_keyboard: true });
    await clearSession(chatId);
    return true;
  }

  return false;
}

// Helper: Handle CSV Upload and bulk syncing
async function handleCsvUpload(botToken: string | undefined, chatId: number, fileId: string) {
  if (!botToken || !adminDb) return;

  try {
    // Send initial notification
    await sendTelegramReply(botToken, chatId, "⏳ *Memproses file CSV Anda...*");

    // 1. Get file path from Telegram
    const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
    if (!fileRes.ok) {
      throw new Error(`Gagal mendapatkan file info dari Telegram: ${await fileRes.text()}`);
    }
    const fileData = await fileRes.json();
    const filePath = fileData.result.file_path;

    // 2. Download file content
    const downloadRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
    if (!downloadRes.ok) {
      throw new Error(`Gagal mengunduh file dari Telegram: ${await downloadRes.text()}`);
    }
    const csvText = await downloadRes.text();

    // 3. Parse CSV rows
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 3) {
      throw new Error("Format CSV tidak valid atau baris data kurang.");
    }

    // Split logic handling double quotes correctly
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    // Fetch existing records from Firebase for comparison and update
    const [subsSnap, hostsSnap] = await Promise.all([
      adminDb.ref("subscriptions").once("value"),
      adminDb.ref("host_accounts").once("value"),
    ]);

    const existingSubs = subsSnap.val() || {};
    const existingHosts = hostsSnap.val() || {};

    const hostAccounts = Object.keys(existingHosts).map(key => ({
      id: key,
      ...existingHosts[key]
    }));

    const subscriptions = Object.keys(existingSubs).map(key => ({
      id: key,
      ...existingSubs[key]
    }));

    // Pass 1: Count customer subscriptions in the CSV for each host to calculate total slot dynamically
    const csvCustomerCounts: Record<string, number> = {};
    for (let i = 2; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      if (cols.length > 3 && cols[3]) {
        const hostEmail = cols[3].toLowerCase().trim();
        csvCustomerCounts[hostEmail] = (csvCustomerCounts[hostEmail] || 0) + 1;
      }
    }

    // Pass 2: Parse and record hosts defined in columns 8 to 11
    const hostUpdates: Record<string, any> = {};
    let hostsCreated = 0;
    let hostsUpdated = 0;

    for (let i = 2; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      if (cols.length > 8 && cols[8] && cols[8].includes("@")) {
        const hostEmail = cols[8].toLowerCase().trim();
        const sisaSlot = parseInt(cols[9], 10) || 0;
        const billingTypeIndo = cols[10] || "Bulanan";
        const billingType = billingTypeIndo.toLowerCase() === "harian" ? "harian" :
                            billingTypeIndo.toLowerCase() === "mingguan" ? "mingguan" : "bulanan";
        const expiryDateStr = parseIndoDate(cols[11]);

        // Find if host exists
        const existingHost = hostAccounts.find(h => h.account_email.toLowerCase() === hostEmail);
        const activeCount = csvCustomerCounts[hostEmail] || 0;
        const calculatedTotalSlot = Math.max(5, activeCount + sisaSlot);

        const hostData = {
          account_email: hostEmail,
          billing_type: billingType,
          total_slot: calculatedTotalSlot,
          active_until: expiryDateStr || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: "aktif" as const,
        };

        if (existingHost) {
          hostUpdates[`host_accounts/${existingHost.id}`] = {
            ...existingHost,
            ...hostData,
          };
          hostsUpdated++;
        } else {
          // Push new host
          const newHostRef = adminDb.ref("host_accounts").push();
          hostUpdates[`host_accounts/${newHostRef.key}`] = {
            ...hostData,
            created_at: Date.now(),
          };
          // Also insert into our memory list to link with subscriptions below
          hostAccounts.push({
            id: newHostRef.key || undefined,
            ...hostData,
            created_at: Date.now()
          });
          hostsCreated++;
        }
      }
    }

    // Save host updates first so keys exist
    if (Object.keys(hostUpdates).length > 0) {
      await adminDb.ref().update(hostUpdates);
    }

    // Pass 3: Parse and record customers defined in columns 0 to 5
    const customerUpdates: Record<string, any> = {};
    let customersCreated = 0;
    let customersUpdated = 0;
    let skippedRows = 0;

    for (let i = 2; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCSVLine(lines[i]);
      if (cols.length > 0 && cols[0] && cols[0].includes("@")) {
        const customerEmail = cols[0].toLowerCase().trim();
        const durationLabel = cols[1] || "1 Bulan";
        const expiryDateStr = parseIndoDate(cols[2]);
        const hostEmail = cols[3] ? cols[3].toLowerCase().trim() : "";
        const paymentChannel = cols[4] || "QRIS";
        const price = parsePrice(cols[5]);

        if (!expiryDateStr || !hostEmail) {
          skippedRows++;
          continue;
        }

        // Find host key by email
        const host = hostAccounts.find(h => h.account_email.toLowerCase() === hostEmail);
        if (!host || !host.id) {
          skippedRows++;
          continue;
        }

        const startDate = calculateStartDate(expiryDateStr, durationLabel);
        const status = getSubscriptionStatus(expiryDateStr);

        const subData = {
          customer_email: customerEmail,
          duration_label: durationLabel,
          expiry_date: expiryDateStr,
          host_account_id: host.id,
          payment_channel: paymentChannel,
          price: price,
          start_date: startDate,
          status: status,
        };

        // Find if subscription exists
        const existingSub = subscriptions.find(s => s.customer_email.toLowerCase() === customerEmail && s.host_account_id === host.id);
        if (existingSub) {
          customerUpdates[`subscriptions/${existingSub.id}`] = {
            ...existingSub,
            ...subData,
          };
          customersUpdated++;
        } else {
          const newSubRef = adminDb.ref("subscriptions").push();
          customerUpdates[`subscriptions/${newSubRef.key}`] = {
            ...subData,
            created_at: Date.now(),
          };
          customersCreated++;
        }
      }
    }

    // Save customer updates
    if (Object.keys(customerUpdates).length > 0) {
      await adminDb.ref().update(customerUpdates);
    }

    // Build summary reply
    const summary = 
      `📊 *Hasil Sinkronisasi CSV Berhasil!*\n\n` +
      `👤 *Customers:*\n` +
      `- Dibuat baru: ${customersCreated}\n` +
      `- Diperbarui: ${customersUpdated}\n\n` +
      `📦 *Akun Induk (Hosts):*\n` +
      `- Dibuat baru: ${hostsCreated}\n` +
      `- Diperbarui: ${hostsUpdated}\n\n` +
      `⚠️ *Baris di-skip/gagal:* ${skippedRows}\n\n` +
      `💡 *Info:* Database telah sinkron dengan file CSV Anda.`;

    await sendTelegramReply(botToken, chatId, summary);
  } catch (error: any) {
    console.error("Error processing CSV file:", error);
    await sendTelegramReply(botToken, chatId, `❌ *Gagal memproses file CSV:* ${error.message}`);
  }
}

