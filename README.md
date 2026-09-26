# 🤖 Telegram Shift & Prayer Times Bot (Google Apps Script)

Telegram boti Google Sheets jadvalidagi ish smenalarini va Toshkent shahri bo‘yicha namoz vaqtlarini avtomatik eslatib turish uchun mo‘ljallangan. Server talab qilmaydi — to‘liq **Google Apps Script** platformasida bepul ishlaydi.

---

## ✨ Imkoniyatlari (Features)

1. **📋 Smena hisoboti (Google Sheets integratsiyasi):**
   - Har kuni ertalab soat **09:00** da bugungi kunduzgi va tungi smena xodimlarini jadvaldan olib, Telegram guruhiga avtomatik yuboradi.
   - Guruhda yoki shaxsiy chatda buyruqlar orqali ko‘rish:
     - `/today` yoki `/bugun` — Bugungi smena.
     - `/tomorrow` yoki `/ertaga` — Ertangi smena.
     - `/date dd/MM/yy` — Istalgan sana bo‘yicha smena.

2. **🕌 Namoz vaqtlari eslatmasi (Toshkent vaqti):**
   - Har bir namoz vaqti (Bomdod, Peshin, Asr, Shom, Xufton) kirgan aniq daqiqada guruhga qisqa eslatma xabarini yuboradi.
   - Har namoz uchun kuniga faqat 1 marta yuboriladi (anti-dubl mexanizmi).
   - O‘zbekiston Musulmonlari Idorasi rasmiy taqvimi bo‘yicha `namozvaqti.uz` bilan integratsiya qilingan (har kuni avtomatik yangilanadi).
   - `/all`, `/namoz` yoki `/namaz` buyrug‘i orqali kunlik to‘liq namoz vaqtlarini ko‘rish mumkin.

3. **🛡 Ishonchlilik & Xavfsizlik:**
   - Google Apps Script 302 Redirect muammosini chetlab o‘tish uchun `HtmlService` qo‘llangan.
   - Telegram takroriy so‘rovlarini filtrlash uchun `CacheService` orqali anti-dubl himoyasi.
   - Tashqi sayt keshini chetlab o‘tish (anti-cache) filtri.

---

## 🚀 O‘rnatish va Ishga tushirish (Setup Guide)

### 1. Google Sheets tayyorlash
1. [Google Sheets](https://sheets.new) orqali yangi jadval oching.
2. Varag‘ nomini `Лист1` deb nomlang.
3. Ustunlarni quyidagi tartibda to‘ldiring (2-qatordan boshlab):
   - **A ustun:** Sana (`dd/MM/yy` formatida, masalan: `26/09/26`)
   - **B ustun:** Analitik / Mas'ul shaxs
   - **C ustun:** Xodim ismi
   - **D ustun:** Smena turi
   - **E ustun:** Rejim (`день` yoki `ночь`)

### 2. Google Apps Script sozlash
1. Google Sheets menyusidan **Kengaytmalar (Extensions)** ➔ **Apps Script** bo‘limiga kiring.
2. `Code.js` faylidagi kodni to‘liq nusxalab, Apps Script muharririga joylang.
3. Yuqoridagi sozlamalarni o‘zgartiring:
   ```javascript
   const BOT_TOKEN     = 'SIZNING_BOT_TOKENINGIZ';
   const GROUP_CHAT_ID = 'SIZNING_GURUH_CHAT_IDINGIZ';
   ```
4. **Ctrl + S** (yoki Cmd + S) tugmasini bosib saqlang.

### 3. Deploy qilish (Web App)
1. O‘ng yuqoridagi **Deploy** ➔ **New deployment** (yoki **Manage deployments**) tugmasini bosing.
2. Turi: **Web app** ni tanlang.
3. **Execute as:** `Me` (Sizning emailingiz).
4. **Who has access:** `Anyone` (Hamma).
5. **Deploy** tugmasini bosing va chiqqan **Web app URL** manzilidan nusxa oling (`https://script.google.com/macros/s/.../exec`).

### 4. Webhook va Triggerlarni yoqish
1. Nusxalangan Web app URL manzilini `resetAndSetWebhook` funksiyasi ichidagi `webAppUrl` o‘zgaruvchisiga qo‘ying.
2. Funksiyalar ro‘yxatidan **`resetAndSetWebhook`** ni tanlab, **Run** tugmasini bosing.
3. Funksiyalar ro‘yxatidan **`setupMinuteTrigger`** ni tanlab, **Run** tugmasini bosing.

Bo‘ldi! Bot to‘liq avtomatlashtirildi va har kuni mustaqil ishlaydi.

---

## 📌 Mavjud Buyruqlar

| Buyruq | Tavsif |
|---|---|
| `/all` / `/namoz` | Bugungi kunlik namoz vaqtlarini ko‘rish |
| `/today` / `/bugun` | Bugungi smena ro‘yxatini ko‘rish |
| `/tomorrow` / `/ertaga` | Ertangi smena ro‘yxatini ko‘rish |
| `/date 26/09/26` | Berilgan sana bo‘yicha smenani ko‘rish |
| `/ping` | Bot holatini tekshirish |

---

## 📄 Litsenziya
MIT License.
