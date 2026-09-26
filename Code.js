// ============================================================================
// НАСТРОЙКИ (меняете только это)
// ============================================================================
const BOT_TOKEN       = 'YOUR_TELEGRAM_BOT_TOKEN';      // Токен бота из @BotFather
const GROUP_CHAT_ID   = 'YOUR_TELEGRAM_GROUP_CHAT_ID';  // ID группы или канала

const SHEET_NAME      = 'Лист1';                        // Название листа в Google Таблице
const DATA_START_ROW  = 2;                              // Строка, с которой начинаются данные
const TIME_ZONE       = 'Asia/Tashkent';                // Часовой пояс

// ВРЕМЯ ЕЖЕДНЕВНОЙ ОТПРАВКИ СМЕНЫ (Ташкент)
const DAILY_HOUR      = 9;                              // 09:00
const DAILY_MINUTE    = 0;

const PRAYER_REGION   = 'Toshkent';                     // Город для расписания намаза

// ============================================================================
// 0) УТИЛИТЫ
// ============================================================================
function pad(n) { return n < 10 ? '0' + n : String(n); }

function getTodayKey() {
  const now = new Date();
  const dd = Utilities.formatDate(now, TIME_ZONE, 'dd');
  const mm = Utilities.formatDate(now, TIME_ZONE, 'MM');
  const yy = Utilities.formatDate(now, TIME_ZONE, 'yy');
  return `${dd}/${mm}/${yy}`;
}

function getTomorrowKey() {
  const now = new Date();
  const tmr = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dd = Utilities.formatDate(tmr, TIME_ZONE, 'dd');
  const mm = Utilities.formatDate(tmr, TIME_ZONE, 'MM');
  const yy = Utilities.formatDate(tmr, TIME_ZONE, 'yy');
  return `${dd}/${mm}/${yy}`;
}

// dd/MM/yy | dd.MM.yy | dd/MM/yyyy | dd.MM.yyyy
function normalizeDateKey(input) {
  let s = String(input || '').trim().replace(/\./g, '/').replace(/\s+/g, '');
  s = s.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, (m, d, mo, y) =>
    pad(parseInt(d, 10)) + '/' + pad(parseInt(mo, 10)) + '/' + (String(y).length === 4 ? String(y).slice(-2) : pad(parseInt(y, 10)))
  );
  return s;
}

// ============================================================================
// 1) ТОЧНОЕ РАСПИСАНИЕ НАМАЗА (с обходом кеширования)
// ============================================================================
function getPrayerTimesToday() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd');
  
  const cachedDate = props.getProperty('PRAYER_DATE_V4');
  const cachedTimes = props.getProperty('PRAYER_TIMES_V4');
  if (cachedDate === today && cachedTimes) {
    try {
      return JSON.parse(cachedTimes);
    } catch(e) {}
  }

  // 1-я попытка: namozvaqti.uz (с параметром ?t= для обхода кеша Cloudflare)
  try {
    const timestamp = new Date().getTime();
    const url = 'https://namozvaqti.uz/shahar/toshkent?t=' + timestamp;
    const res = UrlFetchApp.fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      const html = res.getContentText();
      const getVal = (id) => {
        const m = html.match(new RegExp('id=["\']' + id + '["\'][^>]*>\\s*(\\d{2}:\\d{2})', 'i'));
        return m ? m[1] : null;
      };

      const b = getVal('bomdod');
      const q = getVal('quyosh');
      const p = getVal('peshin');
      const a = getVal('asr');
      const s = getVal('shom');
      const x = getVal('hufton');

      if (b && p && a && s && x) {
        const times = {
          'Фаджр (Бомдод)': b,
          'Восход солнца':  q,
          'Зухр (Пешин)':   p,
          'Аср':            a,
          'Магриб (Шом)':   s,
          'Иша (Хуфтон)':   x
        };
        props.setProperty('PRAYER_DATE_V4', today);
        props.setProperty('PRAYER_TIMES_V4', JSON.stringify(times));
        return times;
      }
    }
  } catch(e) {
    Logger.log('Ошибка namozvaqti.uz: ' + e);
  }

  // 2-я попытка резервная: Aladhan API (Ханафитский мазхаб, Ташкент)
  try {
    const res2 = UrlFetchApp.fetch('https://api.aladhan.com/v1/timingsByCity?city=Tashkent&country=Uzbekistan&method=14&school=1', { muteHttpExceptions: true });
    if (res2.getResponseCode() === 200) {
      const d = JSON.parse(res2.getContentText()).data.timings;
      const times = {
        'Фаджр (Бомдод)': d.Fajr,
        'Восход солнца':  d.Sunrise,
        'Зухр (Пешин)':   d.Dhuhr,
        'Аср':            d.Asr,
        'Магриб (Шом)':   d.Maghrib,
        'Иша (Хуфтон)':   d.Isha
      };
      props.setProperty('PRAYER_DATE_V4', today);
      props.setProperty('PRAYER_TIMES_V4', JSON.stringify(times));
      return times;
    }
  } catch(e) {
    Logger.log('Ошибка Aladhan: ' + e);
  }

  return null;
}

function formatAllPrayerTimes(times) {
  const today = Utilities.formatDate(new Date(), TIME_ZONE, 'dd.MM.yyyy');
  return `🕌 <b>Расписание намаза на сегодня (${today})</b>\n` +
         `📍 Регион: <b>${PRAYER_REGION}</b>\n\n` +
         `🌌 Фаджр (Бомдод): <b>${times['Фаджр (Бомдод)']}</b>\n` +
         `🌅 Восход солнца: <b>${times['Восход солнца']}</b>\n` +
         `☀️ Зухр (Пешин): <b>${times['Зухр (Пешин)']}</b>\n` +
         `⛅️ Аср: <b>${times['Аср']}</b>\n` +
         `🌆 Магриб (Шом): <b>${times['Магриб (Шом)']}</b>\n` +
         `🌙 Иша (Хуфтон): <b>${times['Иша (Хуфтон)']}</b>`;
}

function checkPrayerAlerts() {
  const times = getPrayerTimesToday();
  if (!times) return;

  const now = new Date();
  const currentHM = Utilities.formatDate(now, TIME_ZONE, 'HH:mm');
  const today = Utilities.formatDate(now, TIME_ZONE, 'yyyy-MM-dd');
  const props = PropertiesService.getScriptProperties();

  const alertsList = ['Фаджр (Бомдод)', 'Зухр (Пешин)', 'Аср', 'Магриб (Шом)', 'Иша (Хуфтон)'];

  for (const name of alertsList) {
    const timeStr = times[name];
    if (timeStr === currentHM) {
      const sentKey = `SENT_${name}_${today}`;
      if (!props.getProperty(sentKey)) {
        props.setProperty(sentKey, 'true');
        const text = `🕌 <b>Наступило время намаза ${name}!</b> (${timeStr})`;
        sendMessage(GROUP_CHAT_ID, text);
        Logger.log(`✅ Отправлено: ${name}`);
      }
    }
  }
}

// ============================================================================
// 2) АНТИ-ДУБЛИ
// ============================================================================
function isDuplicateUpdate(updateId) {
  const cache = CacheService.getScriptCache();
  const key = `upd_${updateId}`;
  if (cache.get(key)) return true;
  cache.put(key, '1', 6 * 60 * 60); // 6 часов
  return false;
}

// ============================================================================
// 3) АНТИ-СПАМ ЕЖЕДНЕВКИ (1 раз в сутки)
// ============================================================================
function shouldSendDaily(dateKey) {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('LAST_DAILY_SENT') !== dateKey;
}
function markDailySent(dateKey) {
  PropertiesService.getScriptProperties().setProperty('LAST_DAILY_SENT', dateKey);
}
function resetDailyLock() {
  PropertiesService.getScriptProperties().deleteProperty('LAST_DAILY_SENT');
  Logger.log('✅ Daily lock reset.');
}

// ============================================================================
// 4) ЧТЕНИЕ ДАННЫХ ИЗ GOOGLE SHEETS
// ============================================================================
function getShiftsForDate(dateKey) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log('❌ Лист не найден: ' + SHEET_NAME);
    return [];
  }

  const values = sheet.getDataRange().getValues();
  const target = normalizeDateKey(dateKey);
  const result = [];

  for (let i = DATA_START_ROW - 1; i < values.length; i++) {
    const cell = values[i][0];
    let cellStr = '';

    if (cell instanceof Date && !isNaN(cell.getTime())) {
      cellStr = Utilities.formatDate(cell, TIME_ZONE, 'dd/MM/yy');
    } else if (typeof cell === 'string' && cell.trim()) {
      cellStr = normalizeDateKey(cell);
    } else {
      continue;
    }

    if (cellStr === target) {
      const analitik = String(values[i][1] || '').trim();
      const name     = String(values[i][2] || '').trim();
      const smena    = String(values[i][3] || '').trim();
      let rejim      = String(values[i][4] || '').trim();
      if (!rejim && values[i][5]) rejim = String(values[i][5] || '').trim();

      if (name) result.push({ analitik, name, smena, rejim });
    }
  }

  return result;
}

// ============================================================================
// 5) ФОРМАТ СООБЩЕНИЯ О СМЕНЕ
// ============================================================================
function formatRU(dateKey, shifts) {
  const day   = shifts.filter(s => /день|kun|День/i.test(s.rejim));
  const night = shifts.filter(s => !/день|kun|День/i.test(s.rejim));

  let text = `👋🏻 Доброе утро! Сегодня ${dateKey}\n\n`;

  if (day.length) {
    text += `🌞 Дневная смена:\n`;
    day.forEach(s => text += `Ст.смена • ${s.name} — ${s.smena}\n`);
    text += '\n';
  }

  if (night.length) {
    text += `🌙 Ночная смена:\n`;
    night.forEach(s => text += `Ст.смена • ${s.name} — ${s.smena}\n`);
    text += '\n';
  }

  const analysts = new Set(shifts.map(s => s.analitik).filter(a => a && a.trim()));
  if (analysts.size) text += `👨🏻💻 Аналитик — ${[...analysts].join(', ')}`;

  return text;
}

// ============================================================================
// 6) ОТПРАВКА В TELEGRAM
// ============================================================================
function sendMessage(chatId, text) {
  const url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage';
  const resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ 
      chat_id: chatId, 
      text: String(text || ''),
      parse_mode: 'HTML'
    }),
    muteHttpExceptions: true
  });

  const body = resp.getContentText();
  Logger.log('sendMessage chatId=' + chatId + ' -> ' + body);
  return body;
}

// ============================================================================
// 7) ОБРАБОТЧИК ВЕБХУКА (WEBHOOK HANDLER)
// ============================================================================
function doGet(e) {
  return HtmlService.createHtmlOutput('OK');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);

  try {
    const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    if (data.update_id && isDuplicateUpdate(data.update_id)) {
      return HtmlService.createHtmlOutput('OK');
    }

    if (!data.message) return HtmlService.createHtmlOutput('OK');

    const msg = data.message;
    const chatId = msg.chat.id;
    const text = String(msg.text || '').trim();

    if (!text.startsWith('/')) return HtmlService.createHtmlOutput('OK');

    const cmd = text.toLowerCase().split('@')[0];
    let reply = '';

    if (cmd === '/start' || cmd === '/today' || cmd === '/bugun') {
      const key = getTodayKey();
      const shifts = getShiftsForDate(key);
      reply = shifts.length ? formatRU(key, shifts) : `На сегодня (${key}) смены не найдены.`;
    }
    else if (cmd === '/tomorrow' || cmd === '/ertaga') {
      const key = getTomorrowKey();
      const shifts = getShiftsForDate(key);
      reply = shifts.length ? formatRU(key, shifts) : `На завтра (${key}) данных нет.`;
    }
    else if (cmd.startsWith('/date ')) {
      const dateStr = text.replace(/\/date\s+/i, '').trim();
      const key = normalizeDateKey(dateStr);
      const shifts = getShiftsForDate(key);
      reply = shifts.length ? formatRU(key, shifts) : `На дату ${key} данных нет.`;
    }
    else if (cmd === '/all' || cmd === '/namoz' || cmd === '/namaz') {
      const pTimes = getPrayerTimesToday();
      reply = pTimes ? formatAllPrayerTimes(pTimes) : '⚠️ Не удалось загрузить расписание намаза. Попробуйте позже.';
    }
    else if (cmd === '/ping') {
      reply = '✅ Бот на связи. Webhook работает.';
    }

    if (reply) sendMessage(chatId, reply);

  } catch (err) {
    Logger.log('doPost error: ' + err);
  } finally {
    lock.releaseLock();
  }

  // HtmlService исключает ошибку 302 Redirect в Telegram
  return HtmlService.createHtmlOutput('OK');
}

// ============================================================================
// 8) ЕЖЕДНЕВНАЯ ПРОВЕРКА (Триггер каждую минуту)
// ============================================================================
function checkAndSendDaily() {
  try {
    checkPrayerAlerts();
  } catch (e) {
    Logger.log('Prayer error: ' + e);
  }

  const now = new Date();
  const hour = Number(Utilities.formatDate(now, TIME_ZONE, 'H'));
  const minute = Number(Utilities.formatDate(now, TIME_ZONE, 'm'));

  if (hour !== DAILY_HOUR) return;
  if (minute < DAILY_MINUTE || minute > DAILY_MINUTE + 4) return;

  const todayKey = getTodayKey();
  if (!shouldSendDaily(todayKey)) return;

  const shifts = getShiftsForDate(todayKey);
  if (shifts.length === 0) return;

  sendMessage(GROUP_CHAT_ID, formatRU(todayKey, shifts));
  markDailySent(todayKey);
}

// ============================================================================
// 9) УСТАНОВКА ВЕБХУКА
// ============================================================================
function resetAndSetWebhook() {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/deleteWebhook?drop_pending_updates=true', {
    muteHttpExceptions: true
  });

  // URL развернутого веб-приложения
  const webAppUrl = 'YOUR_DEPLOYED_WEBAPP_URL';

  const url = 'https://api.telegram.org/bot' + BOT_TOKEN + '/setWebhook?url=' + encodeURIComponent(webAppUrl);
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  Logger.log('Результат Webhook: ' + res.getContentText());
}

function setupMinuteTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkAndSendDaily') ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('checkAndSendDaily')
    .timeBased()
    .everyMinutes(1)
    .create();

  Logger.log('✅ Minute trigger created for checkAndSendDaily.');
}
