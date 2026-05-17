/* =======================================================
   מערכת תמלול תורני חכם — v9
   ארגז כלים מלא לעורך תורני
   קובץ JavaScript ראשי — פוצל מ-torah_transcription_v8.html
   ======================================================= */

// =======================================================
// v9.1: מסך כניסה עם סיסמה — חסימה רכה משופרת (lockout + ניסיונות מוגבלים)
// =======================================================
const ACCESS_HASH = "91b594446a5b689fed65ad5268ec1c7e4f6c88f5186bd92f607f93ad011054f9";
const MAX_GATE_ATTEMPTS = 5;
const GATE_LOCKOUT_MS = 60 * 1000;

async function sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getGateLockoutRemaining() {
    try {
        const until = parseInt(localStorage.getItem('torahApp_gateLockoutUntil') || '0', 10);
        const now = Date.now();
        if (until > now) return Math.ceil((until - now) / 1000);
    } catch (e) {}
    return 0;
}

async function checkGatePassword() {
    const inputEl = document.getElementById('gatePassword');
    const errEl = document.getElementById('gateError');
    const raw = (inputEl.value || '').trim().replace(/\s+/g, ' ');
    if (!raw) { errEl.textContent = 'נא להזין סיסמה'; return; }
    const lockoutSec = getGateLockoutRemaining();
    if (lockoutSec > 0) {
        errEl.textContent = '🔒 חריגה ממספר הניסיונות. נסה שוב בעוד ' + lockoutSec + ' שניות.';
        return;
    }
    try {
        const hash = await sha256Hex(raw);
        if (hash === ACCESS_HASH) {
            try {
                localStorage.setItem('torahApp_accessGranted', '1');
                localStorage.removeItem('torahApp_gateAttempts');
                localStorage.removeItem('torahApp_gateLockoutUntil');
            } catch (e) {}
            unlockApp();
        } else {
            let attempts = 0;
            try {
                attempts = parseInt(localStorage.getItem('torahApp_gateAttempts') || '0', 10) + 1;
                localStorage.setItem('torahApp_gateAttempts', String(attempts));
                if (attempts >= MAX_GATE_ATTEMPTS) {
                    localStorage.setItem('torahApp_gateLockoutUntil', String(Date.now() + GATE_LOCKOUT_MS));
                    localStorage.setItem('torahApp_gateAttempts', '0');
                }
            } catch (e) {}
            const remaining = MAX_GATE_ATTEMPTS - attempts;
            if (remaining > 0) errEl.textContent = '❌ סיסמה שגויה (נותרו ' + remaining + ' ניסיונות)';
            else errEl.textContent = '🔒 חריגה ממספר הניסיונות. נסה שוב בעוד ' + Math.ceil(GATE_LOCKOUT_MS/1000) + ' שניות.';
            inputEl.value = '';
            inputEl.focus();
        }
    } catch (e) {
        errEl.textContent = 'שגיאה בבדיקת הסיסמה: ' + e.message;
    }
}

function unlockApp() {
    const gate = document.getElementById('passwordGate');
    if (gate) gate.style.display = 'none';
    document.body.classList.remove('gated');
}

// בדיקה בטעינה — אם המשתמש כבר הזין סיסמה בעבר באותו דפדפן
(function initGate() {
    try {
        if (localStorage.getItem('torahApp_accessGranted') === '1') {
            // נסתיר את השער מיד כדי שלא יהבהב
            document.addEventListener('DOMContentLoaded', unlockApp);
            // גם ניסיון מיידי (אם ה-DOM כבר מוכן)
            if (document.readyState !== 'loading') unlockApp();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                const entryBtn = document.getElementById('gateEntryButton');
                if (entryBtn) entryBtn.focus();
            });
        }
    } catch (e) {
        // אם localStorage חסום — פשוט נשאיר את השער (המשתמש יזין סיסמה)
    }
})();

function openGateModal() {
    const entryBtn = document.getElementById('gateEntryButton');
    const modal = document.getElementById('gateModal');
    const input = document.getElementById('gatePassword');
    if (entryBtn) {
        entryBtn.classList.add('hidden');
    }
    if (modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }
    if (input) {
        input.value = '';
        input.focus();
    }
}

function buildGeminiUrl(path, apiKey, extraParams = {}) {
    const url = new URL(`https://generativelanguage.googleapis.com/${path}`);
    url.searchParams.append('key', apiKey);
    for (const [paramName, paramValue] of Object.entries(extraParams)) {
        if (paramValue !== undefined && paramValue !== null) {
            url.searchParams.append(paramName, String(paramValue));
        }
    }
    return url.toString();
}

// =======================================================
// מילון תורני מובנה — נטען אוטומטית כתוספת לכל קריאה
// הכתיב הזה מוסכם, מקצועי, ועוזר למודל לא להמציא איות פונטי
// =======================================================
const BUILTIN_TORAH_GLOSSARY = `
**מסכתות הש"ס:** ברכות, שבת, עירובין, פסחים, שקלים, יומא, סוכה, ביצה, ראש השנה, תענית, מגילה, מועד קטן, חגיגה, יבמות, כתובות, נדרים, נזיר, סוטה, גיטין, קידושין, בבא קמא, בבא מציעא, בבא בתרא, סנהדרין, מכות, שבועות, עבודה זרה, הוריות, זבחים, מנחות, חולין, בכורות, ערכין, תמורה, כריתות, מעילה, נדה.

**ראשונים שכיחים:** רש"י, תוספות, תוס', רמב"ם, רמב"ן, רשב"א, ריטב"א, ר"ן, רא"ש, רי"ף, מאירי, ראב"ד, רבינו תם, ר"ת, ר"י, ר"ח (רבינו חננאל), נמוקי יוסף, רבינו ירוחם, סמ"ג, סמ"ק.

**אחרונים ופוסקים:** שולחן ערוך, רמ"א, ש"ך, ט"ז, מגן אברהם, באר היטב, פרי מגדים, חיי אדם, קצות החושן, נתיבות המשפט, פני יהושע, חתם סופר, אבני מילואים, מנחת חינוך, חידושי הריטב"א, אור שמח, אבן האזל, חזון איש, אגרות משה, ציץ אליעזר, יביע אומר.

**ראשי-תיבות נפוצים (כתב מדויק עם גרשיים):** ש"ס, תנ"ך, חז"ל, ע"א, ע"ב, ע"כ, ז"ל, ע"ה, זצ"ל, שליט"א, ב"ה, בס"ד, ה' יתברך, הקב"ה, ית"ש, ר"ל, ח"ו, אעפ"כ, אעפי"כ, אע"פ, אע"ג, ע"מ, כדי, וכו', וכד', וכה"ג, וכיו"ב, ובאופ"כ.

**ביטויי גמרא בארמית:** מאי טעמא, מאי קמ"ל, מנא הני מילי, ת"ש (תא שמע), פשיטא, איכא דאמרי, גופא, אמר ליה, אמר רב, תניא, תניא נמי הכי, תנן, תנן התם, מתניתין, ברייתא, מתני', גמ', רישא, סיפא, מציעתא, תיובתא, הא קמ"ל, מאי בינייהו, נפקא מינה, לישנא אחרינא, לאו דוקא, מהיכא תיתי, מהיכי תימצי, סלקא דעתך אמינא, קא משמע לן, אגב אורחא, מילתא דאתיא בק"ו, מק"ו לא אצטריכא, פלוגתא דרבוותא.

**ביטויי הלכה ומחשבה:** הלכה למעשה, להלכה, הלכה כפלוני, חולק על, סובר, הסכימו רוב הפוסקים, להוציא, נפסק להלכה, יוצא ידי חובה, מעיקר הדין, חומרא, קולא, סייג, גזרה, תקנת חכמים, מדאורייתא, מדרבנן, ספיקא דאורייתא לחומרא, ספיקא דרבנן לקולא, רוב, מיעוט, חזקה, טענת ברי, טענת שמא, מיגו, מיגו דאי בעי, חיוב מן התורה, פטור.

**מונחי לימוד וישיבה:** סוגיא, שיטה, פלוגתא, צ"ע (צריך עיון), צ"ל (צריך לומר), קשיא, נקטינן, קיימא לן, פסיקא לן, לכאורה, לפי זה, לפום ריהטא, לפי המבואר, ביאור, חידוש, יסוד, גדר, נקודה, חקירה, צד אחד, צד שני, דרך אחד, ספק, אפיקתא, אוקימתא, מסקנא, מסקנה.

**שמות מקראיים שכיחים:** משה רבינו, אהרן, יהושע, דוד המלך, שלמה המלך, אברהם אבינו, יצחק, יעקב, רחל, לאה, רבקה, שרה, יוסף הצדיק.

**הקפדה:** כתוב גרשיים אמיתיים (") ולא Apostrophe ('). כתוב "תוס'" ולא "תוסעת" או "תוסף". כתוב "ע"א" / "ע"ב" ולא "עא" / "עב". כתוב "רש"י" ולא "רשי".`;

// =======================================================
// פרומפטים מערכתיים בעברית בלבד
// =======================================================

// פרומפט מקוצר לחילוץ עוגנים — מהיר יותר, רק העיקר
const ANCHOR_EXTRACTION_PROMPT = `אתה מומחה לעולם הישיבות, הש"ס והפוסקים. סרוק את השמע במהירות והפק רשימה ממוקדת של עד 30 "עוגנים" — מושגי הליבה התורניים, מראי מקומות, שמות חכמים וביטויים ישיבתיים מיוחדים שמופיעים בשיעור.

חוקים:
1. רק רשימה מנוקדת בעברית, כל עוגן בשורה נפרדת עם מקף בתחילתה.
2. כתיב תורני מדויק (לא פונטי), כולל גרשיים נכונים בראשי תיבות (רמב"ם, ש"ך).
3. ללא הסברים, הקדמות או טקסט באנגלית. ישר לרשימה.
4. תעדף: שמות מסכתות, שמות חכמים, שמות ספרים, מונחים בארמית.
5. אל תמציא — רק מה ששמעת בפועל. עדיף 15 עוגנים מדויקים מאשר 50 ניחושים.
6. סיים את הרשימה ועצור. אל תוסיף סיכום.`;

const GUIDED_TRANSCRIPTION_PROMPT_BASE = `אתה תלמיד-חכם מומחה לספרות תורנית: תלמוד בבלי וירושלמי, הלכה, אגדה, חסידות, מוסר ומחשבת ישראל. אתה שומע *שיעור תורני בסגנון ישיבתי*. המשימה שלך: תמלול נאמן מלא, מילה במילה, של קטע השמע המצורף.

**הקשר המוסבר:**
- הדובר הוא תלמיד-חכם המוסר שיעור עיוני / שיעור הלכה / שיחה / דרשה.
- השיעור נישא בעברית-תורנית, עם שיבוץ תכוף של ארמית-תלמודית, ולפעמים יידיש ישיבתית.
- מצופה ניתוח של סוגיות, ציטוט פסוקים, מראי מקומות, פלוגתות בין ראשונים ואחרונים.
- "מילים זרות" כמו ת"ש, גמ', תוס', מאי קמ"ל — אינן זרות אלא קוד-לימוד מובנה. כתוב אותן כפי שהוא.

**כללים חמורים:**
1. **איסור מוחלט על אנגלית, פתיחות מערכת, או "Sure, here is the transcription" וכד'.** מתחיל מיד בעברית התורנית.
2. **תמלול מלא בלי דילוגים.** מתמלל מילה במילה. אם המהלך התלמודי ארוך — ממשיך עד הסוף.
3. **שלוש שפות מותרות בלבד:** עברית, ארמית-תלמודית, יידיש (כשמשובצת באמצע משפט). שום שפה אחרת אסורה.
4. **דייקנות בכתיב התורני:** כתוב גרשיים אמיתיים (") בראשי-תיבות (רש"י, רמב"ם, ש"ך). כתוב "תוס'" עם גרש לא Apostrophe. שמור על איות מסורתי של מסכתות וחכמים.
5. **אל תתקן ואל תפרפראז.** המטרה היא נאמנות לדובר, לא ניסוח מהוקצע. אם הדובר אמר "כאילו" — תכתוב "כאילו".
6. **חלוקה לפסקאות לפי נושאים** (כל פסקה 4-6 משפטים). שורה ריקה בין פסקאות.

**אנטי-לולאה (קריטי):**
- לעולם אל תחזור על אותה מילה, ביטוי, או צליל יותר מ-2 פעמים ברצף.
- אם לא הצלחת לפענח — כתוב "[לא ברור]" ועבור הלאה.
- אם אתה רואה שאתה חוזר על עצמך — עצור באמצע, כתוב "[המשך לא ברור]" ועבור.

**אנטי-הזיה (קריטי):**
- אסור לייצר תוכן שאיננו בשמע. אסור פרסומות, ביקורות מוצרים, רכבים, טכנולוגיה, ספורט, או כל "מילוי" זר.
- אם השמע ריק/פגום/שקט/רועש — תכתוב מיד "[שמע לא תקין או לא ברור — לא ניתן לתמלל]" ועצור.
- אסור לייצר תוכן באנגלית. אם אתה רואה את עצמך מתחיל באנגלית — עצור מיד וכתוב "[המודל לא הצליח לעבד את השמע]".

**שקט / רעש:** כתוב "[שקט]" או "[לא ברור]" ועבור הלאה.

**🕐 סימוני זמן — חובה:**
- בתחילת כל פסקה חדשה כתוב את הזמן בפורמט [MM:SS] בשורה משלו, כאשר MM הוא דקות ו-SS שניות.
- סמן לפחות **כל 30 שניות**, גם אם הפסקה ממשיכה.
- הזמן הוא יחסי לתחילת קטע השמע הזה (התחל מ-[00:00]).
- דוגמה:
  [00:00]
  והנה אומר רבינו, מה ששנינו במשנה...
  [00:30]
  ועל זה כתב הרשב"א בחידושיו...
- אסור להוסיף שניות-מאיות, אסור להוסיף תיאור-מקום אחרי הזמן, רק [MM:SS] נקי בשורה.

הפלט שלך יהיה אך ורק טקסט עברי-תורני רציף בפסקאות עם סימוני זמן. אין הקדמות, אין מטא-טקסט, אין הסברים — רק התמלול עצמו.`;

const CHUNK_TRANSCRIPTION_PROMPT_TAIL = `

**מצב צ'אנקים — הוראה קריטית:**
אתה מתמלל עכשיו טווח-זמן ספציפי ויחיד מתוך הקלטה גדולה יותר. תמלל אך ורק את הטווח הנתון (יוצג מיד למטה). הקלטה לפני הטווח או אחריו — להתעלם.
- מתחיל מהמילה הראשונה ששומעים בנקודת ה-START של הטווח.
- ממשיך עד למילה האחרונה לפני נקודת ה-END של הטווח.
- אם ה-START נופל באמצע משפט — מתחילים מאותה מילה (לא מתחילת המשפט).
- אם ה-END נופל באמצע משפט — עוצרים שם בלי לסיים את המשפט.
- אסור להוסיף סיכום, אסור להציג כותרת, אסור להציג את טווח הזמן עצמו בפלט.`;

const GUIDED_ANCHORS_BLOCK_HEADER = `\n\n**מילון עוגנים תורניים — מקור הסמכות לכתיב המדויק:**
להלן רשימת מושגים שזוהו מראש בשיעור זה. כשאתה שומע אחד מהם, כתוב אותו באיות המדויק כפי שהוא ברשימה (לא פונטי).`;

const BUILTIN_GLOSSARY_HEADER = `\n\n**מילון תורני קבוע (מקור סמכות לכתיב):**
להלן רשימה ממוסדת של מסכתות, ראשונים, אחרונים, ראשי-תיבות וביטויי גמרא. אם תזהה אחד מהם בשמע — כתוב אותו בדיוק כפי שמופיע כאן (כולל גרשיים נכונים). הרשימה מוסמכת ולא תידחה מלפני אוזן פונטית.`;

const PARALLEL_VALIDATION_PROMPT = `תפקידך הוא בורר איכות (Arbiter). יוצגו בפניך:
א) קובץ השמע המקורי.
ב) התמלול שהופק.
ג) רשימת עוגנים תורניים (אם קיימת).

המשימה שלך:
1. סרוק את התמלול וזהה מילים מעורפלות, סבירות לטעות, או הסותרות את רשימת העוגנים.
2. עבור כל בעיה: "מילה בתמלול: [X] | תיקון מוצע: [Y] | סיבה: [נימוק קצר]".
3. אם לא נמצאו בעיות: "לא נמצאו אי-בהירויות מהותיות. התמלול עקבי לאודיו."
4. כתוב בעברית בלבד. ללא הקדמות באנגלית.`;

// =======================================================
// v7.6: 5 רמות עוצמת-עריכה — כל רמה כוללת את כללי הרמות מתחתיה
// =======================================================
const EDIT_INTENSITY_PROFILES = {
    1: {
        name: 'גהה בלבד',
        description: 'תיקון איות תורני, גרשיים נכונים, פיסוק, ורווחים. שום שינוי במילים, משפטים, או סדר.',
        targetMin: 0.99, targetMax: 1.01,
        prompt: `קיבלת תמלול גולמי של שיעור תורני.\nמשימתך: **גהה טכנית בלבד** — אסור לערוך, רק לתקן שגיאות-איות ופיסוק.\n\n🛡️ **חוקי שימור מוחלטים (איסור מוחלט):**\n- אסור לשנות אפילו מילה אחת.\n- אסור להוסיף, להוריד, להעביר, לאחד, או לפצל משפטים.\n- אסור לשנות סדר משפטים, פסקאות, או רעיונות.\n- אסור להוסיף "תמצית:", "סיכום:", או כל הקדמה.\n\n✏️ **מה כן מותר לתקן (בלבד):**\n- שגיאות איות-תורני: רש"י, רמב"ם, ש"ך, ע"א, ע"ב, תוס', גמ'.\n- גרשיים אמיתיים (") במקום אפוסטרוף (').\n- פיסוק שחסר: נקודה בסוף משפט, פסיק בין פסוקיות.\n- רווחים מיותרים או חסרים.\n\n📏 **שמירת אורך:** הפלט חייב להיות 99%-101% ממספר המילים בגולמי. אם הפלט קצר מ-99% — נכשלת.`
    },
    2: {
        name: 'מינימלי',
        description: 'גהה + תיקוני שגיאות תחביר קלות. שמירה מלאה על תוכן ועל סגנון הדובר.',
        targetMin: 0.97, targetMax: 1.03,
        prompt: `קיבלת תמלול גולמי של שיעור תורני.\nמשימתך: **עריכה מינימלית** — תיקוני איות, פיסוק, וגרשיים תוך שמירה מדוקדקת על כל מילה ומשפט.\n\n🛡️ **חוקי שימור (קריטי):**\n- אסור לקצר, לסכם, להשמיט, או "לאחד" משפטים.\n- אסור לדלג על "כפילויות" — חזרה של הדובר נשארת.\n- אסור לשנות ניסוח — "כאילו", "כן", "אהמ" נשארים אם הדובר אמר.\n- אסור להוסיף תוכן שאינו בגולמי (כולל "תמצית:" וכותרות).\n\n✏️ **מה מותר לתקן:**\n- כתיב תורני וגרשיים.\n- פיסוק קל לבהירות.\n- שגיאות תחביר בודדות (למשל הסכמה במין).\n- חלוקה לפסקאות לפי גבולות-נושא טבעיים.\n\n📏 **שמירת אורך:** 97%-103% מהגולמי.`
    },
    3: {
        name: 'סטנדרטי',
        description: 'עריכה רגילה — תיקוני שפה ותחביר, סינון מילות-מילוי, חלוקה לפסקאות. שמור על כל הרעיונות.',
        targetMin: 0.92, targetMax: 1.00,
        prompt: `קיבלת תמלול גולמי של שיעור תורני.\nמשימתך: **עריכה סטנדרטית** — שיפור שפה תוך שמירה על כל הרעיונות, הציטוטים, ומראי-המקומות.\n\n🛡️ **חוקי שימור:**\n- אסור להשמיט: רעיון, פלוגתא, מראה-מקום, ציטוט, או נקודה הלכתית.\n- אסור לקצר תוכן ענייני — רק מלות-מילוי ("אהמ", "יעני", הססות).\n- אסור לשנות משמעות או פירוש.\n\n✏️ **מה מותר:**\n- תיקוני איות, פיסוק, וגרשיים (כמו במצב המינימלי).\n- שיפור זרימה ברמת המשפט — תיקון תחביר משובש, השלמת קיצורים מובלעים.\n- סינון מלות-מילוי לא-משמעותיות: "אהמ", "יעני", "כאילו" כשאינן משמעותיות.\n- חלוקה לפסקאות לפי נושאים.\n\n📏 **שמירת אורך:** 92%-100% מהגולמי. ירידה מתחת ל-92% = הסרת תוכן ענייני, אסור.`
    },
    4: {
        name: 'מעובד',
        description: 'עריכה מקצועית — ניסוח-מחדש קל לבהירות, איחוד חזרות, שמירה על כל ההלכה והפלוגתות.',
        targetMin: 0.80, targetMax: 0.95,
        prompt: `קיבלת תמלול גולמי של שיעור תורני.\nמשימתך: **עריכה מקצועית-מעובדת** — ניסוח-מחדש לבהירות, תוך שמירה מלאה על תוכן השיעור.\n\n🛡️ **חוקי שימור (חזקים גם כאן):**\n- אסור להשמיט: רעיון, פלוגתא, מראה-מקום, ציטוט, מסקנה הלכתית.\n- אסור לשנות פסיקת-הלכה, פירוש הלכתי, או דעה של חכם.\n- אם הדובר חזר על רעיון פעמיים בניסוחים שונים — אחד מהם נשמר במלואו, ה"שכפול" של אותו רעיון יכול להיות מאוחד.\n\n✏️ **מה מותר:**\n- כל מה שמותר במצב סטנדרטי.\n- ניסוח-מחדש קל של משפטים מורכבים לבהירות (בלי שינוי משמעות).\n- איחוד שני משפטים שאומרים בדיוק את אותו דבר.\n- שיפור מעברים בין פסקאות.\n\n📏 **שמירת אורך:** 80%-95% מהגולמי.`
    },
    5: {
        name: 'סגנוני',
        description: 'עריכה ספרותית — שכתוב לבהירות מקסימלית, סידור-מחדש לוגי. שמור על כל הציטוטים והמסקנות.',
        targetMin: 0.60, targetMax: 0.90,
        prompt: `קיבלת תמלול גולמי של שיעור תורני.\nמשימתך: **עריכה ספרותית-סגנונית** — שכתוב לבהירות מקסימלית תוך שמירה על תוכן.\n\n🛡️ **חוקי שימור מוחלטים (גם ברמה זו!):**\n- כל ציטוט, פסוק, ומאמר חז"ל — נשמר בלשון המקור.\n- כל מראה-מקום (מסכת + דף + ע"א/ע"ב) — נשמר.\n- כל פלוגתא בין ראשונים/אחרונים — לא תיעלם, אפילו אם מסובכת.\n- כל מסקנה הלכתית, פסק, או חידוש — נשמר.\n- כל שם חכם או ספר שהוזכר — נשמר.\n\n✏️ **מה מותר:**\n- שכתוב משפטים מורכבים לבהירות.\n- איחוד רעיונות חוזרים שנאמרו בכמה גרסאות.\n- סידור-מחדש לוגי של פסקאות.\n- העברה לעברית סטנדרטית של ניבים-דבורים (תוך שמירה על מונחים תורניים).\n\n📏 **שמירת אורך:** 60%-90% מהגולמי.`
    }
};

// קבועי-סגנון — כל אחד מוסיף הוראת-טון אחרי הפרומפט הראשי
const EDIT_STYLE_ADDONS = {
    yeshivish: '\n\n**טון:** ישיבתי-מסורתי קלאסי. השאר ארמית-תלמודית בלשון המקור. גרשיים מסורתיים. פנייה כללית.',
    halachic: '\n\n**טון:** הלכתי-פסיקתי. משפטים ברורים וקצרים. השתמש בפתיחות "נמצא ש...", "להלכה...", "מ"מ...". פלוגתות יוצגו בבירור.',
    iyun: '\n\n**טון:** עיוני-לימדני. שמור על מבנה הסוגיא. דייק בנקודות-חידוש. אל תפשט פלוגתות עיוניות.',
    drasha: '\n\n**טון:** דרשני-אגדי. שמור על הסיפור והרגש. ביטויים אגדיים בלשון המקור.',
    accessible: '\n\n**טון:** נגיש לציבור רחב — פחות ארמית. כשמופיע ביטוי ארמי, הוסף תרגום קצר בסוגריים, למשל: "ת"ש (תא שמע — בוא ולמד)". מונחים תורניים נשארים אבל מוסברים.',
    journalistic: '\n\n**טון:** עיתונאי-מודרני. משפטים קצרים וברורים. מעברי-נושא ברורים. שמור על הציטוטים המקוריים בלי לשנות.'
};

// *** v7.1: עריכה מינימלית — שמירה מלאה על כל מילה, ללא קיצוץ, ללא תקצור ***
const ADVANCED_EDITING_PROMPT_BASE = `קיבלת תמלול גולמי של שיעור תורני.
משימתך: **עריכה מינימלית בלבד** — תיקון איות, פיסוק וכתיב תורני, תוך שמירה מלאה ומדוקדקת על כל מילה ומשפט שנאמר.

**עיקרון מנחה (חזק מהכול): שמירה 1:1 על תוכן השיעור.**

🛡️ **חוקי שימור מוחלטים (קריטי!):**
1. **אסור לקצר, לסכם, להשמיט, או "לאחד" משפטים.** כל משפט שבמקור — חייב להופיע גם בפלט.
2. **אסור לדלג על "כפילויות".** אם הדובר חזר על אותו רעיון פעמיים — שניהם נשארים.
3. **אסור לשנות ניסוח.** "כאילו", "כן", "אהמ", "טוב", "אז" — אם הדובר אמר, נשאר. עריכה ≠ שכתוב.
4. **אסור להוסיף תוכן שאינו בגולמי.** לא תמצית, לא הקדמה, לא כותרות חדשות שאינן בטקסט.
5. **שמירה על מספר מילים:** הטקסט הערוך חייב להכיל לפחות **97%** ממספר המילים בגולמי. ירידה גדולה מ-3% נחשבת לכשל בעריכה.

✏️ **מה כן מותר לתקן (אלה ההיתרים היחידים):**
- **כתיב תורני:** רש"י, רמב"ם, ש"ך, ע"א, ע"ב, תוס', גמ', ת"ש — עם גרשיים אמיתיים.
- **פיסוק:** נקודה, פסיק, סימן שאלה, מקפים — כדי להבהיר קריאה. בלי לשנות מילים.
- **גרשיים** (") במקום אפוסטרוף (').
- **מעבר פסקה** בין נושאים ברורים — בלי לאחד תוכן ובלי להשמיט.
- **רווחים** מיותרים או חסרים.

📜 **סגנון:** שמור על העברית התורנית/הישיבתית/ההלכתית בדיוק כפי שהיא. ארמית-תלמודית — בלשון המקור. אם הדובר אמר "מאי קמ"ל" — לא להחליף ב"מה הוא משמיע".

🚫 **אסור מוחלט:** כל הוספה של "תמצית:", "סיכום:", "נקודות עיקריות:" וכו'. אסור! גם אם זה "ידידותי לקורא".`;

// פרומפט ישן עם מבנה מורחב (כותרות + תמצית) — בשימוש רק אם המשתמש מסמן "מבנה מורחב"
const ADVANCED_EDITING_PROMPT_STRUCTURED_ADDON = `

**תוספת — מבנה מורחב (לפי בקשת המשתמש):**
- כותרת ראשית (#) המתארת את נושא השיעור — בלי להמציא תוכן, רק כותרת תיאורית.
- כותרות משנה (**) לפני שינוי נושא משמעותי בשיעור — בלי להוסיף או להשמיט תוכן.
- *אסור* להוסיף "תמצית:" או סיכום — גם כאן.`;

const VERIFY_COMPLETENESS_PROMPT = `לפניך קובץ שמע ומתחתיו התמלול שבוצע.
בדוק האם התמלול מכסה את כל קובץ השמע. האם דולגו דקות שלמות? האם נחתך לפני הסוף?
ענה בעברית בלבד ובקצרה. אם הכל תקין: "התמלול מלא ותקין. לא נמצאו קטעים חסרים."
אם חסר טקסט, ציין באיזה חלק (התחלה/אמצע/סוף) ומה הנושא שדולג.`;

const VERIFY_FIDELITY_PROMPT = `תפקידך לבדוק נאמנות מלאה למקור בעריכה תורנית.
יוצג "טקסט מקורי גולמי" ולאחריו "טקסט ערוך".

**מה לבדוק (בסדר חשיבות):**
1. **קיצוץ תוכן:** האם הוסרו משפטים, פסקאות, או רעיונות שלמים שהיו במקור? *זו השגיאה החמורה ביותר.*
2. **תקצור / סיכום:** האם המודל "סיכם" במקום לערוך? האם הוסיף "תמצית:" / "סיכום:" / כותרת חדשה?
3. **שינוי משמעות:** האם פירוש או הלכה שונה מהמקור?
4. **השמטה של מראי מקומות:** האם פסוקים, מסכתות, או שמות חכמים נעלמו?

**פורמט תשובה:**
- אם תקין: "העריכה נאמנה למקור — לא זוהו חוסרים מהותיים."
- אם יש בעיה: ציין במפורש: "קוצץ: [מה חסר]" או "נוסף: [מה נוסף שאינו במקור]" — בנקודות.

ענה בעברית בלבד ובקצרה.`;

// =======================================================
// משתני מצב גלובליים
// =======================================================
let timerInterval;
let secondsElapsed = 0;
let currentSourcePart = null;
let currentSourceType = 'file';
let extractedAnchors = "";
let validationReport = "";
let audioDurationSeconds = 0;
let totalLoopsDetected = 0;
let currentSpeedProfile = 'balanced';
let currentCoverageMode = 'auto';   // single | auto | chunked
let chunkResults = [];              // [{ index, startSec, endSec, text, status, words, expectedWords }]

// v7.3: hover-to-play — מיפוי מילים-לזמנים בהקלטה
let audioBlobUrl = null;            // URL.createObjectURL של קובץ ההקלטה לנגן
let wordTimeMap = [];               // [{ word, startSec, endSec }] — תואם לסדר המילים בתמלול הסופי
let hoverPlayTimer = null;          // v8.4: לא בשימוש יותר (ריחוף בוטל) — נשמר לתאימות

// מטמון מודלים שלא תומכים ב-Penalty — מתעדכן אוטומטית בריצה
// כך מודלים תומכים מקבלים את ההגנה, ולא תומכים מדלגים בלי תקלה
const modelsWithoutPenaltySupport = new Set();

// מנגנון עצירת תהליך לפי בקשת המשתמש
let pipelineAborted = false;
let currentAbortController = null;

function stopPipeline() {
    pipelineAborted = true;
    if (currentAbortController) {
        try { currentAbortController.abort(); } catch (e) {}
    }
    const btn = document.getElementById('stopBtn');
    btn.disabled = true;
    btn.textContent = '⏳ עוצר...';
}

function resetAbortState() {
    pipelineAborted = false;
    const btn = document.getElementById('stopBtn');
    if (btn) { btn.disabled = false; btn.textContent = '⏹️ עצור'; }
    const editBtn = document.getElementById('stopEditBtn');
    if (editBtn) { editBtn.disabled = false; editBtn.textContent = '⏹️ עצור עריכה'; }
}

// =======================================================
// ניהול פרופילי מהירות — קובע אילו מודלים ושלבים פעילים
// =======================================================
const SPEED_PROFILES = {
    express: {
        description: 'מסלול Express: קריאת Flash אחת, ללא צ\'אנקים, ללא עוגנים, ללא ולידציה. שיעור של שעה מסתיים ב-30-90 שניות. מומלץ לקבצים עד 25 דקות, או כשרק רוצים להתרשם מהר.',
        mainModel: 'gemini-2.5-flash',
        fastModel: 'gemini-2.5-flash',
        skipAnchors: true,
        skipValidation: true,
        forceCoverageMode: 'single' // ללא צ'אנקים — קריאה אחת
    },
    turbo: {
        description: 'מצב טורבו: flash בכל השלבים, מדלג אוטומטית על ולידציה. מהירות גבוהה, ירידה קלה באיכות.',
        mainModel: 'gemini-2.5-flash',
        fastModel: 'gemini-2.5-flash',
        skipAnchors: false,
        skipValidation: true
    },
    balanced: {
        description: 'מצב מאוזן: flash לעוגנים וולידציה (מהיר), gemini-3.1-pro-preview לתמלול ועריכה — איכות מקסימלית עם flash תומך מהיר.',
        mainModel: 'gemini-3.1-pro-preview',
        fastModel: 'gemini-2.5-flash',
        skipAnchors: false,
        skipValidation: false
    },
    max: {
        description: 'מצב דיוק מקסימלי: gemini-3.1-pro-preview (החדש) בכל השלבים. איטי, איכות מקסימלית. אם נכשל ב-503 — בחר gemini-2.5-pro במקום.',
        mainModel: 'gemini-3.1-pro-preview',
        fastModel: 'gemini-3.1-pro-preview',
        skipAnchors: false,
        skipValidation: false
    }
};

// v9.1: תיקון - שימוש בפרמטר evt מפורש (event גלובלי לא אמין במצבים מסוימים)
function applySpeedProfile(profileName, evt) {
    const profile = SPEED_PROFILES[profileName];
    if (!profile) return;
    currentSpeedProfile = profileName;

    document.getElementById('geminiModel').value = profile.mainModel;
    document.getElementById('geminiFastModel').value = profile.fastModel;
    document.getElementById('skipAnchors').checked = profile.skipAnchors;
    document.getElementById('skipValidation').checked = profile.skipValidation;

    if (profile.forceCoverageMode) applyCoverageMode(profile.forceCoverageMode);

    document.querySelectorAll('.speed-pill').forEach(p => p.classList.remove('active'));
    const useEvt = evt || (typeof window !== 'undefined' && window.event) || null;
    if (useEvt && useEvt.currentTarget && useEvt.currentTarget.classList) useEvt.currentTarget.classList.add('active');
    else {
        // קריאה תכנותית — מצא את הכפתור הנכון
        document.querySelectorAll('.speed-pill').forEach(p => {
            if (p.getAttribute('onclick') && p.getAttribute('onclick').includes(`'${profileName}'`)) {
                p.classList.add('active');
            }
        });
    }
    document.getElementById('speedProfileDescription').innerText = profile.description;
    // עדכון אומדן עלות
    try { updateCostEstimate(); } catch (e) {}
}

// =======================================================
// ניהול מצב כיסוי — אוטומטי / צ'אנקים / קובץ שלם
// =======================================================
const COVERAGE_MODES = {
    single: 'מצב קובץ שלם: קריאה אחת מקצה לקצה. מהיר אך פגיע ל"דילוג אמצע" בקבצים ארוכים. מומלץ עד ~12 דקות.',
    auto:   'מצב אוטומטי: עד 15 דקות — קריאה אחת. מעל — צ\'אנקים אוטומטיים לפי הגדרת משך. הבחירה הבטוחה ברוב המקרים.',
    chunked:'מצב צ\'אנקים תמיד: ההקלטה מחולקת לקטעי-זמן קבועים, וכל קטע מתומלל עצמאית. ערובה ל-100% כיסוי בלי דילוגים. מומלץ לכל שיעור מעל 15 דק\'.'
};
function applyCoverageMode(mode) {
    if (!COVERAGE_MODES[mode]) return;
    currentCoverageMode = mode;
    document.querySelectorAll('#coverageModePills .lang-mode-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.mode === mode);
    });
    document.getElementById('coverageModeDescription').innerText = COVERAGE_MODES[mode];
}

/**
 * decideUseChunks — האם להפעיל מצב צ'אנקים בריצה הזו?
 * חוקים:
 * - mode='chunked' → תמיד צ'אנקים (אם יש משך-שמע מוכר).
 * - mode='single'  → לעולם לא.
 * - mode='auto'    → צ'אנקים אם משך > 15 דק'.
 * - מקור YouTube ללא משך — לא ניתן לצ'אנק (אין לנו דקות).
 */
function decideUseChunks() {
    if (currentSourceType === 'youtube') return false; // אין משך אמין → לא ניתן לחתוך לזמנים
    if (audioDurationSeconds <= 0) return false;
    if (currentCoverageMode === 'single') return false;
    if (currentCoverageMode === 'chunked') return true;
    // auto: מעל 15 דקות
    return audioDurationSeconds > 15 * 60;
}

/**
 * planChunks — בונה רשימת צ'אנקים [{startSec, endSec}] לפי הגדרות המשתמש
 */
function planChunks() {
    const dur = audioDurationSeconds;
    const chunkMinutes = parseInt(document.getElementById('chunkDurationMinutes').value, 10) || 10;
    const overlapSec = parseInt(document.getElementById('chunkOverlapSeconds').value, 10) || 0;
    const stepSec = chunkMinutes * 60;
    const chunks = [];
    let start = 0;
    while (start < dur) {
        const end = Math.min(dur, start + stepSec);
        chunks.push({ startSec: start, endSec: end });
        if (end >= dur) break;
        start = end - overlapSec;
        if (start < 0) start = 0;
        if (start >= dur) break;
    }
    return chunks;
}

function formatTimeMS(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * renderChunksTable — מציג את לוח הצ'אנקים (לפני התחלת התמלול)
 */
function renderChunksTable(chunks) {
    const container = document.getElementById('chunksContainer');
    container.innerHTML = '';
    chunks.forEach((c, i) => {
        const row = document.createElement('div');
        row.className = 'chunk-row pending';
        row.id = `chunkRow_${i}`;
        row.innerHTML = `
            <div><strong>צ'אנק ${i + 1}</strong></div>
            <div class="text-gray-700 text-xs">${formatTimeMS(c.startSec)} → ${formatTimeMS(c.endSec)} · משך ${formatTimeMS(c.endSec - c.startSec)}</div>
            <div><span class="chunk-status-pill pill-pending" id="chunkPill_${i}">ממתין</span></div>
            <div class="text-xs text-gray-500" id="chunkWords_${i}">— מילים</div>
        `;
        container.appendChild(row);
    });
    document.getElementById('chunksTotalLabel').textContent = chunks.length;
    document.getElementById('chunksCompletedLabel').textContent = '0';
    const totalDur = chunks.reduce((s, c) => s + (c.endSec - c.startSec), 0);
    document.getElementById('chunksDurationLabel').textContent = `סה"כ ${formatTimeMS(totalDur)} (לפני ניכוי חפיפות)`;
    document.getElementById('chunksSection').classList.remove('hidden');
}

function setChunkStatus(i, status, text) {
    const row = document.getElementById(`chunkRow_${i}`);
    const pill = document.getElementById(`chunkPill_${i}`);
    if (!row || !pill) return;
    row.classList.remove('pending', 'active', 'done', 'warn', 'bad');
    pill.classList.remove('pill-pending', 'pill-active', 'pill-done', 'pill-warn', 'pill-bad');
    const map = { pending: 'pending', active: 'active', done: 'done', warn: 'warn', bad: 'bad' };
    row.classList.add(map[status] || 'pending');
    pill.classList.add('pill-' + (map[status] || 'pending'));
    const labels = { pending: 'ממתין', active: '⏳ פעיל', done: '✅ הושלם', warn: '⚠️ חלקי', bad: '❌ כשל' };
    pill.textContent = labels[status] || 'ממתין';
    if (text) {
        const wordsEl = document.getElementById(`chunkWords_${i}`);
        if (wordsEl) wordsEl.textContent = text;
    }
}

function setChunkWords(i, actualWords, expectedWords) {
    const wordsEl = document.getElementById(`chunkWords_${i}`);
    if (!wordsEl) return;
    const ratio = expectedWords > 0 ? Math.round((actualWords / expectedWords) * 100) : 0;
    wordsEl.textContent = `${actualWords}/${expectedWords} (${ratio}%)`;
}

// =======================================================
// חיתוך אודיו אמיתי בצד הלקוח — עיקר השדרוג של v6
// לכל צ'אנק מקודד WAV עצמאי, מועלה בנפרד ל-Gemini.
// אי-אפשר לחרוג מטווח כי אין יותר אודיו לחרוג אליו.
// =======================================================
let cachedDecodedBuffer = null;
let cachedDecodedFor = null; // שם הקובץ שהבאפר נוצר עבורו

async function decodeAudioFile(file) {
    if (cachedDecodedBuffer && cachedDecodedFor === file.name) return cachedDecodedBuffer;
    if (!file) throw new Error('לא נבחר קובץ אודיו לפענוח.');
    if (file.size === 0) throw new Error('קובץ האודיו ריק.');
    let arrayBuffer;
    try {
        arrayBuffer = await file.arrayBuffer();
    } catch (e) {
        throw new Error('שגיאה בקריאת הקובץ מהדיסק: ' + e.message);
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) throw new Error('הדפדפן לא תומך ב-AudioContext. נסה דפדפן עדכני (Chrome/Edge/Firefox).');
    const ctx = new Ctor();
    let buf;
    try {
        buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (e) {
        try { ctx.close(); } catch (closeErr) {}
        const fileExt = (file.name || '').split('.').pop().toLowerCase();
        throw new Error(`לא ניתן לפענח את קובץ האודיו (${fileExt || 'לא ידוע'}). הקובץ עלול להיות פגום או בפורמט שהדפדפן לא תומך בו. נסה להמיר ל-MP3/WAV. (פרטים: ${e.message || 'אין'})`);
    }
    try { ctx.close(); } catch (e) {}
    if (!buf || buf.length === 0) {
        throw new Error('פענוח האודיו הסתיים אך החזיר באפר ריק.');
    }
    cachedDecodedBuffer = buf;
    cachedDecodedFor = file.name;
    return buf;
}

/**
 * sliceAudioToMono16kFloat32 — חותך טווח, ממיר למונו, ומדגם-מחדש ל-16kHz.
 * מחזיר מערך Float32 מוכן לקידוד WAV. גודל סופי: ~32KB לשנייה (במקום ~176KB).
 * צ'אנק של 10 דק' יוצא ~19MB במקום ~106MB — בטווח המותר ל-Gemini Files API.
 */
function sliceAudioToMono16kFloat32(audioBuffer, startSec, endSec) {
    const srcRate = audioBuffer.sampleRate;
    const targetRate = 16000;
    const numChannels = audioBuffer.numberOfChannels;

    // קואורדינטות במקור
    const srcStart = Math.max(0, Math.floor(startSec * srcRate));
    const srcEnd = Math.min(audioBuffer.length, Math.floor(endSec * srcRate));
    const srcLen = Math.max(1, srcEnd - srcStart);

    // אורך פלט ביעד (לפי יחס דגימות)
    const dstLen = Math.max(1, Math.round(srcLen * targetRate / srcRate));
    const dst = new Float32Array(dstLen);

    // שלב 1: התמזגות ל-Mono (ממוצע ערוצים) + Resample ע"י קואורדינטות שכנות (linear)
    const ratio = srcLen / dstLen;
    const channelData = [];
    for (let ch = 0; ch < numChannels; ch++) channelData.push(audioBuffer.getChannelData(ch));

    for (let i = 0; i < dstLen; i++) {
        const srcPos = srcStart + i * ratio;
        const idx0 = Math.floor(srcPos);
        const idx1 = Math.min(srcEnd - 1, idx0 + 1);
        const t = srcPos - idx0;
        let monoSample = 0;
        for (let ch = 0; ch < numChannels; ch++) {
            const a = channelData[ch][idx0] || 0;
            const b = channelData[ch][idx1] || 0;
            monoSample += (a * (1 - t) + b * t);
        }
        dst[i] = monoSample / numChannels;
    }

    // v7.7: עיבוד אודיו אופציונלי — high-pass + normalize
    if (document.getElementById('optAudioPreprocess')?.checked) {
        const filtered = applyHighPassFilter(dst, targetRate, 80);
        const normalized = normalizeRMS(filtered, 0.15); // ~-16dB RMS target
        return { samples: normalized, sampleRate: targetRate };
    }
    return { samples: dst, sampleRate: targetRate };
}

/**
 * monoFloat32ToWavBlob — מקודד מערך מונו Float32 ל-WAV (16-bit PCM).
 * מקבל { samples: Float32Array, sampleRate: number }.
 */
function monoFloat32ToWavBlob(input) {
    const samples = input.samples;
    const sampleRate = input.sampleRate;
    const numChannels = 1;
    const dataLen = samples.length * 2; // 16-bit per sample
    const wavBuffer = new ArrayBuffer(44 + dataLen);
    const view = new DataView(wavBuffer);
    const writeStr = (offset, str) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };
    // RIFF header
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeStr(8, 'WAVE');
    // fmt chunk
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);                          // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    view.setUint16(32, numChannels * 2, true);              // block align
    view.setUint16(34, 16, true);                           // bits per sample
    // data chunk
    writeStr(36, 'data');
    view.setUint32(40, dataLen, true);
    // המרת samples ל-int16 little-endian
    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
        let s = Math.max(-1, Math.min(1, samples[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(offset, s, true);
        offset += 2;
    }
    return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * uploadAudioBlobToGemini — מעלה Blob של WAV לקובץ Gemini ומחזיר fileData
 * זהה ל-uploadFileToGemini אבל מקבל Blob במקום File.
 */
async function uploadAudioBlobToGemini(apiKey, blob, name) {
    if (!apiKey || apiKey.length < 20) {
        throw new Error("מפתח Gemini API חסר או קצר מדי.");
    }
    if (!blob || blob.size === 0) {
        throw new Error("חלק האודיו ריק — לא ניתן להעלות.");
    }
    const uploadUrl = buildGeminiUrl('upload/v1beta/files', apiKey);
    const safeFileName = (name || 'chunk') + '_' + Date.now() + '.wav';
    let response;
    try {
        response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'raw', 'X-Goog-Upload-Command': 'upload',
                'X-Goog-Upload-File-Name': safeFileName,
                'X-Goog-Upload-Header-Content-Length': blob.size.toString(),
                'X-Goog-Upload-Header-Content-Type': 'audio/wav',
                'Content-Type': 'audio/wav'
            },
            body: blob
        });
    } catch (networkErr) {
        throw new Error("כשל רשת בעת העלאת חלק האודיו: " + networkErr.message);
    }
    if (!response.ok) {
        let errMsg = "";
        let rawText = "";
        try { rawText = await response.text(); } catch (e) {}
        if (rawText) {
            try {
                const errData = JSON.parse(rawText);
                errMsg = errData.error?.message || errData.error?.status || "";
            } catch (e) {
                errMsg = rawText.substring(0, 300);
            }
        }
        const httpCode = response.status;
        let hint = "";
        if (httpCode === 401 || httpCode === 403) hint = " (מפתח API לא מורשה)";
        else if (httpCode === 429) hint = " (חרגת ממכסה)";
        else if (httpCode >= 500) hint = " (שגיאת שרת Google)";
        throw new Error(`שגיאה בהעלאת חלק האודיו (HTTP ${httpCode})${hint}: ${errMsg || 'אין פירוט'}`);
    }
    const data = await response.json();
    if (!data || !data.file) {
        throw new Error("התגובה מ-Gemini לא הכילה מידע על חלק האודיו שהועלה.");
    }
    return data.file;
}

// =======================================================
// הערכת טוקנים ועלות
// Gemini audio: ~32 tokens/second.
// Gemini text input/output: ~1.4 tokens per word approx (in Hebrew).
// =======================================================
const usageTracker = {
    promptTokens: 0,
    candidatesTokens: 0,
    totalTokens: 0,
    byModel: {}, // { modelName: { in: N, out: N } }
    reset() { this.promptTokens = 0; this.candidatesTokens = 0; this.totalTokens = 0; this.byModel = {}; },
    add(model, promptT, outT) {
        this.promptTokens += promptT || 0;
        this.candidatesTokens += outT || 0;
        this.totalTokens += (promptT || 0) + (outT || 0);
        if (!this.byModel[model]) this.byModel[model] = { in: 0, out: 0 };
        this.byModel[model].in += promptT || 0;
        this.byModel[model].out += outT || 0;
    }
};

function isProModel(model) {
    return /pro/i.test(model);
}

function priceForModel(model) {
    const pin  = parseFloat(document.getElementById('priceProIn')?.value || '1.25');
    const pout = parseFloat(document.getElementById('priceProOut')?.value || '10');
    const fin  = parseFloat(document.getElementById('priceFlashIn')?.value || '0.30');
    const fout = parseFloat(document.getElementById('priceFlashOut')?.value || '2.50');
    return isProModel(model) ? { in: pin, out: pout } : { in: fin, out: fout };
}

function calcCost(model, promptT, outT) {
    const p = priceForModel(model);
    return (promptT * p.in + outT * p.out) / 1_000_000;
}

function formatUSD(n) { return '$' + n.toFixed(4); }

/**
 * updateCostEstimate — מציג בלוח את ההערכה לפני התחלה.
 * חישוב:
 *   - input audio: 32 tokens/sec × duration × num_calls
 *   - output text: ~6500 word lesson × 1.5 tok/word = ~10000 tokens
 *   - num_calls = 1 (single) או N (chunks)
 */
// v9: עדכון שורת העלות הבולטת מעל כפתור ההתחלה
function updateCostBanner(state, info) {
    const banner = document.getElementById('costBanner');
    const text = document.getElementById('costBannerText');
    const total = document.getElementById('costBannerTotal');
    if (!banner || !text || !total) return;
    if (state === 'ready') {
        banner.classList.remove('hidden');
        text.innerHTML = info.text;
        total.textContent = info.total;
    } else {
        // אין משך-זמן עדיין — מציגים רמז עדין
        banner.classList.remove('hidden');
        text.innerHTML = 'בחר קובץ שמע כדי לראות הערכת עלות לפני ההרצה.';
        total.textContent = '—';
    }
}

function updateCostEstimate() {
    const block = document.getElementById('costEstimateBlock');
    if (!block) return;
    const duration = audioDurationSeconds;
    if (!duration || duration <= 0) {
        block.innerHTML = '<p class="text-gray-700">בחר קובץ עם משך-זמן כדי לראות הערכה.</p>';
        updateCostBanner('empty');
        return;
    }
    const useChunks = decideUseChunks();
    const chunkMin = parseInt(document.getElementById('chunkDurationMinutes')?.value || '10', 10);
    const overlap = parseInt(document.getElementById('chunkOverlapSeconds')?.value || '20', 10);

    const stepSec = chunkMin * 60;
    // v9.1: תיקון - שימוש באלגוריתם של planChunks למניעת אי-עקביות בחישוב עלות
    let numChunks;
    if (useChunks) {
        let count = 0;
        let start = 0;
        while (start < duration) {
            const end = Math.min(duration, start + stepSec);
            count++;
            if (end >= duration) break;
            start = end - overlap;
            if (start < 0) start = 0;
            if (start >= duration) break;
        }
        numChunks = count;
    } else {
        numChunks = 1;
    }

    const audioTokensPerCall = useChunks
        ? Math.round((stepSec + overlap) * 32) // לכל צ'אנק
        : Math.round(duration * 32);
    const totalAudioTokens = audioTokensPerCall * numChunks;

    // עוגנים (אם לא דילוג)
    const skipAnchors = document.getElementById('skipAnchors')?.checked;
    const skipValidation = document.getElementById('skipValidation')?.checked;
    const anchorsTokens = skipAnchors ? 0 : Math.round(duration * 32) + 1500;
    const validationTokens = skipValidation ? 0 : Math.round(duration * 32) + 2500;
    const editingTokens = 12000; // העריכה היא קלט+פלט טקסט בלבד

    const expectedWords = Math.round((duration / 60) * 130);
    const outputTokensPerCall = Math.round((useChunks ? expectedWords / numChunks : expectedWords) * 1.5);
    const totalOutputTokens = outputTokensPerCall * numChunks;

    const mainModel = document.getElementById('geminiModel').value;
    const fastModel = document.getElementById('geminiFastModel').value;

    // הערכת עלות בכל המודלים הרלוונטיים
    const transcriptionCost = calcCost(mainModel, totalAudioTokens, totalOutputTokens);
    const anchorsCost = anchorsTokens > 0 ? calcCost(fastModel, anchorsTokens, 1500) : 0;
    const validationCost = validationTokens > 0 ? calcCost(fastModel, validationTokens, 2500) : 0;
    const editingCost = calcCost(mainModel, editingTokens, Math.round(expectedWords * 1.5));

    const totalCost = transcriptionCost + anchorsCost + validationCost + editingCost;

    block.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <div class="stat-card"><div class="stat-value">${formatDuration(duration)}</div><div class="stat-label">משך השמע</div></div>
            <div class="stat-card"><div class="stat-value">${useChunks ? numChunks + ' צ\'אנקים' : 'קריאה אחת'}</div><div class="stat-label">חלוקה</div></div>
            <div class="stat-card"><div class="stat-value">${(totalAudioTokens/1000).toFixed(0)}K</div><div class="stat-label">צפי טוקני אודיו (input)</div></div>
            <div class="stat-card"><div class="stat-value">${formatUSD(totalCost)}</div><div class="stat-label">צפי עלות כוללת</div></div>
        </div>
        <details class="mt-2 text-xs text-gray-700">
            <summary class="cursor-pointer text-cyan-700 font-semibold">פירוט לפי שלב</summary>
            <ul class="mt-1 list-disc pr-5 space-y-1">
                ${!skipAnchors ? `<li>עוגנים (${fastModel}): ~${anchorsTokens.toLocaleString()} input + 1.5K output → ${formatUSD(anchorsCost)}</li>` : ''}
                <li>תמלול (${mainModel}): ~${totalAudioTokens.toLocaleString()} input + ~${totalOutputTokens.toLocaleString()} output → ${formatUSD(transcriptionCost)}</li>
                ${!skipValidation ? `<li>ולידציה (${fastModel}): ~${validationTokens.toLocaleString()} input + 2.5K output → ${formatUSD(validationCost)}</li>` : ''}
                <li>עריכה (${mainModel}): ~${editingTokens.toLocaleString()} input + ~${(expectedWords*1.5).toLocaleString()} output → ${formatUSD(editingCost)}</li>
            </ul>
            <p class="mt-1 text-gray-500">ההערכה משוערת — בפועל יהיה +/- 30%. ההערכה בנויה על ${useChunks ? numChunks + ' צ\'אנקים של ' + chunkMin + ' דק\'' : 'קריאה אחת'}.</p>
        </details>
    `;

    // v9: עדכון השורה הבולטת מעל כפתור ההתחלה
    updateCostBanner('ready', {
        text: `משך: <strong>${formatDuration(duration)}</strong> · ` +
              `${useChunks ? numChunks + " צ'אנקים" : 'קריאה אחת'} · ` +
              `מודל: <strong>${mainModel}</strong> · הערכה משוערת (±30%)`,
        total: formatUSD(totalCost)
    });
}

/**
 * showActualUsage — מציג שימוש בפועל בסוף הריצה
 */
function showActualUsage() {
    const block = document.getElementById('costEstimateBlock');
    if (!block) return;
    const u = usageTracker;
    if (u.totalTokens === 0) return;

    let totalCost = 0;
    const rows = Object.entries(u.byModel).map(([model, t]) => {
        const cost = calcCost(model, t.in, t.out);
        totalCost += cost;
        return `<tr><td class="pr-2">${model}</td><td class="text-left pr-2">${t.in.toLocaleString()}</td><td class="text-left pr-2">${t.out.toLocaleString()}</td><td class="text-left">${formatUSD(cost)}</td></tr>`;
    }).join('');

    block.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
            <div class="stat-card quality-good"><div class="stat-value">${(u.promptTokens/1000).toFixed(1)}K</div><div class="stat-label">input בפועל</div></div>
            <div class="stat-card quality-good"><div class="stat-value">${(u.candidatesTokens/1000).toFixed(1)}K</div><div class="stat-label">output בפועל</div></div>
            <div class="stat-card quality-good"><div class="stat-value">${(u.totalTokens/1000).toFixed(1)}K</div><div class="stat-label">סה"כ טוקנים</div></div>
            <div class="stat-card quality-good"><div class="stat-value">${formatUSD(totalCost)}</div><div class="stat-label">עלות בפועל</div></div>
        </div>
        <details class="mt-2 text-xs text-gray-700" open>
            <summary class="cursor-pointer text-cyan-700 font-semibold">פירוט לפי מודל</summary>
            <table class="mt-1 w-full text-xs">
                <thead><tr class="border-b"><th class="text-right pr-2">מודל</th><th class="text-left pr-2">input</th><th class="text-left pr-2">output</th><th class="text-left">עלות</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </details>
    `;
}

// =======================================================
// מנגנון אנטי-לולאה — זיהוי וניקוי לולאות דגנרטיביות
// =======================================================
function detectRepetitionLoop(text) {
    if (!text || text.length < 200) return false;

    // בדיקה 1: דפוס תווים קצר (1-8 תווים) שחוזר הרבה פעמים ברצף
    const tail400 = text.slice(-400);
    for (let charLen = 1; charLen <= 8; charLen++) {
        const pattern = tail400.slice(-charLen);
        if (pattern.trim().length === 0) continue;
        let count = 0;
        let pos = tail400.length - charLen;
        while (pos >= 0 && tail400.slice(pos, pos + charLen) === pattern) {
            count++;
            pos -= charLen;
        }
        const threshold = charLen <= 2 ? 25 : (charLen <= 4 ? 15 : 8);
        if (count >= threshold) return true;
    }

    // בדיקה 2: קריסת אוצר מילים — 30 מילים אחרונות עם פחות מ-5 ייחודיות
    const tail400Words = tail400.split(/\s+/).filter(w => w.length > 0);
    if (tail400Words.length >= 30) {
        const last30 = tail400Words.slice(-30);
        if (new Set(last30).size <= 4) return true;
    }

    // בדיקה 3 (חדש - קריטי): סגמנט-זנב שמופיע 3+ פעמים בטקסט האחרון
    // תופס לולאות של ביטויים ארוכים (60-300 תווים) בלי תלות באורך הלולאה
    const tail3000 = text.slice(-3000);
    for (const unitLen of [60, 100, 150, 200, 300]) {
        if (tail3000.length < unitLen * 3) continue;
        const lastUnit = tail3000.slice(-unitLen);
        if (lastUnit.trim().length < unitLen * 0.5) continue;
        let occurrences = 0;
        let searchStart = 0;
        while (searchStart <= tail3000.length - unitLen) {
            const idx = tail3000.indexOf(lastUnit, searchStart);
            if (idx === -1) break;
            occurrences++;
            // v9.1: תיקון ביצועים O(n²) -> O(n): קידום באורך המלא במקום תו אחד
            searchStart = idx + unitLen;
            if (occurrences >= 3) return true;
        }
    }

    // בדיקה 4 (חדש): חזרת n-gram ברמת מילים (5-50 מילים אחרונות)
    // משלים את בדיקה 3 כשהלולאה אינה מיושרת לתווים
    const allWords = text.split(/\s+/).filter(w => w.length > 0);
    if (allWords.length >= 30) {
        const recentWords = allWords.slice(-300);
        const recentText = recentWords.join(' ');
        for (const n of [5, 10, 20, 30, 50]) {
            if (recentWords.length < n * 3) continue;
            const ngram = recentWords.slice(-n).join(' ');
            if (ngram.length < 30) continue;
            let count = 0;
            let pos = 0;
            while (pos <= recentText.length - ngram.length) {
                const idx = recentText.indexOf(ngram, pos);
                if (idx === -1) break;
                count++;
                // v9.1: תיקון ביצועים O(n²) -> O(n)
                pos = idx + ngram.length;
                if (count >= 3) return true;
            }
        }
    }

    return false;
}

function trimRepetitionJunk(text) {
    if (text.length < 200) return text;
    const sentenceEnds = [];
    const re = /[.!?]\s|\n\n|\n/g;
    let match;
    while ((match = re.exec(text)) !== null) sentenceEnds.push(match.index + 1);
    for (let i = sentenceEnds.length - 1; i >= 0; i--) {
        const cutPoint = sentenceEnds[i];
        const before = text.slice(Math.max(0, cutPoint - 200), cutPoint);
        const w = before.split(/\s+/).filter(x => x.length > 0);
        if (w.length >= 10) {
            const ratio = new Set(w).size / w.length;
            if (ratio > 0.5) return text.slice(0, cutPoint);
        }
    }
    return text.slice(0, Math.floor(text.length * 0.75));
}

function showLoopAlert(message) {
    totalLoopsDetected++;
    updateStat('statLoopsVal', totalLoopsDetected);
    const container = document.getElementById('loopAlertContainer');
    const alert = document.createElement('div');
    alert.className = 'alert-loop';
    alert.innerHTML = `🛑 <strong>זוהתה לולאת חזרה אוטומטית:</strong> ${message} המערכת חתכה את הקטע הפגום ומחדשת מהנקודה האחרונה התקינה.`;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 12000);
}

function showHallucinationAlert(message) {
    const container = document.getElementById('loopAlertContainer');
    const alert = document.createElement('div');
    alert.className = 'alert-loop';
    alert.style.background = '#fee2e2';
    alert.style.borderColor = '#dc2626';
    alert.innerHTML = `🚨 <strong>זוהתה הזיה (Hallucination)!</strong> ${message}`;
    container.appendChild(alert);
}

/**
 * detectHallucination — מזהה כשהמודל ייצר תוכן שאינו קשור לשמע התורני.
 * הסימנים: שיעור גבוה של תווים לטיניים (אנגלית), או מילות מפתח של תכנים זרים.
 * מחזיר הודעה אם זוהתה הזיה, אחרת null.
 */
function detectHallucination(text) {
    if (!text || text.length < 100) return null;

    // ספירת יחס תווים עברית/אנגלית
    const hebrew = (text.match(/[֐-׿]/g) || []).length;
    const latin = (text.match(/[a-zA-Z]/g) || []).length;
    const total = hebrew + latin;
    if (total < 50) return null;

    const latinRatio = latin / total;
    if (latinRatio > 0.25) {
        return `המודל מייצר ${Math.round(latinRatio*100)}% תווים לטיניים (אנגלית) במקום עברית. ככל הנראה השמע אינו ברור והמודל ממציא תוכן זר.`;
    }

    // זיהוי מילות מפתח של הזיות נפוצות (פרסומות רכבים, טכנולוגיה, ספורט וכו')
    const hallucKeywords = /toyota|tacoma|infotainment|touchscreen|carplay|android auto|trim|cabin|dashboard|smartphone|iphone|samsung|apple watch|netflix|spotify|amazon|wikipedia|here are some|the new \w+ is/i;
    const matches = text.match(hallucKeywords);
    if (matches && matches.length > 0) {
        return `זוהה תוכן זר ולא רלוונטי במהלך התמלול (זוהתה: "${matches[0]}"). השמע ככל הנראה לא נטען נכון או שאינו ברור.`;
    }

    return null;
}

// =======================================================
// עזרי ממשק
// =======================================================
function startTimer(elementId) {
    secondsElapsed = 0;
    const display = document.getElementById(elementId);
    if (display) display.textContent = "00:00";
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        secondsElapsed++;
        const m = String(Math.floor(secondsElapsed / 60)).padStart(2, '0');
        const s = String(secondsElapsed % 60).padStart(2, '0');
        if (display) display.textContent = `${m}:${s}`;
    }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }

// =======================================================
// התראות שולחן עבודה — מודרני, עם משוב למשתמש
// =======================================================
async function requestNotificationPermission() {
    if (!("Notification" in window)) return 'unsupported';
    if (Notification.permission === 'granted' || Notification.permission === 'denied') {
        return Notification.permission;
    }
    try {
        const result = await Notification.requestPermission();
        return result;
    } catch (e) {
        // דפדפנים ישנים עם API קולבק — ננסה גם זה
        return await new Promise(resolve => {
            try { Notification.requestPermission(p => resolve(p)); } catch (e) { resolve('default'); }
        });
    }
}

function sendDesktopNotification(title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
        const n = new Notification(title, {
            body: body,
            icon: "https://cdn-icons-png.flaticon.com/512/1183/1183672.png",
            silent: false,
            requireInteraction: false
        });
        // התמקד בכרטיסייה כשלוחצים על ההתראה
        n.onclick = () => { try { window.focus(); n.close(); } catch (e) {} };
        // סגירה אוטומטית אחרי 8 שניות
        setTimeout(() => { try { n.close(); } catch (e) {} }, 8000);
    } catch (e) {
        console.warn('[v7] Notification error:', e);
    }
}

function updateNotificationButtonUI() {
    const btn = document.getElementById('notifPermBtn');
    const status = document.getElementById('notifStatus');
    if (!btn || !status) return;
    if (!("Notification" in window)) {
        btn.disabled = true;
        btn.textContent = '🔕 הדפדפן לא תומך';
        status.textContent = '';
        return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') {
        btn.disabled = true;
        btn.textContent = '✅ התראות מופעלות';
        btn.classList.add('bg-green-100', 'text-green-800');
        btn.classList.remove('bg-blue-100', 'text-blue-800', 'bg-red-100', 'text-red-800');
        status.textContent = 'תקבל התראת שולחן-עבודה בכל סיום שלב.';
    } else if (perm === 'denied') {
        btn.disabled = true;
        btn.textContent = '🚫 חסום בדפדפן';
        btn.classList.add('bg-red-100', 'text-red-800');
        btn.classList.remove('bg-blue-100', 'text-blue-800', 'bg-green-100', 'text-green-800');
        status.innerHTML = 'לחץ על סמל הנעילה ליד הכתובת בדפדפן ושנה הרשאת "התראות" ל"אפשר".';
    } else {
        btn.disabled = false;
        btn.textContent = '🔔 הפעל התראות שולחן-עבודה';
        btn.classList.add('bg-blue-100', 'text-blue-800');
        btn.classList.remove('bg-green-100', 'text-green-800', 'bg-red-100', 'text-red-800');
        status.textContent = 'הקלקה תפתח דיאלוג של הדפדפן לאישור.';
    }
}

async function clickEnableNotifications() {
    const result = await requestNotificationPermission();
    updateNotificationButtonUI();
    if (result === 'granted') {
        sendDesktopNotification('המערכת מוכנה', 'מעכשיו תקבל התראה בכל סיום שלב.');
    }
}

// =======================================================
// v9: מצב פשוט/מתקדם הוסר — הוחלף במבנה 4 הטאבים.
// הפונקציות נשמרות כ-no-op כדי לא לשבור קריאות קיימות.
// =======================================================
function toggleCompactMode() { /* v9: בוטל — ראה מבנה הטאבים */ }
function updateToggleModeButton() { /* v9: בוטל */ }
function initCompactMode() {
    // v9: ניקוי דגל ישן אם נשאר ב-localStorage מגרסה קודמת
    try { localStorage.removeItem('torahApp_compactMode'); } catch (e) {}
    document.body.classList.remove('compact');
}

function updateTextWithSmartScroll(elementId, text) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 50;
    el.value = text;
    if (isAtBottom) el.scrollTop = el.scrollHeight;
}

function setInputsDisabledState(disabled) {
    // הערה: stopBtn ו-stopEditBtn מכוונים לא להיות מושבתים, כדי לאפשר עצירה תמיד
    const ids = ['geminiApiKey', 'geminiModel', 'geminiFastModel', 'claudeApiKey', 'claudeModel',
        'audioFile', 'youtubeUrl', 'startPipelineBtn', 'customTranscriptionPrompt',
        'verifyCompleteBtn', 'forceContinueBtn', 'verifyFidelityBtn',
        'editBtn', 'customEditPrompt', 'skipAnchors', 'skipValidation'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.disabled = disabled; });
    document.querySelectorAll('input[name="textProvider"]').forEach(el => el.disabled = disabled);
}

function getTextProvider() { return document.querySelector('input[name="textProvider"]:checked').value; }
function showError(msg) {
    const errEl = document.getElementById('errorMsg');
    // v8.1: המרת URLs ללינקים אקטיביים
    let html = msg.replace(/\n/g, '<br>');
    html = html.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" class="underline font-bold">$1</a>');
    errEl.innerHTML = html;
    errEl.classList.remove('hidden');
}
function hideError() { document.getElementById('errorMsg').classList.add('hidden'); }

function activateStageCard(sectionId) {
    document.querySelectorAll('.stage-card').forEach(c => c.classList.remove('active'));
    const el = document.getElementById(sectionId);
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('active');
        // v8.6: גלילה חלקה לשלב הפעיל — המשתמש "עוקב" אחרי הזרימה
        try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }
}

function renderAnchorChips(anchorsText) {
    const c = document.getElementById('anchorsChips');
    c.innerHTML = '';
    const lines = anchorsText.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(l => l.length > 0 && l.length < 80);
    lines.forEach(line => {
        const chip = document.createElement('span');
        chip.className = 'anchor-chip';
        chip.textContent = line;
        c.appendChild(chip);
    });
}

// =======================================================
// לוח השלמות
// =======================================================
function updateStat(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function formatDuration(seconds) {
    if (!seconds || !isFinite(seconds)) return '--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}
function countWords(text) {
    if (!text) return 0;
    // v7.5: סמני זמן [MM:SS] לא נספרים כמילים. גם תיוגים [ספק:...] [לא ברור].
    return text.split(/\s+/).filter(w => w.length > 0 && !w.startsWith('[')).length;
}

function updateQualityDashboard() {
    const text = document.getElementById('rawTranscript').value;
    const actualWords = countWords(text);
    updateStat('statActualVal', actualWords);

    if (audioDurationSeconds > 0) {
        const expectedWords = Math.round((audioDurationSeconds / 60) * 130);
        updateStat('statExpectedVal', expectedWords);
        const ratio = expectedWords > 0 ? (actualWords / expectedWords) : 0;
        const ratioPct = Math.round(ratio * 100);
        updateStat('statRatioVal', ratioPct + '%');
        document.getElementById('progressBar').style.width = Math.min(100, ratioPct) + '%';
        document.getElementById('progressLabel').textContent = Math.min(100, ratioPct) + '%';

        const ratioCard = document.getElementById('statRatio');
        ratioCard.classList.remove('quality-good', 'quality-warn', 'quality-bad');
        if (ratio >= 0.85 && ratio <= 1.3) ratioCard.classList.add('quality-good');
        else if (ratio >= 0.6 && ratio < 0.85) ratioCard.classList.add('quality-warn');
        else if (ratio > 0) ratioCard.classList.add('quality-bad');
    }
}

function showQualityVerdict() {
    const text = document.getElementById('rawTranscript').value;
    const actualWords = countWords(text);
    const verdict = document.getElementById('qualityVerdict');
    verdict.classList.remove('hidden');

    if (audioDurationSeconds === 0) {
        verdict.className = 'mt-3 p-3 rounded-lg text-sm bg-blue-50 border border-blue-200 text-blue-900';
        verdict.innerHTML = `📋 התמלול הסתיים. סה"כ ${actualWords} מילים. <strong>לא ניתן לחשב יחס כיסוי</strong> (מקור YouTube או משך לא ידוע). מומלץ להריץ "בדיקת שלמות מעמיקה".`;
        return;
    }
    const expected = Math.round((audioDurationSeconds / 60) * 130);
    const ratio = actualWords / expected;
    if (ratio >= 0.85) {
        verdict.className = 'mt-3 p-3 rounded-lg text-sm bg-green-50 border border-green-300 text-green-900';
        verdict.innerHTML = `✅ <strong>התמלול נראה שלם</strong> — ${actualWords} מילים מתוך ${expected} צפויות (${Math.round(ratio*100)}%). השלמות סבירה.`;
    } else if (ratio >= 0.6) {
        verdict.className = 'mt-3 p-3 rounded-lg text-sm bg-yellow-50 border border-yellow-300 text-yellow-900';
        verdict.innerHTML = `⚠️ <strong>התמלול ייתכן וחסר חלקים</strong> — רק ${actualWords} מתוך ${expected} מילים צפויות (${Math.round(ratio*100)}%). מומלץ "המשך מאולץ" או "בדיקת שלמות".`;
    } else if (ratio > 0) {
        verdict.className = 'mt-3 p-3 rounded-lg text-sm bg-red-50 border border-red-300 text-red-900';
        verdict.innerHTML = `🚨 <strong>חוסר משמעותי בתמלול!</strong> רק ${actualWords} מתוך ${expected} מילים צפויות (${Math.round(ratio*100)}%). יש להריץ "המשך מאולץ" מיידית.`;
    }
}

// =======================================================
// ניהול מקור השמע
// =======================================================
function switchSourceTab(type) {
    currentSourceType = type;
    document.getElementById('tabFile').classList.toggle('active', type === 'file');
    document.getElementById('tabYoutube').classList.toggle('active', type === 'youtube');
    document.getElementById('fileSourcePanel').classList.toggle('hidden', type !== 'file');
    document.getElementById('youtubeSourcePanel').classList.toggle('hidden', type !== 'youtube');
}
function isValidYoutubeUrl(url) {
    return /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)[\w\-]{11}/.test(url);
}
async function loadAudioMetadata(file) {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => { resolve(audio.duration); URL.revokeObjectURL(audio.src); };
        audio.onerror = () => resolve(0);
        audio.src = URL.createObjectURL(file);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadStoredKeys();
    try { initApiKeySection(); } catch (e) {} // v9: סעיף מפתח API מרכזי — מקופל/פתוח
    try { autoValidateGeminiKey(); } catch (e) {} // v9: בדיקת מפתח שקטה בטעינה
    try { updateNotificationButtonUI(); } catch (e) {}
    try { initCompactMode(); } catch (e) {}
    try { onEditIntensityChange(); } catch (e) {} // v7.6: תיאור-slider עריכה
    try { startProjectAutoSaveInterval(); } catch (e) {} // v9: שמירה אוטומטית כל דקה
    const audioFileEl = document.getElementById('audioFile');
    if (audioFileEl) audioFileEl.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const dur = await loadAudioMetadata(file);
        audioDurationSeconds = dur;
        // ניקוי באפר מפוענח קודם — קובץ חדש = פענוח חדש
        cachedDecodedBuffer = null;
        cachedDecodedFor = null;
        document.getElementById('audioFileInfo').innerHTML =
            `📏 גודל: <strong>${sizeMB} MB</strong> | משך: <strong>${formatDuration(dur)}</strong> ` +
            (dur > 0 ? `| צפי מילים: <strong>~${Math.round((dur/60)*130)}</strong>` : '');
        // v7.3: מכינים את האודיו לניווט מיידית (לא מחכים לסיום תמלול)
        try { setupAudioForNavigation(file); } catch (err) {}
        // איפוס מפת זמנים — תיבנה מחדש לאחר תמלול
        wordTimeMap = [];
        try { updateCostEstimate(); } catch (err) {}
    });

    // עדכון אומדן עלות כשמשנים פרמטרים
    ['chunkDurationMinutes', 'chunkOverlapSeconds', 'skipAnchors', 'skipValidation',
     'geminiModel', 'geminiFastModel', 'priceProIn', 'priceProOut', 'priceFlashIn', 'priceFlashOut'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => { try { updateCostEstimate(); } catch(e) {} });
    });
    // v9: המפתחות נשמרים תמיד אוטומטית (localStorage) — בלי תיבת סימון
    ['geminiApiKey', 'claudeApiKey'].forEach(id => {
        const keyEl = document.getElementById(id);
        if (!keyEl) return;
        keyEl.addEventListener('blur', () => { try { saveStoredKeys(); } catch (e) {} });
        keyEl.addEventListener('input', () => { try { updateApiKeyHint(); } catch (e) {} });
    });
    // v9: בדיקת מפתח Gemini אוטומטית — 2 שניות אחרי שמפסיקים להקליד
    const gkEl = document.getElementById('geminiApiKey');
    if (gkEl) gkEl.addEventListener('input', () => { try { scheduleAutoKeyCheck(); } catch (e) {} });
    // v9: שינוי המודל הראשי → רענון בדיקת זמינות מול החשבון
    const gmEl = document.getElementById('geminiModel');
    if (gmEl) gmEl.addEventListener('change', () => { try { autoValidateGeminiKey(true); } catch (e) {} });
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!document.getElementById('startPipelineBtn').disabled) runFullPipeline();
        }
    });
});

// =======================================================
// v9: ניהול מפתחות API — סעיף מרכזי בראש העמוד
// המפתח מוזן פעם אחת, נשמר תמיד ב-localStorage, ומשמש לכל המסלולים.
// =======================================================
function saveStoredKeys() {
    // v9: שמירה תמידית — אין יותר תיבת "זכור מפתחות".
    try {
        const gk = document.getElementById('geminiApiKey');
        const ck = document.getElementById('claudeApiKey');
        if (gk) localStorage.setItem('torahApp_geminiKey', gk.value || '');
        if (ck) localStorage.setItem('torahApp_claudeKey', ck.value || '');
    } catch (e) {}
}
function loadStoredKeys() {
    try {
        const gk = document.getElementById('geminiApiKey');
        const ck = document.getElementById('claudeApiKey');
        // תאימות לאחור: גרסאות קודמות שמרו רק אם torahApp_remember=1 — כעת תמיד טוענים אם קיים.
        if (gk) gk.value = localStorage.getItem('torahApp_geminiKey') || '';
        if (ck) ck.value = localStorage.getItem('torahApp_claudeKey') || '';
        // ניקוי דגל ישן שלא בשימוש עוד
        localStorage.removeItem('torahApp_remember');
    } catch (e) {}
}
function clearStoredKeys() {
    try {
        localStorage.removeItem('torahApp_geminiKey');
        localStorage.removeItem('torahApp_claudeKey');
        localStorage.removeItem('torahApp_remember');
    } catch (e) {}
    const gk = document.getElementById('geminiApiKey');
    const ck = document.getElementById('claudeApiKey');
    if (gk) gk.value = '';
    if (ck) ck.value = '';
    const res = document.getElementById('testKeyResult');
    if (res) { res.classList.add('hidden'); res.textContent = ''; }
    expandApiKeySection();
    try { updateApiKeyHint(); } catch (e) {}
    alert('המפתח השמור נמחק מהדפדפן.');
}

// סעיף מפתח ה-API: מקופל כשיש מפתח שמור, פתוח כשאין.
function initApiKeySection() {
    const section = document.getElementById('apiKeySection');
    if (!section) return;
    const gk = document.getElementById('geminiApiKey');
    const hasKey = gk && gk.value.trim().length > 10;
    if (hasKey) collapseApiKeySection();
    else expandApiKeySection();
    updateApiKeyHint();
}
function collapseApiKeySection() {
    const collapsed = document.getElementById('apiKeyCollapsed');
    const expanded = document.getElementById('apiKeyExpanded');
    if (!collapsed || !expanded) return;
    // עדכון תג Claude במצב המקופל
    const ck = document.getElementById('claudeApiKey');
    const badge = document.getElementById('apiKeyClaudeBadge');
    if (badge) badge.classList.toggle('hidden', !(ck && ck.value.trim().length > 10));
    collapsed.classList.remove('hidden');
    collapsed.classList.add('flex');
    expanded.classList.add('hidden');
}
function expandApiKeySection() {
    const collapsed = document.getElementById('apiKeyCollapsed');
    const expanded = document.getElementById('apiKeyExpanded');
    if (!collapsed || !expanded) return;
    collapsed.classList.add('hidden');
    collapsed.classList.remove('flex');
    expanded.classList.remove('hidden');
}
function saveApiKeysAndCollapse() {
    const gk = document.getElementById('geminiApiKey');
    const key = gk ? gk.value.trim() : '';
    if (key.length < 10) {
        const hint = document.getElementById('apiKeySaveHint');
        if (hint) hint.textContent = '⚠️ נא להזין מפתח Gemini תקין (חובה).';
        if (gk) gk.focus();
        return;
    }
    saveStoredKeys();
    const hint = document.getElementById('apiKeySaveHint');
    if (hint) hint.textContent = '✓ נשמר במכשיר זה.';
    collapseApiKeySection();
}
// רמז קצר ליד כפתור השמירה — משוב חי בזמן הקלדה
function updateApiKeyHint() {
    const hint = document.getElementById('apiKeySaveHint');
    if (!hint) return;
    const gk = document.getElementById('geminiApiKey');
    const key = gk ? gk.value.trim() : '';
    if (!key) hint.textContent = '';
    else if (key.length < 10) hint.textContent = 'המפתח נראה קצר מדי…';
    else hint.textContent = '';
}

function toggleApiKeyVisibility(fieldId, buttonId) {
    const field = document.getElementById(fieldId);
    const button = document.getElementById(buttonId);
    if (!field) return;
    field.type = field.type === 'password' ? 'text' : 'password';
    if (button) button.textContent = field.type === 'password' ? '👁️' : '🙈';
}

// =======================================================
// v9: בדיקת מפתח אוטומטית ושקטה + מעבר אוטומטי למודל חינמי
// המערכת בודקת את המפתח ברקע ומציגה ✓/❌. אם המפתח שייך
// לחשבון ללא חיוב — והמודל שנבחר אינו זמין בו — המערכת
// עוברת אוטומטית ל-gemini-2.5-flash (זמין חינם לכולם) ומעדכנת.
// =======================================================
const FREE_TIER_FALLBACK_MODEL = 'gemini-2.5-flash';
let _autoKeyCheckTimer = null;

// מציג את תוצאת הבדיקה האוטומטית בתיבת testKeyResult
function showAutoKeyStatus(kind, html) {
    const result = document.getElementById('testKeyResult');
    if (!result) return;
    const styles = {
        checking: 'mt-2 text-xs p-2 rounded bg-blue-50 text-blue-800 border border-blue-200',
        ok:       'mt-2 text-xs p-2 rounded bg-green-50 text-green-900 border border-green-300',
        warn:     'mt-2 text-xs p-2 rounded bg-amber-50 text-amber-900 border border-amber-300',
        error:    'mt-2 text-xs p-2 rounded bg-red-50 text-red-800 border border-red-300'
    };
    result.className = styles[kind] || styles.checking;
    result.innerHTML = html;
    result.classList.remove('hidden');
}

// בדיקה שקטה: מאמתת את המפתח, ואם צריך — מורידה למודל חינמי.
// silent=true → לא מציג "בודק..." (לטעינת-דף שקטה); אחרת מציג משוב מלא.
async function autoValidateGeminiKey(silent) {
    const gk = document.getElementById('geminiApiKey');
    const rawKey = gk ? gk.value : '';
    const key = rawKey.trim();
    if (!key || key.length < 10) return; // אין מה לבדוק

    // אבחון מקדים — האם המפתח מכיל תווים חשודים?
    if (/\s/.test(key)) {
        if (!silent) showAutoKeyStatus('error',
            `❌ <strong>המפתח מכיל רווחים</strong> — הסר אותם והדבק מחדש.`);
        return;
    }
    if (/[<>"']/.test(key)) {
        if (!silent) showAutoKeyStatus('error',
            `❌ <strong>המפתח מכיל תווים לא חוקיים</strong> (כמו &lt; או &gt;). ודא שהעתקת רק את המפתח עצמו, ללא תגי HTML.`);
        return;
    }
    if (!/^[A-Za-z0-9_\-]+$/.test(key)) {
        if (!silent) showAutoKeyStatus('error',
            `❌ <strong>המפתח מכיל תווים לא תקניים.</strong> מפתח Gemini תקין מורכב מאותיות, מספרים, _ ו-- בלבד.`);
        return;
    }
    // בדיקת פורמט מפתח Gemini — תמיד מתחיל ב-AIza, אורך 39 תווים
    if (!key.startsWith('AIza')) {
        if (!silent) showAutoKeyStatus('error',
            `❌ <strong>זה לא נראה כמו מפתח Gemini API.</strong><br>` +
            `מפתחות Gemini תמיד מתחילים ב-<code>AIza</code> ואורכם 39 תווים.<br>` +
            `המפתח שהזנת מתחיל ב-<code>${key.substring(0, 4)}</code> (אורך: ${key.length}).<br>` +
            `<a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline">לחץ כאן ליצירת מפתח חדש ב-Google AI Studio</a> ` +
            `(לא ב-Google Cloud Console!).`);
        return;
    }
    if (key.length !== 39) {
        if (!silent) showAutoKeyStatus('error',
            `❌ <strong>אורך המפתח לא תקין:</strong> ${key.length} תווים (הצפוי: 39).<br>` +
            `ודא שהעתקת את כל המפתח, ללא קיצוץ או הוספת תווים.`);
        return;
    }

    if (!silent) showAutoKeyStatus('checking', 'בודק את המפתח מול שרתי Google…');
    try {
        const url = buildGeminiUrl('v1beta/models', key);
        const resp = await fetch(url);

        // קוראים את התגובה כטקסט קודם — כדי לא להיתקע על Unexpected token
        const rawText = await resp.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseErr) {
            const looksLikeHtml = rawText.trim().startsWith('<');
            const preview = rawText.substring(0, 200).replace(/</g, '&lt;');
            let diagnostic = '';
            if (looksLikeHtml) {
                // 404 + HTML זה דפוס קלאסי של "מפתח לא תקף ב-Gemini"
                if (resp.status === 404) {
                    diagnostic =
                        `<strong>השרת החזיר 404 — סימן שהמפתח לא מוכר ל-Gemini API.</strong> ` +
                        `הסיבות הסבירות ביותר:<br>` +
                        `• המפתח <strong>נוצר ב-Google Cloud Console</strong> במקום ב-Google AI Studio — צריך ליצור אותו ב-<a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline">aistudio.google.com</a><br>` +
                        `• המפתח <strong>חדש מאוד</strong> — חכה 2-3 דקות והודבק שוב.<br>` +
                        `• המפתח שייך לפרויקט ש-<strong>Generative Language API לא מופעל בו</strong>.<br>` +
                        `• המפתח <strong>הוגבל לדומיינים ספציפיים</strong> שלא כוללים את האתר הזה.`;
                } else {
                    diagnostic =
                        `שרתי Google החזירו דף HTML במקום JSON. סיבות אפשריות:<br>` +
                        `• <strong>חומת אש / פרוקסי תאגידי</strong> חוסמים את generativelanguage.googleapis.com<br>` +
                        `• <strong>תוסף דפדפן</strong> (חוסם פרסומות/פרטיות) חוסם את הבקשה<br>` +
                        `• <strong>VPN או captive portal</strong> מפנים לדף אחר<br>` +
                        `• <strong>חיבור לאינטרנט דרך רשת ציבורית</strong> שדורשת התחברות<br>` +
                        `נסה: לפתוח חלון גלישה בסתר (Incognito), לכבות תוספים, לבדוק חיבור ישיר.`;
                }
                diagnostic += `<br><details><summary>תצוגה מקדימה של התגובה</summary><pre style="font-size:10px;white-space:pre-wrap">${preview}</pre></details>`;
            } else {
                diagnostic = `תגובה לא צפויה מהשרת: ${preview}`;
            }
            if (!silent) showAutoKeyStatus('error',
                `❌ <strong>שגיאה בבדיקת המפתח (HTTP ${resp.status}):</strong><br>${diagnostic}`);
            return;
        }

        if (!resp.ok || !data.models || data.models.length === 0) {
            const errMsg = (data.error && data.error.message) || `קוד שגיאה ${resp.status}`;
            showAutoKeyStatus('error', `❌ <strong>המפתח אינו תקין:</strong> ${errMsg}<br>` +
                `<a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline">צור מפתח חדש ב-AI Studio</a>.`);
            return;
        }
        // המפתח תקין — בודקים אם המודל שנבחר זמין בחשבון הזה
        const available = data.models.map(m => (m.name || '').replace('models/', ''));
        const sel = document.getElementById('geminiModel');
        const fastSel = document.getElementById('geminiFastModel');
        const chosen = sel ? sel.value : '';
        const fallbackAvailable = available.includes(FREE_TIER_FALLBACK_MODEL);
        const chosenAvailable = !chosen || available.includes(chosen);

        if (!chosenAvailable && fallbackAvailable) {
            // ככל הנראה חשבון ללא חיוב — המודל שנבחר (preview/pro) אינו זמין.
            // מורידים אוטומטית למודל החינמי.
            if (sel) sel.value = FREE_TIER_FALLBACK_MODEL;
            // גם המודל המהיר — אם אינו זמין, מורידים אותו
            if (fastSel && !available.includes(fastSel.value) && fallbackAvailable) {
                fastSel.value = FREE_TIER_FALLBACK_MODEL;
            }
            try { updateCostEstimate(); } catch (e) {}
            showAutoKeyStatus('warn',
                `⚠️ <strong>המפתח תקין, אך נראה שהוא שייך לחשבון ללא חיוב.</strong><br>` +
                `המודל <code>${chosen}</code> אינו זמין בחשבון זה, ולכן המערכת עברה אוטומטית ל-<strong>${FREE_TIER_FALLBACK_MODEL}</strong> — ` +
                `מודל איכותי שזמין בחינם לכולם.<br>` +
                `<span class="text-amber-700">כדי להשתמש במודלים מתקדמים יותר (כמו gemini-3.1-pro), צריך לחבר חשבון חיוב ב-Google Cloud. אפשר גם לבחור מודל אחר ידנית בהגדרות המודלים.</span>`);
        } else if (!chosenAvailable && !fallbackAvailable) {
            // מקרה נדיר — אפילו מודל הגיבוי לא זמין
            showAutoKeyStatus('warn',
                `⚠️ <strong>המפתח תקין</strong>, אך המודל שנבחר (<code>${chosen}</code>) אינו זמין בחשבון זה ` +
                `וגם מודל הגיבוי אינו זמין. בחר ידנית מודל מהרשימה — נסה gemini-1.5-flash.`);
        } else {
            // הכל תקין
            showAutoKeyStatus('ok', `✅ <strong>המפתח תקין</strong> — זוהו ${data.models.length} מודלים זמינים בחשבון.`);
        }
    } catch (e) {
        // שגיאת רשת אמיתית — fetch נכשל לגמרי
        if (!silent) {
            let extra = '';
            const msg = (e && e.message) || '';
            if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror')) {
                extra = '<br>ייתכן ש-CORS חסום, או שאין חיבור לאינטרנט, או שחומת אש חוסמת את הגישה ל-generativelanguage.googleapis.com.';
            } else if (msg.includes('Unexpected token')) {
                extra = '<br>השרת החזיר HTML במקום JSON — סביר שיש פרוקסי/חומת אש/תוסף שחוסם.';
            }
            showAutoKeyStatus('error', `❌ שגיאת רשת בבדיקת המפתח: ${msg}${extra}`);
        }
    }
}

// בדיקה מושהית — נקראת תוך כדי הקלדה, מריצה בדיקה 2 שניות אחרי שמפסיקים
function scheduleAutoKeyCheck() {
    if (_autoKeyCheckTimer) clearTimeout(_autoKeyCheckTimer);
    _autoKeyCheckTimer = setTimeout(() => {
        try { autoValidateGeminiKey(false); } catch (e) {}
    }, 2000);
}

// =======================================================
// v9: שמירה אוטומטית של הפרויקט כל דקה
// מגן מפני אובדן עבודה בקריסת דפדפן / רענון. משתמש במנגנון
// commitActiveProject הקיים — שומר טקסט גולמי, ערוך, והגדרות.
// =======================================================
let _projectAutoSaveInterval = null;
function startProjectAutoSaveInterval() {
    if (_projectAutoSaveInterval) clearInterval(_projectAutoSaveInterval);
    _projectAutoSaveInterval = setInterval(() => {
        try {
            if (typeof activeProject !== 'undefined' && activeProject) {
                commitActiveProject();
            }
        } catch (e) { console.warn('שמירה אוטומטית נכשלה:', e); }
    }, 60000); // כל 60 שניות
}

// =======================================================
// צינור העיבוד הראשי
// =======================================================
async function runFullPipeline() {
    requestNotificationPermission();
    hideError();
    saveStoredKeys();

    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    if (!geminiKey) { showError('אנא הזן מפתח Gemini API.'); return; }

    try {
        if (currentSourceType === 'youtube') {
            const url = document.getElementById('youtubeUrl').value.trim();
            if (!isValidYoutubeUrl(url)) throw new Error('כתובת YouTube לא חוקית.');
            currentSourcePart = { fileData: { fileUri: url } };
            audioDurationSeconds = 0;
        } else {
            const audioFileInput = document.getElementById('audioFile');
            if (audioFileInput.files.length === 0) throw new Error('אנא בחר קובץ שמע.');
        }
    } catch (err) { showError(err.message); return; }

    const provider = getTextProvider();
    if (provider === 'claude' && !document.getElementById('claudeApiKey').value.trim()) {
        showError('בחרת ב-Claude לעריכה אך לא הזנת מפתח Anthropic API.');
        return;
    }

    // קריאה של בחירות הדילוג
    const skipAnchors = document.getElementById('skipAnchors').checked;
    const skipValidation = document.getElementById('skipValidation').checked;

    setInputsDisabledState(true);
    ['anchorsSection', 'rawTranscriptSection', 'validationSection',
     'editingControlsSection', 'editedTranscriptSection'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById('verifyCompleteResult').classList.add('hidden');
    document.getElementById('verifyFidelityResult').classList.add('hidden');
    document.getElementById('loopAlertContainer').innerHTML = '';
    document.getElementById('qualityVerdict').classList.add('hidden');

    // איפוס שימוש בטוקנים — קריטי כדי שהמספר הסופי יהיה רק של הריצה הזו
    usageTracker.reset();

    totalLoopsDetected = 0;
    updateStat('statLoopsVal', 0);
    updateStat('statActualVal', 0);
    updateStat('statRatioVal', '--');
    updateStat('statDurationVal', formatDuration(audioDurationSeconds));
    updateStat('statExpectedVal', audioDurationSeconds > 0 ? Math.round((audioDurationSeconds/60)*130) : '--');
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressLabel').textContent = '0%';
    document.getElementById('qualityDashboard').classList.remove('hidden');

    // איפוס מלא של לוח העריכה — קריטי כדי שלא יציג ערכים תקועים מריצה קודמת.
    // הלוח חייב להיות מוסתר ומאופס עד שהעריכה מתחילה בפועל בשלב 4.
    const editDash = document.getElementById('editDashboard');
    if (editDash) editDash.classList.add('hidden');
    updateStat('editStatRawWords', 0);
    updateStat('editStatEditedWords', 0);
    updateStat('editStatRatio', '--');
    updateStat('editStatProvider', '--');
    const epb = document.getElementById('editProgressBar');
    if (epb) epb.style.width = '0%';
    const epl = document.getElementById('editProgressLabel');
    if (epl) epl.textContent = '0%';

    // ניקוי לוח הצ'אנקים אם נשאר מריצה קודמת
    document.getElementById('chunksSection').classList.add('hidden');
    document.getElementById('chunksContainer').innerHTML = '';
    chunkResults = [];

    // איפוס מצב פנימי כשמדלגים
    extractedAnchors = "";
    validationReport = "";

    const statusEl = document.getElementById('pipelineStatus');
    const statusText = document.getElementById('pipelineStatusText');
    statusEl.classList.remove('hidden');
    resetAbortState();
    startTimer('pipelineTimer');

    // חישוב מספר השלבים בפועל לתצוגה
    const totalStages = 2 + (skipAnchors ? 0 : 1) + (skipValidation ? 0 : 1);
    let currentStage = 0;
    const checkAbort = () => { if (pipelineAborted) throw new Error('הצינור נעצר על ידי המשתמש.'); };

    try {
        if (currentSourceType === 'file') {
            statusText.innerText = `מעלה את הקובץ לשרת Google...`;
            const file = document.getElementById('audioFile').files[0];
            const uploadedFile = await uploadFileToGemini(geminiKey, file);
            // v9.1: שמירת זמן העלאה לבדיקת תפוגה
            currentSourcePart = { fileData: { mimeType: uploadedFile.mimeType, fileUri: uploadedFile.uri }, _uploadedAt: Date.now() };
            statusText.innerText = 'ממתין לאישור עיבוד הקובץ...';
            await waitForFileProcessing(geminiKey, uploadedFile.name, statusText);
        } else {
            statusText.innerText = `Gemini טוען את הסרטון מ-YouTube...`;
        }

        // שלב 1 - חילוץ עוגנים (אופציונלי, סובלני לשגיאות)
        if (!skipAnchors) {
            checkAbort();
            currentStage++;
            statusText.innerText = `🪝 שלב ${currentStage}/${totalStages}: מחלץ עוגנים תורניים (מודל מהיר)...`;
            activateStageCard('anchorsSection');
            try {
                extractedAnchors = await extractAnchors(geminiKey);
                document.getElementById('anchorsTextarea').value = extractedAnchors;
                renderAnchorChips(extractedAnchors);
            } catch (err) {
                if (pipelineAborted) throw err;
                showError(`חילוץ עוגנים נכשל (${err.message}). הצינור ממשיך לתמלול ללא מילון עוגנים.`);
                extractedAnchors = "";
            }
        } else {
            document.getElementById('anchorsSection').classList.add('hidden');
        }

        // שלב 2 - תמלול (תמיד מתבצע, סובלני להזיות/לולאות)
        checkAbort();
        currentStage++;
        const useChunks = decideUseChunks();
        const modeLabel = useChunks ? 'בצ\'אנקים מבוססי-זמן' : (skipAnchors ? '' : ' מונחה');
        statusText.innerText = `📝 שלב ${currentStage}/${totalStages}: מבצע תמלול ${modeLabel}...`;
        activateStageCard('rawTranscriptSection');
        try {
            if (useChunks) {
                await performChunkedTranscription(geminiKey, extractedAnchors, statusText);
            } else {
                document.getElementById('chunksSection').classList.add('hidden');
                await performGuidedTranscription(geminiKey, extractedAnchors, statusText);
            }
        } catch (err) {
            if (pipelineAborted) throw err;
            // גם אם נכשל, אם יש טקסט חלקי - נמשיך הלאה
            const partial = document.getElementById('rawTranscript').value.trim();
            if (!partial || partial.length < 50) {
                throw err; // אין מה לעשות עם זה
            }
            showError(`התמלול נעצר עם בעיה (${err.message}), אבל יש לך תמלול חלקי. הצינור ממשיך — תוכל לבצע "המשך מאולץ" אחר כך.`);
        }
        showQualityVerdict();

        // שלב 3 - ולידציה (אופציונלי, סובלני לשגיאות)
        if (!skipValidation) {
            checkAbort();
            currentStage++;
            statusText.innerText = `🛡️ שלב ${currentStage}/${totalStages}: ולידציה מקבילה (מודל מהיר)...`;
            activateStageCard('validationSection');
            const rawText = document.getElementById('rawTranscript').value.trim();
            try {
                validationReport = await performParallelValidation(geminiKey, rawText, extractedAnchors);
                document.getElementById('validationTextarea').value = validationReport;
                // הצגת כפתור תיקון אם זוהו בעיות
                renderValidationFixButton(validationReport);
            } catch (err) {
                if (pipelineAborted) throw err;
                showError(`ולידציה נכשלה (${err.message}). הצינור ממשיך לעריכה ללא דוח ולידציה.`);
                validationReport = "";
            }
        } else {
            document.getElementById('validationSection').classList.add('hidden');
        }

        // שלב 4 - חשיפת לוח עריכה (תמיד נחשף, גם אם שלבים קודמים נכשלו)
        currentStage++;
        statusText.innerText = `✏️ הצינור הסתיים! ניתן להתחיל עריכה.`;
        activateStageCard('editingControlsSection');

        stopTimer();
        let summary = `הושלמו ${totalStages} שלבים`;
        if (skipAnchors || skipValidation) {
            const skipped = [];
            if (skipAnchors) skipped.push('עוגנים');
            if (skipValidation) skipped.push('ולידציה');
            summary += ` (דילוג: ${skipped.join(', ')})`;
        }
        if (totalLoopsDetected > 0) summary += `. ${totalLoopsDetected} לולאות תוקנו אוטומטית.`;
        sendDesktopNotification("הצינור הסתיים", summary);
    } catch (err) {
        stopTimer();
        showError('תקלה בצינור:\n' + err.message);
    } finally {
        statusEl.classList.add('hidden');
        setInputsDisabledState(false);
        // הצגת שימוש בפועל של טוקנים ועלות
        try { showActualUsage(); } catch (e) {}
    }
}

// =======================================================
// שלב 1: חילוץ עוגנים — מודל מהיר + הגבלת אסימונים
// =======================================================
async function extractAnchors(apiKey) {
    const fastModel = document.getElementById('geminiFastModel').value;
    let collected = "";
    await callGeminiAPIStreaming(
        apiKey, fastModel, ANCHOR_EXTRACTION_PROMPT, currentSourcePart,
        "אנא חלץ במהירות את רשימת העוגנים החשובים מהשמע, בפורמט הקצר המבוקש.",
        (liveText) => { collected = liveText; document.getElementById('anchorsTextarea').value = liveText; },
        { maxOutputTokens: 1500 } // הגבלה: ~750 מילים = מספיק ל-30+ עוגנים
    );
    renderAnchorChips(collected);
    return collected;
}

// =======================================================
// שלב 2: תמלול נאמן (יכול להיות עם או בלי עוגנים)
// =======================================================
/**
 * buildTranscriptionSystemPrompt — בונה פרומפט מערכת לתמלול
 * @param {string} anchors — עוגנים מחולצים (אופציונלי)
 * @param {boolean} forChunk — האם זו קריאת צ'אנק (תוסיף את הזנב הייעודי לצ'אנקים)
 */
function buildTranscriptionSystemPrompt(anchors, forChunk) {
    let systemPrompt = GUIDED_TRANSCRIPTION_PROMPT_BASE;

    // מילון תורני מובנה (אם הופעל)
    if (document.getElementById('useBuiltinGlossary')?.checked !== false) {
        systemPrompt += BUILTIN_GLOSSARY_HEADER + BUILTIN_TORAH_GLOSSARY;
    }

    // עוגנים מחולצים מהשמע (אם קיימים)
    if (anchors && anchors.trim()) {
        systemPrompt += GUIDED_ANCHORS_BLOCK_HEADER + `\n\n${anchors}\n\n--- סוף מילון העוגנים ---`;
    }

    // v7.7: זיהוי דוברים — נוספת רק אם המשתמש סימן
    if (document.getElementById('optSpeakerDiarization')?.checked) {
        systemPrompt += `\n\n**🎤 זיהוי דוברים — חובה:**
אם השמע מכיל יותר מדובר אחד (שיעור עם שאלות מהקהל, או דיון בין כמה דוברים), סמן בתחילת כל מעבר-דובר תיוג:
- בשיעור עם שאלות: כתוב [שואל:] לפני שאלה מהקהל, ו-[משיב:] לפני תשובת הרב. דוגמה:
  [משיב:] ולכן נמצא שצריך עיון.
  [שואל:] אבל הרב, מה עם הרשב"א שאמר אחרת?
  [משיב:] שאלה טובה. הרשב"א מדבר על מקרה אחר...
- בדיון רב-משתתפים: כתוב [דובר א'], [דובר ב'], [דובר ג'] לפי הסדר שדוברים מופיעים.
- אסור לכלול תיוג דובר אם רק דובר אחד מדבר בכל השמע — זה שיעור-יחיד.
- התיוג מופיע בתחילת כל פסקה של דובר חדש, בשורה ייעודית או בתחילת השורה.
- אסור להמציא דוברים שלא נשמעו. אם הרב משיב לשאלה רטורית של עצמו — זה לא [שואל:], זו רק אמירת הרב.`;
    }

    // הוראות מיוחדות מהמשתמש
    const userCustom = document.getElementById('customTranscriptionPrompt').value.trim();
    if (userCustom) systemPrompt += `\n\n**הנחיות מיוחדות:**\n${userCustom}`;

    // אם זה צ'אנק — נוסיף את ההוראות הייעודיות לצ'אנקים
    if (forChunk) systemPrompt += CHUNK_TRANSCRIPTION_PROMPT_TAIL;

    return systemPrompt;
}

async function performGuidedTranscription(apiKey, anchors, statusText) {
    const mainModel = document.getElementById('geminiModel').value;
    const rawTextArea = document.getElementById('rawTranscript');

    const systemPrompt = buildTranscriptionSystemPrompt(anchors, false);

    rawTextArea.value = "המודל מאזין ויוצר תמלול...\n";

    let completeText = "";
    let isFinished = false;
    let attempts = 0;
    const maxAttempts = 8;
    let isFirstChunk = false;
    let currentUserPrompt = "תמלל את הקובץ במלואו מהתחלה ועד הסוף, מילה במילה, בלי דילוגים. **קריטי: אל תיכנס ללולאת חזרה - אם לא ברור, רשום [לא ברור] והמשך.**";

    while (!isFinished && attempts < maxAttempts) {
        attempts++;
        let chunkText = "";

        const result = await callGeminiAPIStreaming(apiKey, mainModel, systemPrompt, currentSourcePart,
            currentUserPrompt,
            (liveText) => {
                if (!isFirstChunk) { isFirstChunk = true; rawTextArea.value = ""; }
                chunkText = liveText;
                updateTextWithSmartScroll('rawTranscript', completeText + chunkText);
                updateQualityDashboard();
            });

        if (result.finishReason === 'USER_ABORTED') {
            completeText += result.text;
            rawTextArea.value = completeText;
            throw new Error('הצינור נעצר על ידי המשתמש.');
        } else if (result.finishReason === 'HALLUCINATION_DETECTED') {
            // הזיה — לא נסתפק רק להוסיף; ננקה את הקטע הזיוני ונבקש לחדש
            showHallucinationAlert(result.reason);
            if (attempts === 1) {
                // ניסיון ראשון של הזיה — אולי השמע תקין אבל המודל התבלבל. ננקה ונסה שוב.
                completeText = "";
                rawTextArea.value = "";
                if (statusText) statusText.innerText = `🚨 הזיה! מנקה ומנסה שוב (ניסיון ${attempts + 1})...`;
                currentUserPrompt = `הניסיון הקודם נכשל - יצרת תוכן שאינו קשור לשמע. נסה שוב מהתחלה והקפד: רק עברית/ארמית/יידיש מהשמע. אם אתה לא מצליח להבין את השמע, כתוב "[שמע לא תקין]" ועצור.`;
            } else {
                // הזיה חוזרת — סביר שהשמע באמת בעייתי. עוצר.
                throw new Error(`המודל מייצר תוכן זר במקום לתמלל את השמע. ${result.reason}\nודא שהקובץ תקין, ברור, ובשפה הנכונה. ייתכן שכדאי לנסות מודל אחר.`);
            }
        } else if (result.finishReason === 'LOOP_DETECTED') {
            const cleanedChunk = trimRepetitionJunk(result.text);
            completeText += cleanedChunk;
            showLoopAlert(`המודל נכנס ללולאת חזרה בניסיון ${attempts}. הוסר ${result.text.length - cleanedChunk.length} תווים מזוהמים.`);
            rawTextArea.value = completeText;
            updateQualityDashboard();
            if (statusText) statusText.innerText = `📝 זוהתה לולאה. מתחדש (ניסיון ${attempts + 1})...`;
            currentUserPrompt = `**אזהרה: נכנסת ללולאת חזרה. הקטע הפגום נוקה.**
המילים האחרונות התקינות: "${completeText.slice(-200)}".
חובה: 1. המשך מאותה נקודה בדיוק. 2. אל תחזור על מילה/צליל יותר מ-2 פעמים. 3. אם לא ברור, רשום [לא ברור] והמשך. 4. אם הגעת לסוף ההקלטה - עצור.`;
        } else if (result.finishReason === 'MAX_TOKENS') {
            completeText += result.text;
            if (statusText) statusText.innerText = `📝 ממשיך אוטומטית (חלק ${attempts + 1})...`;
            currentUserPrompt = `הגעת למגבלת אורך. המילים האחרונות: "${completeText.slice(-200)}". המשך מאותה נקודה עד סוף השמע, אל תחזור.`;
        } else {
            completeText += result.text;
            isFinished = true;
        }
    }

    rawTextArea.value = completeText;
    updateQualityDashboard();
    if (!completeText || completeText.trim() === "") throw new Error("התמלול חזר ריק.");
    // v7.3: בניית מפת זמנים פרופורציונלית למשך השמע — נדרשת לתצוגת ניווט/השמעה
    try { buildWordTimeMapFromDuration(completeText); } catch (e) { console.warn('[v7.3] buildWordTimeMapFromDuration failed:', e); }
}

// =======================================================
// שלב 2 (גרסת צ'אנקים): תמלול מבוסס-זמן — כיסוי מובטח
// =======================================================
/**
 * performChunkedTranscription — מחלק את ההקלטה לטווחי-זמן ומתמלל כל אחד עצמאית.
 * עיקרון: למודל אסור לדלג, כי כל קריאה מקובעת לטווח זמן ספציפי.
 * שיטה כפולה לחיתוך:
 *   (א) videoMetadata עם startOffset/endOffset (אם המודל תומך)
 *   (ב) הוראת prompt מפורשת בסגנון "תמלל רק מ-X עד Y" (גיבוי תמיד)
 */
async function performChunkedTranscription(apiKey, anchors, statusText) {
    const mainModel = document.getElementById('geminiModel').value;
    const rawTextArea = document.getElementById('rawTranscript');

    let chunks = planChunks();
    if (chunks.length === 0) throw new Error("לא ניתן לחלק את ההקלטה לצ'אנקים — בדוק את משך השמע.");

    // *** v6 SHIFT: מצריכים קובץ-מקור מקומי (לא YouTube) כדי לחתוך באודיו ***
    if (currentSourceType !== 'file') {
        throw new Error("מצב צ'אנקים אמיתי דורש קובץ אודיו מקומי. ל-YouTube — בחר 'קובץ שלם' במצב כיסוי.");
    }
    const sourceFile = document.getElementById('audioFile').files[0];
    if (!sourceFile) throw new Error("לא נמצא קובץ אודיו לחיתוך.");

    // פעם אחת בלבד — מפענחים את הקובץ
    if (statusText) statusText.innerText = '🎵 מפענח את האודיו (פעם אחת)...';
    const decoded = await decodeAudioFile(sourceFile);

    // v7.7: יישור גבולות צ'אנקים לשתיקות (אם פעיל)
    if (document.getElementById('optSilenceAlign')?.checked && chunks.length > 1) {
        if (statusText) statusText.innerText = '🔍 מאתר שתיקות לחיתוך אופטימלי...';
        try {
            chunks = alignChunkBoundariesToSilences(chunks, decoded, 30);
        } catch (e) { console.warn('[v7.7] silence alignment failed:', e); }
    }

    chunkResults = chunks.map((c, i) => ({
        index: i, startSec: c.startSec, endSec: c.endSec,
        text: '', status: 'pending',
        words: 0, expectedWords: Math.round(((c.endSec - c.startSec) / 60) * 130)
    }));
    renderChunksTable(chunks);

    // הגנה: אם קובץ ארוך והפענוח עלול להעמיס זיכרון, נציג אזהרה אך לא נעצור
    const memMB = (decoded.length * decoded.numberOfChannels * 4) / (1024 * 1024);
    if (memMB > 800) console.warn('[v6] Decoded buffer is large:', memMB.toFixed(0), 'MB');

    const systemPrompt = buildTranscriptionSystemPrompt(anchors, false); // לא צריך עכשיו פתיח-צ'אנק כי הקובץ עצמו חתוך
    const baseUserPrompt =
        "תמלל את כל קטע השמע המצורף, מהתחלה ועד סוף. הקטע הזה הוא חלק מהקלטת שיעור גדולה יותר, אבל אתה מקבל אך ורק את החלק הזה — תמלל אותו במלואו, ללא דילוגים.\n" +
        "**אנטי-לולאה:** אם לא ברור — [לא ברור] והמשך. **אנטי-הזיה:** רק עברית/ארמית/יידיש מהשמע. אין אנגלית. אין פרסומות.";
    // v7.7: hooks לבניית user-prompt דינמי לפי context
    const useContextBetweenChunks = document.getElementById('optChunkContext')?.checked;

    // עיבוד צ'אנקים סדרתית — מאפשר עצירה אמצעית ובדיקת תקינות
    let mergedText = "";
    rawTextArea.value = "מעבד צ'אנקים...\n";

    for (let i = 0; i < chunks.length; i++) {
        if (pipelineAborted) throw new Error('הצינור נעצר על ידי המשתמש.');

        const c = chunks[i];
        setChunkStatus(i, 'active');
        if (statusText) statusText.innerText = `🔪 צ'אנק ${i + 1}/${chunks.length}: חותך ${formatTimeMS(c.startSec)} → ${formatTimeMS(c.endSec)} ומקודד WAV...`;

        // *** v7: חיתוך + downsample (16kHz מונו) — קובץ ~10× קטן יותר ***
        let chunkSourcePart;
        try {
            const sliced = sliceAudioToMono16kFloat32(decoded, c.startSec, c.endSec);
            const wavBlob = monoFloat32ToWavBlob(sliced);
            if (statusText) statusText.innerText = `📤 צ'אנק ${i + 1}/${chunks.length}: מעלה (${(wavBlob.size/1024/1024).toFixed(1)}MB)...`;
            const uploaded = await uploadAudioBlobToGemini(apiKey, wavBlob, `chunk_${i + 1}`);
            await waitForFileProcessing(apiKey, uploaded.name, statusText);
            chunkSourcePart = { fileData: { mimeType: uploaded.mimeType || 'audio/wav', fileUri: uploaded.uri } };
        } catch (err) {
            if (pipelineAborted) throw err;
            setChunkStatus(i, 'bad');
            chunkResults[i].status = 'bad';
            showError(`צ'אנק ${i + 1}: כישלון בחיתוך/העלאה — ${err.message}.`);
            continue;
        }

        if (statusText) statusText.innerText = `📝 צ'אנק ${i + 1}/${chunks.length}: מתמלל...`;

        // v7.7: בניית user prompt מותאם — עם הקשר מהצ'אנק הקודם אם פעיל
        let chunkUserPrompt = baseUserPrompt;
        if (useContextBetweenChunks && i > 0) {
            const prevText = chunkResults[i - 1].text;
            const contextWords = extractLastNWordsClean(prevText, 200);
            if (contextWords) {
                chunkUserPrompt = `**הקשר רציף מהקטע הקודם — לרקע בלבד, אל תתמלל זאת שוב:**\n"...${contextWords}"\n\n${baseUserPrompt}\n\n**חשוב:** הקטע שאתה מקבל מתחיל לאחר ה"הקשר" לעיל. השתמש בו כדי להבין מי מדובר על מה, ולשמור על עקביות שמות/כינויים.`;
            }
        }

        let chunkText = "";
        let result;
        let attempt = 0;
        let chunkOk = false;
        // v8.3: מנגנון anti-stuck — fallback אוטומטי למודל יציב כשהראשי נכשל בעומס
        let currentChunkModel = mainModel;
        let fallbackStage = 0; // 0=ראשי, 1=gemini-2.5-pro, 2=gemini-2.5-flash
        const maxAttemptsPerModel = 4;
        while (attempt < maxAttemptsPerModel && !chunkOk) {
            attempt++;
            try {
                result = await callGeminiAPIStreaming(apiKey, currentChunkModel, systemPrompt, chunkSourcePart, chunkUserPrompt,
                    (liveText) => {
                        chunkText = liveText;
                        rawTextArea.value = mergedText + (mergedText ? '\n\n' : '') + chunkText;
                        updateQualityDashboard();
                    });
            } catch (err) {
                if (pipelineAborted) throw err;
                // v8.3: זיהוי שגיאות שרת (5xx)
                const isServerOverload = /עמוסים|500|503|overloaded|UNAVAILABLE|Internal/i.test(err.message);
                // אחרי 2 כשלי-עומס על המודל הנוכחי — מעבר אוטומטי למודל גיבוי יציב
                if (isServerOverload && attempt >= 2 && fallbackStage < 2) {
                    fallbackStage++;
                    currentChunkModel = fallbackStage === 1 ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
                    attempt = 0; // איפוס תקציב הניסיונות למודל החדש
                    if (statusText) statusText.innerText = `🔄 צ'אנק ${i + 1}: המודל ${mainModel} עמוס — עובר אוטומטית ל-${currentChunkModel}...`;
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                if (attempt < maxAttemptsPerModel) {
                    // backoff: 2s, 4s, 8s — נותן לשרת זמן להתאושש
                    const waitMs = isServerOverload ? Math.min(15000, 2000 * Math.pow(2, attempt - 1)) : 1500;
                    if (statusText) statusText.innerText = `⏳ צ'אנק ${i + 1} (${currentChunkModel}): ${err.message} — ממתין ${Math.round(waitMs/1000)}ש' (${attempt + 1}/${maxAttemptsPerModel})...`;
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                }
                // כל הניסיונות נכשלו — כולל מודלי הגיבוי
                setChunkStatus(i, 'bad');
                chunkResults[i].status = 'bad';
                chunkResults[i].failReason = err.message;
                chunkText = `[צ'אנק ${i + 1} נכשל: ${err.message}]`;
                // v8.3: אם המשתמש ביקש "עצור בכישלון" — עוצרים כאן, לא משאירים חור
                if (document.getElementById('optStopOnChunkFail')?.checked) {
                    rawTextArea.value = mergedText;
                    chunkResults[i].text = chunkText;
                    throw new Error(`צ'אנק ${i + 1} נכשל אחרי כל הניסיונות (כולל מודלי גיבוי 2.5-pro ו-2.5-flash): ${err.message}\n\nהצינור נעצר לבקשתך כדי לא להשאיר חור באמצע. מה שתומלל עד צ'אנק ${i} נשמר. אפשרויות: (1) המתן 5-10 דקות ולחץ "התחל" שוב, (2) בטל את "עצור בכישלון צ'אנק" — אז יסומנו הפגומים וכפתור "נסה שוב" יופיע בסוף.`);
                }
                showError(`צ'אנק ${i + 1} נכשל (גם מודלי הגיבוי 2.5-pro/2.5-flash): ${err.message} — סומן. בסוף יופיע כפתור "🔧 נסה שוב צ'אנקים שנכשלו".`);
                break;
            }

            // בדוק תוצאה
            if (result.finishReason === 'USER_ABORTED') {
                throw new Error('הצינור נעצר על ידי המשתמש.');
            } else if (result.finishReason === 'HALLUCINATION_DETECTED') {
                showHallucinationAlert(`צ'אנק ${i + 1}: ${result.reason}`);
                if (attempt >= 2) {
                    setChunkStatus(i, 'bad');
                    chunkResults[i].status = 'bad';
                    chunkText = `[צ'אנק ${i + 1}: זוהתה הזיה - ${result.reason}]`;
                    break;
                }
                chunkText = "";
                continue; // ננסה שוב
            } else if (result.finishReason === 'LOOP_DETECTED') {
                chunkText = trimRepetitionJunk(result.text);
                showLoopAlert(`צ'אנק ${i + 1}: לולאה זוהתה ונוקתה.`);
                chunkOk = true;
            } else if (result.finishReason === 'MAX_TOKENS') {
                // קצה אסימונים — נשמור את מה שיש ונמשיך לצ'אנק הבא
                chunkText = result.text;
                chunkOk = true;
            } else {
                chunkText = result.text;
                chunkOk = true;
            }
        }

        // v7.5: המודל מחזיר זמנים יחסיים לצ'אנק — נמיר לאבסולוטיים מהתחלת ההקלטה
        if (c.startSec > 0) {
            chunkText = offsetTimestamps(chunkText, c.startSec);
        }

        // שמירת תוצאת הצ'אנק
        chunkResults[i].text = chunkText;
        chunkResults[i].words = countWords(stripTimestamps(chunkText));
        setChunkWords(i, chunkResults[i].words, chunkResults[i].expectedWords);

        // קביעת סטטוס לפי כיסוי
        const ratio = chunkResults[i].expectedWords > 0 ?
                      chunkResults[i].words / chunkResults[i].expectedWords : 0;
        if (chunkResults[i].status === 'bad') {
            setChunkStatus(i, 'bad');
        } else if (ratio >= 0.7) {
            setChunkStatus(i, 'done');
            chunkResults[i].status = 'done';
        } else if (ratio >= 0.4) {
            setChunkStatus(i, 'warn');
            chunkResults[i].status = 'warn';
        } else {
            setChunkStatus(i, 'bad');
            chunkResults[i].status = 'bad';
        }

        // v7.2: מיזוג חכם — fuzzy matching עם נרמול עברית, מזהה חפיפות גם בניסוח מעט שונה.
        if (i === 0) {
            mergedText = chunkText;
        } else {
            const mergeResult = smartMergeChunks(mergedText, chunkText);
            mergedText = mergeResult.merged;
            // עדכון ה-UI בלוח הצ'אנקים — מציג כמה מילים חופפות הוסרו
            if (mergeResult.removedWords > 0) {
                const wordsEl = document.getElementById(`chunkWords_${i}`);
                if (wordsEl) {
                    const existing = wordsEl.textContent || '';
                    wordsEl.innerHTML = existing + ` <span title="מילים חופפות שהוסרו במיזוג" class="text-violet-700">⇆ -${mergeResult.removedWords}</span>`;
                }
            } else if (mergeResult.method === 'fallback') {
                const wordsEl = document.getElementById(`chunkWords_${i}`);
                if (wordsEl) {
                    const existing = wordsEl.textContent || '';
                    wordsEl.innerHTML = existing + ` <span title="לא זוהתה חפיפה — חיבור פשוט" class="text-amber-700">⊕</span>`;
                }
            }
        }
        rawTextArea.value = mergedText;
        updateQualityDashboard();

        // עדכון ספירת צ'אנקים שהושלמו
        const completed = chunkResults.filter(r => r.status === 'done' || r.status === 'warn').length;
        document.getElementById('chunksCompletedLabel').textContent = completed;
    }

    rawTextArea.value = mergedText;
    updateQualityDashboard();
    if (!mergedText || mergedText.trim() === "") throw new Error("התמלול בצ'אנקים חזר ריק.");
    // v7.3: בניית מפת זמנים מבוססת-צ'אנקים — נדרשת לתצוגת ניווט/השמעה
    try { buildWordTimeMapFromChunks(); } catch (e) { console.warn('[v7.3] buildWordTimeMapFromChunks failed:', e); }
    // v8.3: אם יש צ'אנקים שנכשלו — הצג כפתור "נסה שוב"
    try { renderRetryButton(); } catch (e) { console.warn('[v8.3] renderRetryButton failed:', e); }
}

// =======================================================
// v7.2: מיזוג חכם בין צ'אנקים — fuzzy matching בעברית
// =======================================================
/**
 * normalizeHebrewWord — מנרמל מילה עברית להשוואה גמישה:
 * מסיר ניקוד, טעמי מקרא, גרשיים, סוגריים, פיסוק. נחוץ כי מודלים שונים
 * (וגם אותו מודל בקריאות שונות) עלולים להוציא את אותה מילה בכתיב מעט שונה.
 */
function normalizeHebrewWord(w) {
    if (!w) return '';
    return w
        .replace(/[֑-ׇ]/g, '')           // ניקוד וטעמים
        .replace(/[״׳"'`]/g, '')                    // גרשיים וגרש (כולל יוניקוד עברי)
        .replace(/[.,;:!?()\[\]{}\-—–…]/g, '')      // סימני פיסוק
        .replace(/\s+/g, '')                         // רווחים בתוך המילה (נדיר)
        .toLowerCase();
}

function tokenizeHebrew(text) {
    return text.split(/\s+/).filter(w => w.length > 0);
}

/**
 * smartMergeChunks — מיזוג חכם בין שני קטעי תמלול עוקבים.
 * הסיבה: ה-API מחזיר טקסט עם וריאציות קלות בין צ'אנקים. השוואת-מחרוזות מדויקת
 * מפספסת חפיפה אמיתית כשיש שינוי בניקוד, גרשיים, או פיסוק.
 *
 * האלגוריתם:
 * 1. נורמליזציה ברמת-מילה (הסרת ניקוד/פיסוק/גרשיים).
 * 2. סורקים אורכי-חפיפה מ-50 עד 4 מילים, וגם נקודות-התחלה שונות בראש הקטע הבא.
 * 3. עבור כל זוג: מחשבים יחס התאמה ברמת-מילה (כולל בונוס לחפיפה חלקית).
 * 4. סף-זיהוי מדורג: ככל שהמקטע ארוך יותר — דורש דמיון נמוך יותר (כי יותר סיגנל).
 * 5. בוחרים את ההתאמה עם הציון הגבוה ביותר (אורך × דמיון).
 * 6. אם נמצאה — חותכים מהקטע הבא רק את מה שאחרי החפיפה.
 * 7. אם לא נמצאה — מצרפים עם מפריד פסקה (פולבק בטוח, בלי איבוד תוכן).
 *
 * מחזיר: { merged: string, removedWords: number, similarity: number, method: 'fuzzy'|'fallback' }
 */
function smartMergeChunks(prevText, nextText, opts = {}) {
    const MIN_OVERLAP = opts.minOverlap || 4;
    const MAX_OVERLAP = opts.maxOverlap || 50;
    const SEARCH_WINDOW = opts.searchWindow || 60; // מילים ראשונות בקטע הבא לסרוק
    const PARTIAL_BONUS = 0.6; // נקודות חלקיות עבור התאמת תת-מחרוזת

    // סף-דמיון מדורג: התאמה קצרה דורשת דיוק גבוה, ארוכה מאפשרת רעש
    const thresholdFor = (n) => {
        if (n <= 5) return 0.90;
        if (n <= 8) return 0.82;
        if (n <= 12) return 0.75;
        if (n <= 18) return 0.68;
        if (n <= 25) return 0.62;
        return 0.55;
    };

    if (!prevText || !prevText.trim()) return { merged: nextText || '', removedWords: 0, similarity: 0, method: 'fallback' };
    if (!nextText || !nextText.trim()) return { merged: prevText, removedWords: 0, similarity: 0, method: 'fallback' };

    const prevWords = tokenizeHebrew(prevText);
    const nextWords = tokenizeHebrew(nextText);

    if (prevWords.length < MIN_OVERLAP || nextWords.length < MIN_OVERLAP) {
        return { merged: prevText + '\n\n' + nextText, removedWords: 0, similarity: 0, method: 'fallback' };
    }

    // נורמליזציה מקדימה — שומרים גם את האינדקסים המקוריים
    const prevNorm = prevWords.map(normalizeHebrewWord);
    const nextNorm = nextWords.map(normalizeHebrewWord);

    // הזנב הרלוונטי של prev (עד MAX_OVERLAP) — נסרוק רק שם
    const tailStart = Math.max(0, prevNorm.length - MAX_OVERLAP);
    const prevTailNorm = prevNorm.slice(tailStart);

    let best = null; // { startInNext, length, matches, similarity, score }

    const maxN = Math.min(MAX_OVERLAP, prevTailNorm.length, nextNorm.length);
    for (let n = maxN; n >= MIN_OVERLAP; n--) {
        const tailWindow = prevTailNorm.slice(-n);
        const threshold = thresholdFor(n);

        const maxStart = Math.min(SEARCH_WINDOW, nextNorm.length - n);
        for (let startInNext = 0; startInNext <= maxStart; startInNext++) {
            const headWindow = nextNorm.slice(startInNext, startInNext + n);

            let matches = 0;
            for (let k = 0; k < n; k++) {
                const a = tailWindow[k];
                const b = headWindow[k];
                if (!a || !b) continue;
                if (a === b) {
                    matches += 1;
                } else if (a.length >= 3 && b.length >= 3 && (a.includes(b) || b.includes(a))) {
                    // התאמת תת-מחרוזת (למשל "אמר" ⊂ "ואמר") — נקודות חלקיות
                    matches += PARTIAL_BONUS;
                }
            }

            const similarity = matches / n;
            if (similarity >= threshold) {
                // ציון מועדף: מקטעים ארוכים עם דמיון גבוה
                const score = similarity * Math.log(n + 1);
                // עדיפות גם לחפיפה מוקדמת בקטע הבא (חפיפה אמיתית בד"כ קרוב להתחלה)
                const positionPenalty = startInNext / Math.max(1, nextNorm.length);
                const adjustedScore = score * (1 - positionPenalty * 0.3);

                if (!best || adjustedScore > best.score) {
                    best = { startInNext, length: n, matches, similarity, score: adjustedScore };
                }
            }
        }

        // אופטימיזציה: אם כבר מצאנו התאמה איכותית באורך גדול — אין טעם להמשיך לחפש קצרות יותר
        if (best && best.length >= 15 && best.similarity >= 0.85) break;
    }

    if (best) {
        // חתוך את הקטע הבא: השלך את התחלתו עד סוף ההתאמה
        const cutAfter = best.startInNext + best.length;
        const remainingWords = nextWords.slice(cutAfter);
        const removedWords = cutAfter;

        if (remainingWords.length === 0) {
            // כל הקטע הבא הוא חפיפה (קורה רק בצ'אנקים זעירים) — לא נוסיף כלום
            return { merged: prevText, removedWords, similarity: best.similarity, method: 'fuzzy' };
        }

        const remainingText = remainingWords.join(' ');
        // שמירה על מבנה פסקאות: אם הקטע הבא התחיל ב"\n\n", שמור על זה
        const sep = /^\s*\n\n/.test(nextText) ? '\n\n' : ' ';
        return { merged: prevText + sep + remainingText, removedWords, similarity: best.similarity, method: 'fuzzy' };
    }

    // לא נמצאה חפיפה אמינה — חיבור פשוט עם הפרדת פסקה. עדיף כפילות מאשר השמטה.
    return { merged: prevText + '\n\n' + nextText, removedWords: 0, similarity: 0, method: 'fallback' };
}

/**
 * stripOverlap — גרסה ישנה (השוואת מחרוזות מדויקת). נשמרת ל-forceContinueTranscription
 * שצריך התנהגות שמרנית יותר. מיזוג בין צ'אנקים משתמש ב-smartMergeChunks.
 */
function stripOverlap(prevText, nextText) {
    if (!prevText || !nextText) return nextText;
    const prevWords = prevText.split(/\s+/).filter(w => w);
    const nextWords = nextText.split(/\s+/).filter(w => w);
    if (prevWords.length < 5 || nextWords.length < 5) return nextText;

    // בודק חפיפה של 30..5 מילים אחרונות → תחילת nextText
    const maxOverlap = Math.min(30, prevWords.length, nextWords.length);
    for (let n = maxOverlap; n >= 5; n--) {
        const tail = prevWords.slice(-n).join(' ');
        const head = nextWords.slice(0, n).join(' ');
        if (tail === head) {
            return nextWords.slice(n).join(' ');
        }
    }
    return nextText;
}

// =======================================================
// שלב 3: ולידציה — מודל מהיר
// =======================================================
async function performParallelValidation(apiKey, rawText, anchors) {
    const fastModel = document.getElementById('geminiFastModel').value;
    const anchorsBlock = anchors && anchors.trim() ? `\n\n--- רשימת העוגנים ---\n${anchors}` : '\n\n(לא בוצע חילוץ עוגנים)';
    // v7.5: שלח טקסט נקי מ-timestamps לולידציה (לא רלוונטיים לבדיקת איות)
    const cleanText = stripTimestamps(rawText);
    const userPrompt = `--- התמלול שהופק ---\n${cleanText}${anchorsBlock}\n\nאנא בצע ולידציה בפורמט המובנה.`;
    let collected = "";
    await callGeminiAPIStreaming(apiKey, fastModel, PARALLEL_VALIDATION_PROMPT, currentSourcePart,
        userPrompt,
        (liveText) => { collected = liveText; updateTextWithSmartScroll('validationTextarea', liveText); },
        { maxOutputTokens: 2000 }
    );
    return collected;
}

// =======================================================
// שלב 4: עריכה — מודל ראשי
// =======================================================
async function startEditing() {
    hideError();
    const provider = getTextProvider();
    const rawText = document.getElementById('rawTranscript').value.trim();
    if (!rawText) { showError('אין טקסט גולמי לעריכה.'); return; }

    // v9 שלב ג': אם יש צ'אנקים של עריכת-טקסט — נתב לעריכת-צ'אנקים
    if (typeof currentWorkMode !== 'undefined' && currentWorkMode === 'text'
        && typeof textEditChunks !== 'undefined' && textEditChunks.length > 1) {
        return runChunkedTextEditing();
    }

    // v7.6: בניית פרומפט לפי slider 5 רמות + סגנון נבחר
    const intensityLevel = parseInt(document.getElementById('editIntensity')?.value || '2', 10);
    const profile = EDIT_INTENSITY_PROFILES[intensityLevel] || EDIT_INTENSITY_PROFILES[2];
    const styleKey = document.querySelector('input[name="editStyle"]:checked')?.value || 'yeshivish';
    const styleAddon = EDIT_STYLE_ADDONS[styleKey] || '';

    let systemPrompt = profile.prompt + styleAddon;

    // תוספות-פלט (לא משפיעות על שימור התוכן עצמו)
    const isStructured = document.getElementById('optStructuredMode')?.checked === true;
    if (isStructured) {
        systemPrompt += '\n\n**מבנה:** הוסף כותרת ראשית (#) המתארת את נושא השיעור, וכותרות משנה (**) לפני שינוי נושא משמעותי. בלי "תמצית:".';
    }

    const ruleList = [];
    if (document.getElementById('optShortParagraphs')?.checked) {
        ruleList.push("חלק לפסקאות לפי גבולות-נושא טבעיים (לא לפי ספירת משפטים) — בלי לאחד או להשמיט תוכן.");
    }
    if (document.getElementById('optNiqqudVerses')?.checked) ruleList.push("הוסף ניקוד מלא ומדויק רק למילים שהן ציטוט מפורש מפסוקי תנ\"ך. אל תנקד טקסט אחר.");
    if (document.getElementById('optCitationsParens')?.checked) ruleList.push("עטוף בסוגריים עגולים את כל מראי המקומות, לדוגמה: (ברכות ה ע\"א).");
    if (document.getElementById('optMarkAmbiguous')?.checked) ruleList.push("סמן מילים מעורפלות או שיש בהן ספק בעטיפה: [ספק: המילה].");
    if (document.getElementById('optPreserveTimestamps')?.checked) {
        ruleList.push('שמור על *כל* סימוני הזמן [MM:SS] שמופיעים בטקסט — הם נחוצים לניווט. אל תסיר ואל תזיז אותם.');
    }
    if (ruleList.length > 0) systemPrompt += "\n\n**תוספות-פלט:**\n" + ruleList.map((r, i) => `${i + 1}. ${r}`).join('\n');

    // מגבלת אורך אופציונלית — רק אם המשתמש סימן ובמצב 3+
    const limitLength = document.getElementById('optLengthLimit')?.checked && intensityLevel >= 3;
    if (limitLength) {
        const maxW = parseInt(document.getElementById('optMaxWords')?.value || '0', 10);
        if (maxW > 100) {
            systemPrompt += `\n\n**מגבלת אורך:** המשתמש ביקש פלט של עד ~${maxW} מילים. שאף לזה — אבל אל תקרע תוכן ענייני. אם הגולמי דורש יותר — עדיף לחרוג מאשר להשמיט פלוגתא או הלכה.`;
        }
    }

    if (extractedAnchors && extractedAnchors.trim()) systemPrompt += `\n\n**מילון עוגנים מוסמך (לכתיב נכון בלבד):**\n${extractedAnchors}`;
    if (validationReport && validationReport.trim()) systemPrompt += `\n\n**דוח ולידציה — תיקוני כתיב מומלצים (לא לקצר!):**\n${validationReport}`;
    const userCustomEdit = document.getElementById('customEditPrompt').value.trim();
    if (userCustomEdit) systemPrompt += `\n\n**הנחיות מיוחדות מהמשתמש:**\n${userCustomEdit}`;

    // תזכורת אחרונה — מותאמת לרמת העוצמה
    const targetPct = `${Math.round(profile.targetMin * 100)}%-${Math.round(profile.targetMax * 100)}%`;
    systemPrompt += `\n\n**תזכורת אחרונה לפני הפלט:** רמת העריכה — ${profile.name}. אורך מצופה: ${targetPct} ממספר המילים בגולמי. הצלחה = פלט בטווח הזה, עם כל התוכן הענייני נשמר.`;

    setInputsDisabledState(true);
    // איפוס מצב עצירה — קריטי כדי שעריכה תרוץ גם אחרי עצירה קודמת
    resetAbortState();
    document.getElementById('stopEditBtn').disabled = false;
    document.getElementById('stopEditBtn').textContent = '⏹️ עצור עריכה';
    document.getElementById('editStatus').classList.remove('hidden');
    document.getElementById('editDashboard').classList.remove('hidden');
    document.getElementById('verifyFidelityResult').classList.add('hidden');
    activateStageCard('editedTranscriptSection');
    const editedTextArea = document.getElementById('editedTranscript');
    editedTextArea.value = `עורך באמצעות ${provider === 'claude' ? 'Claude' : 'Gemini'}...\n`;
    // אתחול לוח התקדמות העריכה
    const rawWordCount = countWords(rawText);
    updateStat('editStatRawWords', rawWordCount);
    updateStat('editStatEditedWords', 0);
    updateStat('editStatRatio', '0%');
    updateStat('editStatProvider', provider === 'claude' ? '🟠 Claude' : '🔵 Gemini');
    document.getElementById('editProgressBar').style.width = '0%';
    document.getElementById('editProgressLabel').textContent = '0%';
    startTimer('editTimerDisplay');

    try {
        let completeEdit = "";
        let isFinished = false;
        let attempts = 0;
        let currentUserPrompt = "אנא בצע עריכה מתקדמת מלאה לטקסט המצורף.";
        const mainModel = document.getElementById('geminiModel').value;

        while (!isFinished && attempts < 5) {
            attempts++;
            let chunkText = "";
            let result;
            const userInputBlock = `--- הטקסט הגולמי ---\n${rawText}\n\n--- סוף טקסט ---\n\n${currentUserPrompt}`;

            const editChunkHandler = (liveText) => {
                chunkText = liveText;
                updateTextWithSmartScroll('editedTranscript', completeEdit + chunkText);
                updateEditDashboard(rawWordCount, completeEdit + chunkText);
            };
            if (provider === 'claude') {
                result = await callClaudeAPIStreaming(
                    document.getElementById('claudeApiKey').value.trim(),
                    document.getElementById('claudeModel').value,
                    systemPrompt, userInputBlock, editChunkHandler);
            } else {
                // v7.1: maxOutputTokens גבוה מאוד לעריכה — שלא תיחתך בגלל ברירת המחדל.
                // אומדן: לטקסט גולמי באורך 50K-100K תווים, פלט יכול להגיע ל-30K טוקנים.
                result = await callGeminiAPIStreaming(
                    document.getElementById('geminiApiKey').value.trim(),
                    mainModel, systemPrompt, null, userInputBlock, editChunkHandler,
                    { maxOutputTokens: 32000 });
            }

            if (result.finishReason === 'USER_ABORTED') {
                completeEdit += result.text;
                document.getElementById('editedTranscript').value = completeEdit;
                throw new Error('העריכה נעצרה על ידי המשתמש.');
            } else if (result.finishReason === 'HALLUCINATION_DETECTED') {
                // v7.1: אל תזרוק את כל מה שנערך! זיהוי הזיה בעריכה עלול להיות false positive
                // (טקסט תורני עם מילים בארמית/אנגלית-לטינית בציטוט יכול להיראות "זר").
                // נשמור את הטקסט שכבר נצבר וננסה להמשיך מנקודה תקינה.
                showHallucinationAlert((result.reason || 'תוכן חשוד זוהה במהלך העריכה') + ' — נשמר מה שכבר נערך.');
                if (attempts >= 3) {
                    // אחרי 3 ניסיונות — שומרים מה שיש ועוצרים בלי לזרוק את התוכן הקיים
                    completeEdit += result.text;
                    isFinished = true;
                    break;
                }
                // נשמור את החלק התקין של result.text (לפי מצב) ונמשיך
                completeEdit += result.text;
                currentUserPrompt = `המשך לערוך את הטקסט המקורי בלבד מהנקודה הזו: "${completeEdit.slice(-300)}". הקפד על עברית/ארמית מהמקור, בלי תוכן זר. שמור על *כל* המילים שעדיין לא ערכת.`;
            } else if (result.finishReason === 'LOOP_DETECTED') {
                // v7.1: בעריכה אין סיבה אמיתית "לחתוך" 25% מהטקסט. ה-trimRepetitionJunk מסוכן בעריכה.
                // במקום, נשמור את כל הטקסט (גם אם הוא חוזרני) וננסה להמשיך — המודל יבין מההקשר.
                completeEdit += result.text;
                showLoopAlert(`זוהתה חזרה בעריכה — נשמר התוכן, ממשיך מנקודה זו.`);
                currentUserPrompt = `המילים האחרונות שערכת: "${completeEdit.slice(-300)}". המשך לערוך את הטקסט הגולמי מהנקודה הזו, בלי לחזור על מה שכבר נכתב, בלי להשמיט תוכן, ובלי להתחיל מחדש.`;
            } else if (result.finishReason === 'MAX_TOKENS' || result.finishReason === 'max_tokens') {
                completeEdit += result.text;
                // v7.1: שלח את כל הגולמי שוב + סמן בדיוק היכן ההמשך — לא רק 200 תווים אחרונים
                const lastWords = completeEdit.slice(-400);
                currentUserPrompt = `המשך עריכה — אתה ממשיך מאותה נקודה בדיוק, לא מתחיל מהתחלה.\n\n**הטקסט הערוך עד כה הסתיים במילים אלה:**\n"...${lastWords}"\n\nהמשך לערוך את שאר הטקסט הגולמי (כל מה שמופיע *אחרי* המילים הללו), עד הסוף. אל תחזור על מה שכבר נכתב. אל תקצר. שמור על כל משפט.`;
            } else {
                completeEdit += result.text;
                isFinished = true;
            }
        }

        document.getElementById('editedTranscript').value = completeEdit;
        stopTimer();
        // v7.1: בדיקת קיצוץ אחרי סיום — מציג אזהרה אם נחתך תוכן משמעותי
        try { showEditPostCheck(rawWordCount, completeEdit); } catch (e) {}
        sendDesktopNotification("העריכה הסתיימה", `הטקסט הערוך מוכן (${provider === 'claude' ? 'Claude' : 'Gemini'}).`);
    } catch (err) {
        stopTimer();
        showError('שגיאה בעריכה:\n' + err.message);
    } finally {
        document.getElementById('editStatus').classList.add('hidden');
        setInputsDisabledState(false);
    }
}

/**
 * stopEditing — עצירה ייעודית של שלב העריכה (משתמשת באותו מנגנון כללי)
 */
function stopEditing() {
    stopPipeline();
    const btn = document.getElementById('stopEditBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ עוצר...'; }
}

/**
 * loadTranscriptFromFile — טעינת קובץ טקסט/Word/HTML לתיבת התמלול הגולמי
 * תומך ב-.txt, .md, .doc/.html (חולץ טקסט מהפסקאות)
 */
async function loadTranscriptFromFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        let extracted = text;
        // אם זה קובץ HTML/DOC — מחלץ טקסט מתוך פסקאות
        if (/\.(doc|docx|html?)$/i.test(file.name) || text.trim().startsWith('<')) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = text;
            // מסיר תוכן של script/style אם קיים
            tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
            // אוסף את הטקסט מכל הפסקאות והכותרות, עם מעבר שורה
            const blocks = [];
            tempDiv.querySelectorAll('p, h1, h2, h3, h4, div').forEach(el => {
                const t = el.textContent.trim();
                if (t && t.length > 2) blocks.push(t);
            });
            extracted = blocks.length > 0 ? blocks.join('\n\n') : tempDiv.textContent.trim();
        }
        document.getElementById('rawTranscript').value = extracted;
        // ודא שהאזור הרלוונטי גלוי
        document.getElementById('rawTranscriptSection').classList.remove('hidden');
        document.getElementById('editingControlsSection').classList.remove('hidden');
        updateQualityDashboard();
        event.target.value = ''; // איפוס לאפשר טעינה חוזרת של אותו קובץ
        alert(`נטענו ${countWords(extracted)} מילים מהקובץ "${file.name}". כעת אפשר ללחוץ "בצע עריכה מתקדמת".`);
    } catch (err) {
        alert('שגיאה בטעינת הקובץ: ' + err.message);
    }
}

/**
 * forceContinueTranscription — לולאת המשך-מאולץ איטרטיבית.
 * מטרה: לרוץ שוב ושוב עד שהיחס בין מילים-בפועל למילים-צפויות יעבור 85%,
 * או עד 5 ניסיונות, או עד שהמשתמש עוצר.
 * זה הפתרון לבאג בו המשתמש לוחץ "המשך מאולץ" ולא קורה כלום ניכר —
 * עכשיו זה ירוץ עד שהוא באמת השלים את הפער.
 */
async function forceContinueTranscription() {
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    const modelName = document.getElementById('geminiModel').value;
    const rawTextArea = document.getElementById('rawTranscript');

    if (!apiKey || !rawTextArea.value.trim() || !currentSourcePart) {
        alert("לא ניתן לבצע המשך מאולץ. ודא שיש מפתח, מקור שמע ותמלול קיים.");
        return;
    }

    // v9.1: אזהרה אם הקובץ ב-Gemini ייתכן שכבר נמחק (Gemini Files API שומר ל-48 שעות)
    if (currentSourcePart.fileData && currentSourcePart.fileData.fileUri && currentSourcePart._uploadedAt) {
        const ageHours = (Date.now() - currentSourcePart._uploadedAt) / (1000 * 60 * 60);
        if (ageHours > 40) {
            if (!confirm('קובץ השמע הועלה ל-Gemini לפני ' + Math.round(ageHours) + ' שעות. ייתכן שהוא נמחק (שמירה עד 48 שעות). להמשיך בכל זאת? אם נכשל - יש להעלות מחדש.')) {
                return;
            }
        }
    }

    const statusEl = document.getElementById('verifyCompleteStatus');
    const actionText = document.getElementById('verifyActionText');
    statusEl.classList.remove('hidden');

    // אפשר עצירה גם כאן — כפתור ה-Stop הראשי משתף את אותו דגל
    resetAbortState();
    const pipelineStatusEl = document.getElementById('pipelineStatus');
    const pipelineStatusText = document.getElementById('pipelineStatusText');
    const pipelineTimer = document.getElementById('pipelineTimer');
    pipelineStatusEl.classList.remove('hidden');
    startTimer('pipelineTimer');
    setInputsDisabledState(true);

    const expectedWords = audioDurationSeconds > 0
        ? Math.round((audioDurationSeconds / 60) * 130) : 0;
    const targetRatio = 0.85;
    const maxIterations = 5;

    const systemPrompt = buildTranscriptionSystemPrompt(extractedAnchors, false);

    let iteration = 0;
    let stoppedReason = '';
    try {
        while (iteration < maxIterations) {
            if (pipelineAborted) { stoppedReason = 'נעצר על ידי המשתמש'; break; }

            iteration++;
            let existingText = rawTextArea.value.trim();
            const currentWords = countWords(existingText);
            const ratioNow = expectedWords > 0 ? currentWords / expectedWords : 1;

            // אם הגענו ליעד הכיסוי — סיום מוקדם
            if (expectedWords > 0 && ratioNow >= targetRatio) {
                stoppedReason = `היעד הושג (${Math.round(ratioNow*100)}% כיסוי).`;
                break;
            }

            actionText.innerText = `המשך מאולץ — ניסיון ${iteration}/${maxIterations}, כיסוי נוכחי: ${Math.round(ratioNow*100)}%`;
            pipelineStatusText.innerText = `⚡ המשך מאולץ ${iteration}/${maxIterations} — כיסוי כעת ${Math.round(ratioNow*100)}%, יעד ${Math.round(targetRatio*100)}%...`;

            const lastWords = existingText.slice(-300);
            const forcePrompt =
                `אתה ממשיך תמלול שנקטע באמצע.\n\n` +
                `**מילים אחרונות שכבר תומללו:**\n"${lastWords}"\n\n` +
                `**משימתך:** האזן שוב לכל ההקלטה, מצא את המקום שאחרי המילים הללו, וכתוב רק את ההמשך — מאותה נקודה ועד סוף ההקלטה.\n` +
                `- אל תחזור על המילים שכבר תומללו.\n` +
                `- אל תכתוב מההתחלה.\n` +
                `- אל תוסיף סיכום או הערות.\n` +
                `- אם הטקסט הסתיים בפועל — כתוב "[סוף ההקלטה]" ועצור.\n` +
                `**אנטי-לולאה:** אם לא ברור — [לא ברור] והמשך. אסור לחזור על אותה מילה/צליל יותר מ-2 פעמים ברצף.`;

            rawTextArea.value = existingText + "\n\n";

            let liveAddition = "";
            let result;
            try {
                result = await callGeminiAPIStreaming(
                    apiKey, modelName, systemPrompt, currentSourcePart, forcePrompt,
                    (liveText) => {
                        liveAddition = liveText;
                        updateTextWithSmartScroll('rawTranscript', existingText + "\n\n" + liveText);
                        updateQualityDashboard();
                    });
            } catch (err) {
                if (pipelineAborted) { stoppedReason = 'נעצר על ידי המשתמש'; break; }
                showError(`ניסיון ${iteration} נכשל: ${err.message}`);
                // אל תפול — נסה איטרציה נוספת
                continue;
            }

            let addition = result.text;
            if (result.finishReason === 'USER_ABORTED') {
                // נשמור את מה שהושג עד כה ונצא
                if (addition && addition.trim().length > 5) {
                    rawTextArea.value = existingText + "\n\n" + addition;
                    updateQualityDashboard();
                }
                stoppedReason = 'נעצר על ידי המשתמש';
                break;
            }

            if (result.finishReason === 'LOOP_DETECTED') {
                addition = trimRepetitionJunk(addition);
                showLoopAlert(`לולאה בהמשך המאולץ ${iteration} — הקטע הפגום הוסר.`);
            } else if (result.finishReason === 'HALLUCINATION_DETECTED') {
                showHallucinationAlert(`ניסיון ${iteration}: ${result.reason || 'תוכן זר'}. מדלג לאיטרציה הבאה.`);
                // אל תוסיף תוכן הזיוני
                continue;
            }

            // האם המודל סימן שזה הסוף?
            const declaredEnd = /\[סוף ההקלטה\]|\[האודיו הסתיים\]|\[שמע לא תקין/.test(addition);

            // אם המילים שהתווספו זניחות — סביר שאין יותר מה לתמלל
            const addedWords = countWords(addition);
            if (addition && addition.trim().length > 5) {
                // כדי להימנע מכפילויות — חתוך חפיפה אם קיימת
                const trimmedAdd = stripOverlap(existingText, addition);
                rawTextArea.value = existingText + "\n\n" + trimmedAdd;
            }
            updateQualityDashboard();
            showQualityVerdict();

            if (declaredEnd) {
                stoppedReason = 'המודל הצהיר שההקלטה הסתיימה.';
                break;
            }
            if (addedWords < 20) {
                // אין כמעט תוספת — סיכוי קטן שעוד איטרציה תעזור
                stoppedReason = `לא נוספו מילים משמעותיות (${addedWords}). ככל הנראה הכיסוי המקסימלי הושג.`;
                break;
            }
        }

        // סיכום
        const finalWords = countWords(rawTextArea.value);
        const finalRatio = expectedWords > 0 ? finalWords / expectedWords : 0;
        const summary = expectedWords > 0
            ? `הסתיים. ${iteration} איטרציות. כיסוי סופי: ${finalWords}/${expectedWords} מילים (${Math.round(finalRatio*100)}%). ${stoppedReason}`
            : `הסתיים. ${iteration} איטרציות. ${stoppedReason}`;
        actionText.innerText = summary;
        pipelineStatusText.innerText = summary;
        showQualityVerdict();
        sendDesktopNotification("ההמשך המאולץ הסתיים", summary);
    } catch (err) {
        showError("שגיאה ב'המשך מאולץ': " + err.message);
    } finally {
        stopTimer();
        statusEl.classList.add('hidden');
        pipelineStatusEl.classList.add('hidden');
        setInputsDisabledState(false);
    }
}

async function startVerifyCompleteness() {
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    const modelName = document.getElementById('geminiModel').value;
    const rawText = document.getElementById('rawTranscript').value.trim();
    if (!apiKey || !rawText || !currentSourcePart) { alert("נדרש מפתח, מקור שמע ותמלול."); return; }

    const statusEl = document.getElementById('verifyCompleteStatus');
    const resultEl = document.getElementById('verifyCompleteResult');
    const actionText = document.getElementById('verifyActionText');
    statusEl.classList.remove('hidden');
    resultEl.classList.remove('hidden');
    document.getElementById('completenessFixContainer').classList.add('hidden');
    actionText.innerText = "משווה תמלול לאודיו...";
    setInputsDisabledState(true);
    resultEl.value = "מנתח...";
    try {
        const prompt = `הנה התמלול:\n\n${rawText}\n\nהאם התמלול מכסה את כל השמע ללא דילוגים?`;
        await callGeminiAPIStreaming(apiKey, modelName, VERIFY_COMPLETENESS_PROMPT, currentSourcePart,
            prompt, (liveText) => updateTextWithSmartScroll('verifyCompleteResult', liveText));
        // אם הדוח מצביע על בעיות, הצג כפתור תיקון
        const finalReport = resultEl.value;
        if (finalReport && !/תמלול מלא ותקין/.test(finalReport) && /חסר|דולג|נחתך|אמצע|התחלה|סוף/.test(finalReport)) {
            document.getElementById('completenessFixContainer').classList.remove('hidden');
        }
        sendDesktopNotification("בדיקת השלמות הסתיימה", "הדוח מוכן.");
    } catch (err) {
        resultEl.value = "שגיאה: " + err.message;
    } finally {
        statusEl.classList.add('hidden');
        setInputsDisabledState(false);
    }
}

// =======================================================
// תיקונים אוטומטיים
// =======================================================

/**
 * renderValidationFixButton — מציג כפתור תיקון רק אם דוח הולידציה זיהה בעיות
 */
function renderValidationFixButton(report) {
    const container = document.getElementById('validationFixContainer');
    if (!report) { container.classList.add('hidden'); return; }
    const hasIssues = /תיקון מוצע|מילה בתמלול|בעייתי|שגוי|מעורפל/i.test(report);
    const isClean = /לא נמצאו אי-בהירויות|התמלול עקבי/i.test(report);
    if (hasIssues && !isClean) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

/**
 * applyValidationFixes — קורא לאותו מודל לבצע את התיקונים שזוהו על התמלול הגולמי
 */
async function applyValidationFixes() {
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    const fastModel = document.getElementById('geminiFastModel').value;
    const rawText = document.getElementById('rawTranscript').value.trim();
    const report = document.getElementById('validationTextarea').value.trim();
    if (!apiKey || !rawText || !report) { alert("נדרש מפתח, תמלול ודוח ולידציה."); return; }

    const statusEl = document.getElementById('applyValidationFixesStatus');
    const btn = document.getElementById('applyValidationFixesBtn');
    statusEl.classList.remove('hidden');
    btn.disabled = true;
    setInputsDisabledState(true);

    const FIX_PROMPT = `אתה מתקן תמלול לפי דוח ולידציה. קיבלת:
א) תמלול גולמי
ב) דוח ולידציה עם רשימת תיקונים מוצעים בפורמט "מילה בתמלול: [X] | תיקון מוצע: [Y]"

המשימה שלך:
1. עבור על התמלול הגולמי והחל את התיקונים מהדוח.
2. שמור על מבנה הטקסט המקורי, חלוקת הפסקאות וכל מילה אחרת — אל תערוך מעבר לתיקונים מהדוח.
3. אל תוסיף הקדמה, הסבר או תוכן באנגלית. החזר רק את התמלול המתוקן.
4. כתוב בעברית בלבד.`;

    const userPrompt = `--- תמלול גולמי ---\n${rawText}\n\n--- דוח ולידציה ---\n${report}\n\nהחל את התיקונים והחזר את התמלול המעודכן.`;

    try {
        let updated = "";
        await callGeminiAPIStreaming(apiKey, fastModel, FIX_PROMPT, null, userPrompt,
            (liveText) => { updated = liveText; updateTextWithSmartScroll('rawTranscript', liveText); updateQualityDashboard(); });
        if (updated && updated.trim().length > rawText.length * 0.5) {
            document.getElementById('rawTranscript').value = updated;
            updateQualityDashboard();
            sendDesktopNotification("התיקונים הוחלו", "התמלול הגולמי עודכן לפי דוח הולידציה.");
            btn.textContent = '✅ התיקונים הוחלו בהצלחה';
        } else {
            alert("לא התקבלה תוצאה תקינה מהמודל.");
        }
    } catch (err) {
        alert("שגיאה בהחלת תיקונים: " + err.message);
    } finally {
        statusEl.classList.add('hidden');
        btn.disabled = false;
        setInputsDisabledState(false);
    }
}

/**
 * fixCompletenessIssues — תיקון חוסרים שזוהו בבדיקת שלמות מעמיקה.
 * מבקש מהמודל להשלים בדיוק את החלקים שהדוח אמר שחסרים, ושוזר אותם בתמלול.
 */
async function fixCompletenessIssues() {
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    const modelName = document.getElementById('geminiModel').value;
    const rawText = document.getElementById('rawTranscript').value.trim();
    const report = document.getElementById('verifyCompleteResult').value.trim();
    if (!apiKey || !rawText || !report || !currentSourcePart) {
        alert("נדרש מפתח, מקור שמע, תמלול ודוח שלמות.");
        return;
    }

    const statusEl = document.getElementById('verifyCompleteStatus');
    const actionText = document.getElementById('verifyActionText');
    const btn = document.getElementById('fixCompletenessBtn');
    statusEl.classList.remove('hidden');
    actionText.innerText = "משלים את החלקים החסרים מהאודיו...";
    btn.disabled = true;
    setInputsDisabledState(true);

    const COMPLETE_FIX_PROMPT = `אתה משלים תמלול חסר. קיבלת:
א) קובץ השמע המקורי
ב) תמלול חלקי של השמע
ג) דוח שמתאר אילו חלקים חסרים בתמלול

המשימה שלך: האזן שוב לקובץ השמע, זהה את החלקים שהדוח אמר שחסרים, ותמלל רק אותם. החזר את הקטעים החסרים בלבד, כל אחד עם תיאור קצר היכן הוא משתלב (למשל: "בתחילת השיעור / באמצע / בסוף").

חוקים:
1. כתוב רק עברית/ארמית/יידיש מהשמע.
2. אל תחזור על מה שכבר קיים בתמלול הקיים.
3. אל תוסיף הקדמות באנגלית.
4. סמן כל קטע משלים בפסקה משלו עם הקדמה "[חסר - מקום: <תיאור>]".
5. אל תיכנס ללולאות חזרה.`;

    const userPrompt = `--- תמלול חלקי קיים ---\n${rawText}\n\n--- דוח שלמות (החלקים שזוהו כחסרים) ---\n${report}\n\nאנא תמלל את החלקים החסרים מהשמע ותחזיר אותם בלבד.`;

    try {
        let additions = "";
        await callGeminiAPIStreaming(apiKey, modelName, COMPLETE_FIX_PROMPT, currentSourcePart, userPrompt,
            (liveText) => { additions = liveText; });
        if (additions && additions.trim().length > 30) {
            const merged = rawText + "\n\n--- השלמות שזוהו כחסרות ---\n\n" + additions.trim();
            document.getElementById('rawTranscript').value = merged;
            updateQualityDashboard();
            showQualityVerdict();
            btn.textContent = '✅ ההשלמות נוספו בסוף התמלול';
            sendDesktopNotification("ההשלמות הסתיימו", "החלקים החסרים נוספו לתמלול.");
        } else {
            alert("לא הוחזרו השלמות משמעותיות.");
        }
    } catch (err) {
        alert("שגיאה בהשלמה: " + err.message);
    } finally {
        statusEl.classList.add('hidden');
        btn.disabled = false;
        setInputsDisabledState(false);
    }
}

/**
 * updateEditDashboard — מעדכן את לוח התקדמות העריכה בזמן אמת
 * v7.1: היעד הוא 100% מהמילים בגולמי (עריכה מינימלית = שמירה מלאה)
 * אם הפלט קצר משמעותית מהגולמי — צביעה אדומה כדי שהמשתמש יראה.
 */
function updateEditDashboard(rawWordCount, currentEditedText) {
    const editedWords = countWords(currentEditedText);
    updateStat('editStatEditedWords', editedWords);
    // יעד = שמירה על כל המילים. ירידה מתחת ל-95% = סימן אזהרה.
    const targetEdited = rawWordCount; // 100%
    const progress = targetEdited > 0 ? Math.min(100, Math.round((editedWords / targetEdited) * 100)) : 0;
    updateStat('editStatRatio', progress + '%');
    const bar = document.getElementById('editProgressBar');
    const label = document.getElementById('editProgressLabel');
    if (bar) bar.style.width = progress + '%';
    if (label) label.textContent = progress + '%';

    // צבע לפי תקינות הכיסוי
    const ratioCard = document.getElementById('editStatRatio')?.parentElement;
    if (ratioCard) {
        ratioCard.classList.remove('quality-good', 'quality-warn', 'quality-bad');
        if (progress >= 95) ratioCard.classList.add('quality-good');
        else if (progress >= 80) ratioCard.classList.add('quality-warn');
        else if (progress > 0) ratioCard.classList.add('quality-bad');
    }
}

/**
 * showEditPostCheck — לאחר סיום עריכה: מציג אזהרה אם נחתך מעבר ליעד של רמת העוצמה
 * v7.6: סף האזהרה תלוי ב-EDIT_INTENSITY_PROFILES (לא קבוע)
 */
function showEditPostCheck(rawWordCount, editedText) {
    const editedWords = countWords(stripTimestamps(editedText));
    if (rawWordCount < 50) return;
    const ratio = editedWords / rawWordCount;
    const lvl = parseInt(document.getElementById('editIntensity')?.value || '2', 10);
    const profile = EDIT_INTENSITY_PROFILES[lvl] || EDIT_INTENSITY_PROFILES[2];
    const minAcceptable = profile.targetMin;
    if (ratio < minAcceptable) {
        const pct = Math.round(ratio * 100);
        const expectedPct = Math.round(minAcceptable * 100);
        const lost = rawWordCount - editedWords;
        showError(`⚠️ <strong>אזהרת קיצוץ:</strong> רמת ${profile.name} צריכה ${expectedPct}%+ מהמקור — בפועל קיבלת ${pct}% בלבד (${editedWords}/${rawWordCount}, חסרות ~${lost} מילים). מומלץ: (1) ירידה לרמה נמוכה יותר, או (2) "🎨 הצג diff" לראות מה הוסר.`);
    }
}

/**
 * onEditIntensityChange — מעדכן את התיאור מתחת ל-slider לפי רמת העוצמה הנבחרת
 */
function onEditIntensityChange() {
    const lvl = parseInt(document.getElementById('editIntensity')?.value || '2', 10);
    const profile = EDIT_INTENSITY_PROFILES[lvl] || EDIT_INTENSITY_PROFILES[2];
    const desc = document.getElementById('editIntensityDescription');
    if (desc) {
        const targetPct = `${Math.round(profile.targetMin * 100)}%-${Math.round(profile.targetMax * 100)}%`;
        desc.innerHTML = `<strong>רמה ${lvl} — ${profile.name}:</strong> ${profile.description} <span class="text-violet-700">(יעד אורך: ${targetPct} מהמקור)</span>`;
    }
}

async function startVerifyFidelity() {
    const provider = getTextProvider();
    const rawText = document.getElementById('rawTranscript').value.trim();
    const editedText = document.getElementById('editedTranscript').value.trim();
    if (!rawText || !editedText) { alert("נדרש תמלול ועריכה."); return; }
    const statusEl = document.getElementById('verifyFidelityStatus');
    const resultEl = document.getElementById('verifyFidelityResult');
    statusEl.classList.remove('hidden');
    resultEl.classList.remove('hidden');
    setInputsDisabledState(true);
    resultEl.value = "מנתח ומעמת...";
    try {
        const userPrompt = `--- טקסט מקורי גולמי ---\n${rawText}\n\n--- טקסט ערוך ---\n${editedText}\n\nבדוק נאמנות.`;
        if (provider === 'claude') {
            await callClaudeAPIStreaming(
                document.getElementById('claudeApiKey').value.trim(),
                document.getElementById('claudeModel').value,
                VERIFY_FIDELITY_PROMPT, userPrompt,
                (liveText) => updateTextWithSmartScroll('verifyFidelityResult', liveText));
        } else {
            // v7.1: השתמש במודל הראשי (לא המהיר) לבדיקת נאמנות — דיוק חשוב יותר ממהירות כאן
            await callGeminiAPIStreaming(
                document.getElementById('geminiApiKey').value.trim(),
                document.getElementById('geminiModel').value,
                VERIFY_FIDELITY_PROMPT, null, userPrompt,
                (liveText) => updateTextWithSmartScroll('verifyFidelityResult', liveText));
        }
        sendDesktopNotification("בדיקת הנאמנות הסתיימה", "דוח מוכן.");
    } catch (err) {
        resultEl.value = "שגיאה: " + err.message;
    } finally {
        statusEl.classList.add('hidden');
        setInputsDisabledState(false);
    }
}

async function uploadFileToGemini(apiKey, file) {
    // אבחון בסיסי לפני העלאה
    if (!apiKey || apiKey.length < 20) {
        throw new Error("מפתח Gemini API חסר או קצר מדי. ודא שהזנת מפתח תקין.");
    }
    if (!file) {
        throw new Error("לא נבחר קובץ להעלאה.");
    }
    if (file.size === 0) {
        throw new Error("הקובץ שנבחר ריק (0 בייטים).");
    }
    // Gemini Files API מאפשר עד 2GB לקובץ
    const maxBytes = 2 * 1024 * 1024 * 1024;
    if (file.size > maxBytes) {
        throw new Error(`הקובץ גדול מדי (${(file.size / (1024*1024*1024)).toFixed(2)}GB). המגבלה היא 2GB.`);
    }

    // קביעת MIME type חכמה — לפי הסיומת אם הדפדפן לא זיהה
    let mimeType = file.type;
    if (!mimeType || mimeType === '') {
        const name = (file.name || '').toLowerCase();
        if (name.endsWith('.mp3')) mimeType = 'audio/mp3';
        else if (name.endsWith('.wav')) mimeType = 'audio/wav';
        else if (name.endsWith('.m4a')) mimeType = 'audio/mp4';
        else if (name.endsWith('.aac')) mimeType = 'audio/aac';
        else if (name.endsWith('.ogg') || name.endsWith('.oga')) mimeType = 'audio/ogg';
        else if (name.endsWith('.flac')) mimeType = 'audio/flac';
        else if (name.endsWith('.opus')) mimeType = 'audio/opus';
        else if (name.endsWith('.webm')) mimeType = 'audio/webm';
        else mimeType = 'audio/mp3';
    }
    // נרמול — Gemini לא מקבל audio/mpeg, רק audio/mp3
    if (mimeType === 'audio/mpeg') mimeType = 'audio/mp3';

    const uploadUrl = buildGeminiUrl('upload/v1beta/files', apiKey);
    // שם קובץ בטוח — בלי תווים בעברית/מיוחדים שעלולים להפיל את ה-header
    const ext = mimeType.split('/')[1] || 'mp3';
    const safeFileName = 'audio_upload_' + Date.now() + '.' + ext;

    let response;
    try {
        response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-Command': 'upload',
                'X-Goog-Upload-File-Name': safeFileName,
                'X-Goog-Upload-Header-Content-Length': file.size.toString(),
                'X-Goog-Upload-Header-Content-Type': mimeType,
                'Content-Type': mimeType
            },
            body: file
        });
    } catch (networkErr) {
        throw new Error("כשל רשת בעת העלאת הקובץ ל-Gemini: " + networkErr.message + ". בדוק חיבור אינטרנט/חומת אש.");
    }

    if (!response.ok) {
        // קריאת התגובה גם כ-JSON וגם כטקסט כדי לא להחמיץ פרטים
        let errMsg = "";
        let rawText = "";
        try { rawText = await response.text(); } catch (e) {}
        if (rawText) {
            try {
                const errData = JSON.parse(rawText);
                errMsg = errData.error?.message || errData.error?.status || "";
            } catch (e) {
                errMsg = rawText.substring(0, 300);
            }
        }
        // הוספת קוד HTTP להודעה
        const httpCode = response.status;
        let hint = "";
        if (httpCode === 400) hint = " (בקשה לא תקינה — ייתכן ש-MIME type של הקובץ לא נתמך)";
        else if (httpCode === 401 || httpCode === 403) hint = " (מפתח API לא מורשה — בדוק שהמפתח תקין ושיש לו גישה ל-Gemini Files API)";
        else if (httpCode === 404) hint = " (כתובת ה-API לא נמצאה)";
        else if (httpCode === 413) hint = " (הקובץ גדול מדי)";
        else if (httpCode === 429) hint = " (חרגת ממכסה — נסה שוב בעוד מספר דקות)";
        else if (httpCode >= 500) hint = " (שגיאת שרת בצד Google — נסה שוב)";
        throw new Error(`שגיאה בהעלאת הקובץ (HTTP ${httpCode})${hint}: ${errMsg || 'אין פירוט'}`);
    }
    const data = await response.json();
    if (!data || !data.file) {
        throw new Error("התגובה מ-Gemini לא הכילה מידע על הקובץ שהועלה.");
    }
    return data.file;
}

async function waitForFileProcessing(apiKey, fileName, statusTextElement) {
    const getUrl = buildGeminiUrl(`v1beta/${fileName}`, apiKey);
    let attempts = 0;
    let consecutiveErrors = 0;
    while (attempts < 150) {
        let response;
        try {
            response = await fetch(getUrl);
        } catch (netErr) {
            // שגיאת רשת זמנית — ננסה שוב עד 3 פעמים רצוף
            consecutiveErrors++;
            if (consecutiveErrors >= 3) {
                throw new Error("כשל רשת מתמשך בבדיקת מצב הקובץ: " + netErr.message);
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
        }
        if (!response.ok) {
            let errMsg = "";
            try {
                const errData = await response.json();
                errMsg = errData.error?.message || "";
            } catch (e) {}
            throw new Error(`שגיאה בבדיקת מצב הקובץ (HTTP ${response.status}): ${errMsg || 'אין פירוט'}`);
        }
        consecutiveErrors = 0;
        const data = await response.json();
        attempts++;
        if (statusTextElement) statusTextElement.innerText = `מעבד שמע... (${attempts}/150)`;
        if (data.state === 'ACTIVE') return true;
        if (data.state === 'FAILED') {
            const reason = data.error?.message || data.state;
            throw new Error("עיבוד הקובץ נכשל בצד Google: " + reason);
        }
        if (!data.state && data.uri) return true;
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    throw new Error("זמן העיבוד פג (יותר מ-7.5 דקות). נסה שוב או העלה קובץ קצר יותר.");
}

// =======================================================
// קריאת Gemini עם תמיכה ב-maxOutputTokens אופציונלי
// =======================================================
async function callGeminiAPIStreaming(apiKey, model, systemInstruction, contentPart, userTextPrompt, onChunkCallback, options = {}) {
    const url = buildGeminiUrl(`v1beta/models/${model}:streamGenerateContent`, apiKey, { alt: 'sse' });
    const parts = [{ text: userTextPrompt }];
    if (contentPart && contentPart.fileData) {
        // אם יש videoMetadata (לטווחי-זמן בצ'אנקים) — הוסף ל-part
        const filePart = { fileData: contentPart.fileData };
        if (contentPart.videoMetadata) {
            filePart.videoMetadata = contentPart.videoMetadata;
        }
        parts.push(filePart);
    }
    else if (contentPart && contentPart.text) parts.push({ text: contentPart.text });

    // בניית generationConfig עם או בלי penalties בהתאם ליכולת המודל
    const buildPayload = (withPenalties) => {
        const generationConfig = {
            temperature: 0.0,
            topK: 32,
            topP: 0.95
        };
        if (options.maxOutputTokens) generationConfig.maxOutputTokens = options.maxOutputTokens;
        if (withPenalties) {
            generationConfig.frequencyPenalty = 0.4;
            generationConfig.presencePenalty = 0.1;
        }
        return {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ parts: parts }],
            generationConfig
        };
    };

    // יצירת AbortController חדש לבקשה הזו — מאפשר עצירה ע"י המשתמש
    currentAbortController = new AbortController();

    const sendRequest = async (withPenalties) => {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildPayload(withPenalties)),
            signal: currentAbortController.signal
        });
    };

    // ניסיון ראשון: עם penalties (אלא אם כבר ידוע שהמודל לא תומך)
    const tryWithPenalties = !modelsWithoutPenaltySupport.has(model);
    let response;
    try {
        response = await sendRequest(tryWithPenalties);
    } catch (e) { throw new Error("החיבור ל-Gemini נותק."); }

    // אם נכשל בגלל Penalty — נסה שוב בלי
    if (!response.ok && tryWithPenalties) {
        let errBody = {};
        try { errBody = await response.json(); } catch (e) {}
        const errMsg = errBody.error?.message || '';
        const isPenaltyError = /penalty|frequencyPenalty|presencePenalty/i.test(errMsg);

        if (isPenaltyError) {
            // המודל לא תומך — שמור במטמון ונסה שוב בלי
            modelsWithoutPenaltySupport.add(model);
            try {
                response = await sendRequest(false);
            } catch (e) { throw new Error("החיבור ל-Gemini נותק."); }
        } else {
            // שגיאה אחרת — זרוק
            if (response.status === 429) throw new Error('מכסת ה-API שלך הסתיימה.');
            if (response.status === 404) throw new Error('המודל ' + model + ' אינו זמין לחשבונך.');
            if (response.status >= 500) throw new Error('שרתי Gemini עמוסים (' + response.status + ').');
            throw new Error(errMsg || 'שגיאת רשת.');
        }
    }

    if (!response.ok) {
        let errorMsg = 'שגיאת רשת.';
        try { const d = await response.json(); errorMsg = d.error?.message || errorMsg; } catch (e) {}
        if (response.status === 429) throw new Error('מכסת ה-API שלך הסתיימה.');
        if (response.status === 404) throw new Error('המודל ' + model + ' אינו זמין לחשבונך.');
        if (response.status >= 500) throw new Error('שרתי Gemini עמוסים (' + response.status + ').');
        // v8.1: זיהוי שגיאות מפתח-API ספציפיות + הצעת פעולה
        if (/API key expired|API key not valid|invalid API key|API_KEY_INVALID/i.test(errorMsg)) {
            throw new Error(`🔑 המפתח לא תקף או פג תוקף.\n\nפתרון מהיר:\n1. גש ל-https://aistudio.google.com/app/apikey\n2. לחץ "Create API key" ובחר **"Create project"** (פרויקט חדש - לא להשתמש בקיים)\n3. העתק את המפתח החדש (מתחיל ב-AIza)\n4. הדבק כאן ולחץ "🔑 בדוק תקינות המפתח"\n\nאם זה עדיין נכשל, החלף את "מודל ראשי" ל-gemini-2.5-pro או gemini-2.5-flash (יציבים יותר ממודלי preview).`);
        }
        if (/PERMISSION_DENIED|permission/i.test(errorMsg)) {
            throw new Error(`🚫 אין הרשאה למודל ${model}.\n\nכנראה שזה מודל preview שלא זמין לחשבונך. החלף ל-gemini-2.5-pro (יציב) או gemini-2.5-flash (מהיר) בהגדרות מודל ראשי.`);
        }
        throw new Error(errorMsg);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let fullText = "";
    let finalFinishReason = null;
    let lastLoopCheckLength = 0;
    let aborted = false;
    let lastUsageMetadata = null;

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const chunks = buffer.split(/(?:\r?\n){2,}/);
            buffer = chunks.pop() || '';
            for (const chunk of chunks) {
                if (!chunk.trim()) continue;
                const lines = chunk.split(/\r?\n/);
                let dataStr = '';
                for (let line of lines) {
                    if (line.startsWith('data: ')) dataStr += line.substring(6);
                    else if (line.startsWith('data:')) dataStr += line.substring(5);
                }
                dataStr = dataStr.trim();
                if (!dataStr || dataStr === '[DONE]') continue;
                try {
                    const data = JSON.parse(dataStr);
                    if (data.promptFeedback?.blockReason) {
                        throw new Error("השרת חסם את התוכן: " + data.promptFeedback.blockReason);
                    }
                    // לכידת usageMetadata האחרון בכל אירוע (Gemini משדר ערך מצטבר)
                    if (data.usageMetadata) lastUsageMetadata = data.usageMetadata;
                    const candidate = data.candidates?.[0];
                    if (candidate) {
                        const textChunk = candidate.content?.parts?.[0]?.text || '';
                        if (textChunk) {
                            fullText += textChunk;
                            onChunkCallback(fullText);
                            if (pipelineAborted) {
                                aborted = true;
                                try { await reader.cancel(); } catch (e) {}
                                return { text: fullText, finishReason: 'USER_ABORTED' };
                            }
                            if (fullText.length - lastLoopCheckLength > 150) {
                                lastLoopCheckLength = fullText.length;
                                if (detectRepetitionLoop(fullText)) {
                                    aborted = true;
                                    try { await reader.cancel(); } catch (e) {}
                                    return { text: fullText, finishReason: 'LOOP_DETECTED' };
                                }
                                const hallucReason = detectHallucination(fullText);
                                if (hallucReason) {
                                    aborted = true;
                                    try { await reader.cancel(); } catch (e) {}
                                    return { text: fullText, finishReason: 'HALLUCINATION_DETECTED', reason: hallucReason };
                                }
                            }
                        }
                        if (candidate.finishReason) finalFinishReason = candidate.finishReason;
                    }
                } catch (e) {
                    if (e.message && e.message.includes("חסם את התוכן")) throw e;
                }
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') return { text: fullText, finishReason: 'USER_ABORTED' };
        if (!aborted) throw e;
    }

    // רישום שימוש בטוקנים בסוף הקריאה — לפי ה-usageMetadata האחרון
    if (lastUsageMetadata) {
        try {
            usageTracker.add(model, lastUsageMetadata.promptTokenCount || 0, lastUsageMetadata.candidatesTokenCount || 0);
        } catch (e) {}
    }

    if (!aborted && detectRepetitionLoop(fullText)) return { text: fullText, finishReason: 'LOOP_DETECTED' };
    const finalHalluc = detectHallucination(fullText);
    if (!aborted && finalHalluc) return { text: fullText, finishReason: 'HALLUCINATION_DETECTED', reason: finalHalluc };
    return { text: fullText, finishReason: finalFinishReason };
}

async function callClaudeAPIStreaming(apiKey, model, systemInstruction, userTextPrompt, onChunkCallback) {
    const url = "https://api.anthropic.com/v1/messages";
    const payload = {
        model: model, max_tokens: 16000, temperature: 0.0, stream: true,
        system: systemInstruction,
        messages: [{ role: "user", content: userTextPrompt }]
    };
    currentAbortController = new AbortController();
    let response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 'x-api-key': apiKey,
                'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify(payload),
            signal: currentAbortController.signal
        });
    } catch (e) {
        if (e.name === 'AbortError') return { text: '', finishReason: 'USER_ABORTED' };
        throw new Error("החיבור ל-Claude נותק.");
    }
    if (!response.ok) {
        let errorMsg = 'שגיאה ב-Claude.';
        try { const d = await response.json(); errorMsg = d.error?.message || errorMsg; } catch (e) {}
        if (response.status === 401) throw new Error("מפתח Anthropic שגוי.");
        if (response.status === 429) throw new Error("חרגת ממכסת Anthropic.");
        if (response.status === 404) throw new Error("מודל Claude '" + model + "' אינו זמין.");
        if (response.status >= 500) throw new Error("שרתי Anthropic עמוסים.");
        throw new Error(errorMsg);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "", fullText = "", finalFinishReason = null, lastLoopCheckLength = 0, aborted = false;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split(/\n\n/);
            buffer = events.pop() || '';
            for (const evt of events) {
                if (!evt.trim()) continue;
                const lines = evt.split(/\r?\n/);
                let dataStr = '';
                for (let line of lines) { if (line.startsWith('data: ')) dataStr = line.substring(6).trim(); }
                if (!dataStr) continue;
                try {
                    const data = JSON.parse(dataStr);
                    if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                        const piece = data.delta.text || '';
                        if (piece) {
                            fullText += piece;
                            onChunkCallback(fullText);
                            if (pipelineAborted) { aborted = true; try { await reader.cancel(); } catch (e) {} return { text: fullText, finishReason: 'USER_ABORTED' }; }
                            if (fullText.length - lastLoopCheckLength > 150) {
                                lastLoopCheckLength = fullText.length;
                                if (detectRepetitionLoop(fullText)) { aborted = true; try { await reader.cancel(); } catch (e) {} return { text: fullText, finishReason: 'LOOP_DETECTED' }; }
                            }
                        }
                    } else if (data.type === 'message_delta' && data.delta?.stop_reason) {
                        finalFinishReason = data.delta.stop_reason;
                    } else if (data.type === 'error') {
                        throw new Error("שגיאת Claude: " + (data.error?.message || JSON.stringify(data.error)));
                    }
                } catch (e) {
                    if (e.message && e.message.startsWith("שגיאת Claude:")) throw e;
                }
            }
        }
    } catch (e) {
        if (e.name === 'AbortError') return { text: fullText, finishReason: 'USER_ABORTED' };
        if (!aborted) throw e;
    }
    if (!aborted && detectRepetitionLoop(fullText)) return { text: fullText, finishReason: 'LOOP_DETECTED' };
    return { text: fullText, finishReason: finalFinishReason };
}


// =======================================================
// v7.4: Diff word-level (LCS) + תצוגה צבעונית
// =======================================================
function wordLevelDiff(oldText, newText) {
    const oldClean = stripTimestamps(oldText);
    const newClean = stripTimestamps(newText);
    const oldWords = oldClean.split(/(\s+)/);
    const newWords = newClean.split(/(\s+)/);
    const oldKeys = oldWords.map(w => /^\s+$/.test(w) ? '\0SP\0' : normalizeHebrewWord(w));
    const newKeys = newWords.map(w => /^\s+$/.test(w) ? '\0SP\0' : normalizeHebrewWord(w));
    const m = oldKeys.length, n = newKeys.length;
    const dp = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldKeys[i - 1] === newKeys[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
            else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
    }
    const ops = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
        if (oldKeys[i - 1] === newKeys[j - 1]) { ops.push({ op: 'keep', text: newWords[j - 1] }); i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) { ops.push({ op: 'remove', text: oldWords[i - 1] }); i--; }
        else { ops.push({ op: 'add', text: newWords[j - 1] }); j--; }
    }
    while (i > 0) { ops.push({ op: 'remove', text: oldWords[i - 1] }); i--; }
    while (j > 0) { ops.push({ op: 'add', text: newWords[j - 1] }); j--; }
    ops.reverse();
    return ops;
}

function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function renderDiffOpsHTML(ops) {
    const out = []; let buffer = null;
    for (const o of ops) {
        if (buffer && buffer.op === o.op) buffer.text += o.text;
        else { if (buffer) out.push(buffer); buffer = { op: o.op, text: o.text }; }
    }
    if (buffer) out.push(buffer);
    return out.map(seg => {
        const safe = escapeHtml(seg.text);
        if (seg.op === 'keep') return `<span class="diff-kept">${safe}</span>`;
        if (seg.op === 'add') return `<span class="diff-added">${safe}</span>`;
        if (seg.op === 'remove') return `<span class="diff-removed">${safe}</span>`;
        return safe;
    }).join('');
}

function renderDiff(ops, targetEl) {
    let kept = 0, added = 0, removed = 0;
    for (const o of ops) {
        if (/^\s+$/.test(o.text)) continue;
        if (o.op === 'keep') kept++;
        else if (o.op === 'add') added++;
        else if (o.op === 'remove') removed++;
    }
    const totalOrig = kept + removed, totalNew = kept + added;
    const retentionPct = totalOrig > 0 ? Math.round((kept / totalOrig) * 100) : 0;
    targetEl.innerHTML = `
        <div class="diff-stats">
            <div class="diff-stat"><span class="diff-stat-dot" style="background:#10b981"></span>נשמר: <strong>${kept}</strong></div>
            <div class="diff-stat"><span class="diff-stat-dot" style="background:#ef4444"></span>הוסר: <strong>${removed}</strong></div>
            <div class="diff-stat"><span class="diff-stat-dot" style="background:#8b5cf6"></span>נוסף: <strong>${added}</strong></div>
            <div class="diff-stat">📊 שמירת תוכן: <strong>${retentionPct}%</strong></div>
            <div class="diff-stat">📏 גולמי ${totalOrig} → ערוך ${totalNew}</div>
        </div>
        <div class="diff-view" dir="rtl">${renderDiffOpsHTML(ops)}</div>
    `;
}

function showEditDiff() {
    const rawText = document.getElementById('rawTranscript').value.trim();
    const editedText = document.getElementById('editedTranscript').value.trim();
    const container = document.getElementById('diffViewContainer');
    if (!container) return;
    if (!rawText || !editedText) {
        container.innerHTML = '<p class="text-sm text-violet-700">נדרשים גם תמלול גולמי וגם תמלול ערוך כדי להציג diff.</p>';
        container.classList.remove('hidden'); return;
    }
    container.classList.remove('hidden');
    container.innerHTML = '<p class="text-sm text-violet-700">⏳ מחשב diff...</p>';
    setTimeout(() => {
        try { const ops = wordLevelDiff(rawText, editedText); renderDiff(ops, container); }
        catch (e) { container.innerHTML = `<p class="text-sm text-red-700">שגיאה ביצירת diff: ${escapeHtml(e.message)}</p>`; }
    }, 30);
}

// =======================================================
// v7.5: ניהול סימוני זמן [MM:SS] בטקסט
// =======================================================
function stripTimestamps(text) {
    if (!text) return '';
    return text.replace(/\s*\[\d{1,3}:\d{2}(?::\d{2})?\]\s*/g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
}

function extractTimestamps(text) {
    const anchors = [];
    const regex = /\[(\d{1,3}):(\d{2})(?::(\d{2}))?\]/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const mm = parseInt(match[1], 10), ss = parseInt(match[2], 10);
        const extraSec = match[3] ? parseInt(match[3], 10) : 0;
        const timeSec = match[3] ? (mm * 3600 + ss * 60 + extraSec) : (mm * 60 + ss);
        anchors.push({ timeSec, charPos: match.index, raw: match[0] });
    }
    return anchors;
}

function offsetTimestamps(text, offsetSec) {
    if (!offsetSec || offsetSec === 0) return text;
    return text.replace(/\[(\d{1,3}):(\d{2})(?::(\d{2}))?\]/g, (full, mm, ss, sss) => {
        const original = sss ? (parseInt(mm) * 3600 + parseInt(ss) * 60 + parseInt(sss)) : (parseInt(mm) * 60 + parseInt(ss));
        const total = original + Math.round(offsetSec);
        const hours = Math.floor(total / 3600), mins = Math.floor((total % 3600) / 60), secs = total % 60;
        if (hours > 0) return `[${hours}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}]`;
        return `[${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}]`;
    });
}

function toggleTimestampsView(whichArea) {
    const ta = document.getElementById(whichArea);
    if (!ta) return;
    const stateKey = '_canonicalWithTs_' + whichArea;
    const isHiding = !ta.dataset.tsHidden;
    if (isHiding) {
        ta[stateKey] = ta.value;
        ta.value = stripTimestamps(ta.value);
        ta.readOnly = true;
        ta.dataset.tsHidden = '1';
        ta.style.background = '#fafaf9';
    } else {
        if (ta[stateKey] !== undefined) ta.value = ta[stateKey];
        ta.readOnly = false;
        delete ta.dataset.tsHidden;
        ta.style.background = 'white';
    }
    const btn = document.getElementById('toggleTs_' + whichArea);
    if (btn) btn.textContent = ta.dataset.tsHidden ? '🕐 הצג סימוני זמן' : '🕐 הסתר סימוני זמן';
}

// =======================================================
// v7.3: hover-to-play
// =======================================================
function setupAudioForNavigation(file) {
    if (!file) return;
    try {
        if (audioBlobUrl) { try { URL.revokeObjectURL(audioBlobUrl); } catch (e) {} }
        audioBlobUrl = URL.createObjectURL(file);
        const player = document.getElementById('navAudioPlayer');
        if (player) { player.src = audioBlobUrl; player.load(); }
        document.getElementById('rawAudioNavBar')?.classList.remove('hidden');
        document.getElementById('editedAudioNavBar')?.classList.remove('hidden');
    } catch (e) { console.warn('[v7.3] setupAudioForNavigation:', e); }
}

function mapWordsUsingAnchors(text, fallbackStartSec, fallbackEndSec) {
    const anchors = extractTimestamps(text);
    const stripped = stripTimestamps(text);
    const words = tokenizeHebrew(stripped);
    const result = [];
    if (words.length === 0) return result;
    if (anchors.length === 0) {
        const perWord = (fallbackEndSec - fallbackStartSec) / words.length;
        for (let i = 0; i < words.length; i++) result.push({ word: words[i], startSec: fallbackStartSec + i * perWord, endSec: fallbackStartSec + (i + 1) * perWord });
        return result;
    }
    const anchorWordPositions = anchors.map(a => {
        const before = text.slice(0, a.charPos);
        const beforeClean = stripTimestamps(before);
        return { timeSec: a.timeSec, wordIdx: tokenizeHebrew(beforeClean).length };
    });
    const first = anchorWordPositions[0];
    const last = anchorWordPositions[anchorWordPositions.length - 1];
    if (first.wordIdx > 0) anchorWordPositions.unshift({ timeSec: fallbackStartSec, wordIdx: 0 });
    if (last.wordIdx < words.length) anchorWordPositions.push({ timeSec: fallbackEndSec, wordIdx: words.length });
    let anchorIdx = 0;
    for (let i = 0; i < words.length; i++) {
        while (anchorIdx < anchorWordPositions.length - 2 && anchorWordPositions[anchorIdx + 1].wordIdx <= i) anchorIdx++;
        const a = anchorWordPositions[anchorIdx];
        const b = anchorWordPositions[anchorIdx + 1];
        const span = Math.max(1, b.wordIdx - a.wordIdx);
        const t = (i - a.wordIdx) / span;
        const startSec = a.timeSec + t * (b.timeSec - a.timeSec);
        const perWord = (b.timeSec - a.timeSec) / span;
        result.push({ word: words[i], startSec, endSec: startSec + perWord });
    }
    return result;
}

function buildWordTimeMapFromChunks() {
    wordTimeMap = [];
    if (!chunkResults || chunkResults.length === 0) return;
    for (const cr of chunkResults) {
        if (!cr.text || !cr.text.trim()) continue;
        const chunkMap = mapWordsUsingAnchors(cr.text, cr.startSec, cr.endSec);
        wordTimeMap.push(...chunkMap);
    }
}

function buildWordTimeMapFromDuration(fullText) {
    wordTimeMap = [];
    if (audioDurationSeconds <= 0) return;
    wordTimeMap = mapWordsUsingAnchors(fullText, 0, audioDurationSeconds);
}

function renderNavigableTranscript(sourceTextareaId, targetDivId) {
    const ta = document.getElementById(sourceTextareaId);
    const target = document.getElementById(targetDivId);
    if (!ta || !target) return;
    const text = stripTimestamps(ta.value);
    target.innerHTML = '';
    const lines = text.split('\n');
    let globalWordIdx = 0;
    lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) target.appendChild(document.createElement('br'));
        if (!line.trim()) { target.appendChild(document.createElement('br')); return; }
        const parts = line.split(/(\s+)/);
        for (const part of parts) {
            if (part === '') continue;
            if (/^\s+$/.test(part)) { target.appendChild(document.createTextNode(part)); continue; }
            if (/^\[\d{1,3}:\d{2}\]$/.test(part)) continue;
            const span = document.createElement('span');
            span.className = 'nav-word';
            span.textContent = part;
            // v7.7: בדיקה אם זה תיוג-דובר — נחיל סגנון מתאים, לא נחבר ל-audio
            const isSpeakerLabel = applySpeakerStyling(span, part);
            if (isSpeakerLabel) {
                target.appendChild(span);
                // לא משייכים ל-wordIdx (זה לא מילה תורנית רגילה)
                continue;
            }
            if (globalWordIdx < wordTimeMap.length) {
                const entry = wordTimeMap[globalWordIdx];
                span.dataset.timeStart = entry.startSec.toFixed(2);
                span.dataset.timeEnd = entry.endSec.toFixed(2);
                span.dataset.wordIdx = globalWordIdx;
                span.title = `${formatTimeMS(entry.startSec)} · לחץ כדי לשמוע`;
                span.addEventListener('click', onNavWordClick);
            } else {
                span.classList.add('unmapped');
                span.title = 'אין מיפוי-זמן (מילה נוספה בעריכה?)';
            }
            target.appendChild(span);
            globalWordIdx++;
        }
    });
}

function onNavWordClick(e) {
    const start = parseFloat(e.currentTarget.dataset.timeStart);
    if (!isFinite(start)) return;
    playFromTime(start, e.currentTarget);
}
// v8.4: ריחוף בוטל — רק לחיצה מפעילה השמעה

function playFromTime(seconds, wordEl) {
    const player = document.getElementById('navAudioPlayer');
    if (!player || !audioBlobUrl) return;
    document.querySelectorAll('.nav-word.playing').forEach(el => el.classList.remove('playing'));
    if (wordEl) wordEl.classList.add('playing');
    try { player.currentTime = Math.max(0, seconds); player.play().catch(() => {}); }
    catch (e) { console.warn('[v7.3] playFromTime:', e); }
}

function toggleNavView(which) {
    const isRaw = which === 'raw';
    const ta = document.getElementById(isRaw ? 'rawTranscript' : 'editedTranscript');
    const div = document.getElementById(isRaw ? 'rawNavView' : 'editedNavView');
    const btnId = isRaw ? 'toggleNavViewBtn' : null;
    if (!ta || !div) return;
    const showingNav = !div.classList.contains('hidden');
    if (showingNav) {
        div.classList.add('hidden');
        ta.classList.remove('hidden');
        if (btnId) { const b = document.getElementById(btnId); if (b) b.textContent = '🔊 תצוגת ניווט (לחיצה=השמעה)'; }
    } else {
        if (wordTimeMap.length === 0) {
            if (chunkResults && chunkResults.length > 0) buildWordTimeMapFromChunks();
            else buildWordTimeMapFromDuration(ta.value);
        }
        if (wordTimeMap.length === 0) { alert("אין מספיק נתונים לתצוגת ניווט. ודא שהתמלול הסתיים ושיש משך-זמן לקובץ."); return; }
        renderNavigableTranscript(isRaw ? 'rawTranscript' : 'editedTranscript', isRaw ? 'rawNavView' : 'editedNavView');
        ta.classList.add('hidden');
        div.classList.remove('hidden');
        if (btnId) { const b = document.getElementById(btnId); if (b) b.textContent = '✏️ חזור לעריכה'; }
    }
}

// v9.1: שדרוג - שימוש ב-Clipboard API מודרני עם fallback ל-execCommand
function copyToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.value !== undefined ? el.value : el.textContent;
    const flashSuccess = () => {
        const orig = el.style.backgroundColor;
        el.style.backgroundColor = '#dbeafe';
        setTimeout(() => { el.style.backgroundColor = orig; }, 300);
    };
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(flashSuccess).catch(() => {
            try { el.select(); document.execCommand('copy'); flashSuccess(); } catch(e) {}
        });
    } else {
        try { el.select(); document.execCommand('copy'); flashSuccess(); } catch(e) {}
    }
}

function downloadWord(elementId, prefixFilename, parseHeadings) {
    // v7.5: הסר timestamps לפני יצירת קובץ Word
    const rawTextWithTs = document.getElementById(elementId).value;
    if (!rawTextWithTs) return alert('אין טקסט להורדה.');
    const rawText = stripTimestamps(rawTextWithTs);
    let originalName = "קובץ_ללא_שם";
    if (currentSourceType === 'youtube') {
        const url = document.getElementById('youtubeUrl').value;
        const m = url.match(/[?&]v=([\w-]+)|youtu\.be\/([\w-]+)/);
        if (m) originalName = "youtube_" + (m[1] || m[2]);
    } else {
        const fileInput = document.getElementById('audioFile');
        if (fileInput.files.length > 0) originalName = fileInput.files[0].name.replace(/\.[^/.]+$/, "");
    }
    const finalFilename = `${prefixFilename}_${originalName}`;
    let htmlContent = '';
    const paragraphs = rawText.split('\n');
    paragraphs.forEach(p => {
        if (!p.trim()) return;
        let processedText = p;
        processedText = processedText.replace(/\[ספק:\s*(.*?)\]/g, '<span style="background-color:#fef3c7; color:#92400e; padding:1px 4px; border-radius:3px;">[ספק: $1]</span>');
        processedText = processedText.replace(/\(([^)]{1,80})\)/g, '<span style="color:#1e40af;">($1)</span>');
        if (parseHeadings && p.trim().startsWith('#')) {
            processedText = processedText.replace(/^#\s*/, '');
            htmlContent += `<h1 style="color:#1e3a8a; font-size:22pt; margin-top:15pt; margin-bottom:10pt; text-align:center;">${processedText}</h1>`;
        } else if (parseHeadings && p.trim().startsWith('תמצית:')) {
            htmlContent += `<p style="margin:0 0 20pt 0; line-height:1.6; font-size:13pt; text-align:right; background-color:#f8f9fa; padding:10pt; border-right:4px solid #3b82f6;"><strong>${processedText}</strong></p>`;
        } else if (parseHeadings && p.includes('**')) {
            processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<h2 style="color:#166534; font-size:16pt; margin-top:16pt; margin-bottom:8pt; text-align:right;">$1</h2>');
            htmlContent += processedText;
        } else {
            htmlContent += `<p style="margin:0 0 10pt 0; line-height:1.6; font-size:12pt; text-align:right;">${processedText}</p>`;
        }
    });
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${finalFilename}</title><style>body { font-family: 'Arial', sans-serif; } @page { size: 21cm 29.7cm; margin: 2cm; }<\/style><\/head><body dir='rtl'>`;
    const sourceHTML = header + htmlContent + "<\/body><\/html>";
    const blob = new Blob(['﻿', sourceHTML], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = finalFilename + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =======================================================
// v7.7: עיבוד אודיו (high-pass + RMS normalization)
// =======================================================

/**
 * applyHighPassFilter — פילטר מעבר-גבוה בעוצמה 1-pole IIR.
 * מסיר תדרים נמוכים: רעמים, ונטילציה, רעש מערכת.
 * נוסחה: y[n] = α * (y[n-1] + x[n] - x[n-1])
 * α נגזר מתדר החיתוך וקצב הדגימה.
 */
function applyHighPassFilter(samples, sampleRate, cutoffHz) {
    if (!cutoffHz || cutoffHz <= 0) return samples;
    const RC = 1.0 / (2 * Math.PI * cutoffHz);
    const dt = 1.0 / sampleRate;
    const alpha = RC / (RC + dt);
    const out = new Float32Array(samples.length);
    out[0] = samples[0];
    for (let i = 1; i < samples.length; i++) {
        out[i] = alpha * (out[i - 1] + samples[i] - samples[i - 1]);
    }
    return out;
}

/**
 * normalizeRMS — מתאם עוצמת קול ל-RMS יעד (default 0.15 ≈ -16dB).
 * מגביל-כפל ל-x8 כדי לא להגביר רעש בהקלטות שקטות מאוד.
 * חוסם clipping בקצה [-1, 1].
 */
function normalizeRMS(samples, targetRMS) {
    let sumSq = 0;
    for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i];
    const rms = Math.sqrt(sumSq / samples.length);
    if (rms < 1e-6) return samples; // שקט מוחלט
    const gain = Math.min(targetRMS / rms, 8.0);
    const out = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        let s = samples[i] * gain;
        if (s > 1) s = 1; else if (s < -1) s = -1;
        out[i] = s;
    }
    return out;
}

// =======================================================
// v7.7: זיהוי שתיקות ויישור גבולות צ'אנקים
// =======================================================

/**
 * findSilencesInBuffer — סורק טווח-זמן ומחזיר רשימת שתיקות (התווך אנרגטי נמוך).
 * משתמש בערוץ 0 של AudioBuffer (כל הערוצים מספיק דומים לזיהוי שקט).
 * @returns [{startSec, endSec, centerSec, durationSec}]
 */
function findSilencesInBuffer(audioBuffer, startSec, endSec, opts = {}) {
    const windowSec = opts.windowSec || 0.05;     // 50ms חלון
    const energyThreshold = opts.threshold || 0.015; // סף RMS נמוך = שקט
    const minSilenceSec = opts.minSilenceSec || 0.4; // 400ms מינימום

    const sampleRate = audioBuffer.sampleRate;
    const data = audioBuffer.getChannelData(0);
    const windowSize = Math.max(1, Math.floor(windowSec * sampleRate));
    const startIdx = Math.max(0, Math.floor(startSec * sampleRate));
    const endIdx = Math.min(data.length, Math.floor(endSec * sampleRate));

    const silences = [];
    let silenceStart = -1;

    for (let i = startIdx; i < endIdx; i += windowSize) {
        const end = Math.min(i + windowSize, endIdx);
        let sumSq = 0;
        for (let j = i; j < end; j++) sumSq += data[j] * data[j];
        const rms = Math.sqrt(sumSq / Math.max(1, end - i));

        if (rms < energyThreshold) {
            if (silenceStart === -1) silenceStart = i;
        } else {
            if (silenceStart !== -1) {
                const dur = (i - silenceStart) / sampleRate;
                if (dur >= minSilenceSec) {
                    silences.push({
                        startSec: silenceStart / sampleRate,
                        endSec: i / sampleRate,
                        centerSec: (silenceStart + i) / (2 * sampleRate),
                        durationSec: dur
                    });
                }
                silenceStart = -1;
            }
        }
    }
    // שתיקת-זנב, אם קיימת
    if (silenceStart !== -1) {
        const dur = (endIdx - silenceStart) / sampleRate;
        if (dur >= minSilenceSec) {
            silences.push({
                startSec: silenceStart / sampleRate,
                endSec: endIdx / sampleRate,
                centerSec: (silenceStart + endIdx) / (2 * sampleRate),
                durationSec: dur
            });
        }
    }
    return silences;
}

/**
 * alignChunkBoundariesToSilences — מזיז את גבולות הצ'אנקים לשתיקות הקרובות.
 * עבור כל גבול בין שני צ'אנקים: מחפש שתיקות בטווח ±searchRangeSec, ומזיז את הגבול לאמצע
 * השתיקה הקרובה ביותר לגבול המקורי. אם אין שתיקה — לא משנה.
 * @returns chunks חדשים (לא משנה את המקורי)
 */

function alignChunkBoundariesToSilences(chunks, audioBuffer, searchRangeSec = 30) {
    if (!chunks || chunks.length <= 1) return chunks;
    const aligned = [{ ...chunks[0] }];
    for (let i = 0; i < chunks.length - 1; i++) {
        const cur = aligned[aligned.length - 1];
        const next = chunks[i + 1];
        const targetBoundary = cur.endSec;
        const searchStart = Math.max(cur.startSec + 60, targetBoundary - searchRangeSec);
        const searchEnd = Math.min(next.endSec - 60, targetBoundary + searchRangeSec);
        if (searchEnd <= searchStart) { aligned.push({ ...next }); continue; }
        const silences = findSilencesInBuffer(audioBuffer, searchStart, searchEnd, { threshold: 0.015, minSilenceSec: 0.4 });
        if (silences.length > 0) {
            let best = silences[0], bestDist = Math.abs(best.centerSec - targetBoundary);
            for (const s of silences) {
                const d = Math.abs(s.centerSec - targetBoundary);
                if (d < bestDist) { bestDist = d; best = s; }
            }
            const newBoundary = best.centerSec;
            aligned[aligned.length - 1] = { ...cur, endSec: newBoundary };
            aligned.push({ ...next, startSec: newBoundary });
        } else {
            aligned.push({ ...next });
        }
    }
    return aligned;
}

function extractLastNWordsClean(text, n) {
    if (!text) return '';
    const cleaned = stripTimestamps(text);
    const words = cleaned.split(/\s+/).filter(w => w.length > 0 && !w.startsWith('['));
    return words.slice(-n).join(' ');
}

function applySpeakerStyling(span, word) {
    const match = word.match(/^\[(שואל|משיב|דובר\s+[א-ה]'?)\s*:?\]?$/);
    if (!match) return false;
    const role = match[1];
    if (role === 'שואל') span.classList.add('speaker-label', 'speaker-asker');
    else if (role === 'משיב') span.classList.add('speaker-label', 'speaker-answerer');
    else if (/דובר\s+א/.test(role)) span.classList.add('speaker-label', 'speaker-a');
    else if (/דובר\s+ב/.test(role)) span.classList.add('speaker-label', 'speaker-b');
    else if (/דובר\s+ג/.test(role)) span.classList.add('speaker-label', 'speaker-c');
    else if (/דובר\s+ד/.test(role)) span.classList.add('speaker-label', 'speaker-d');
    return true;
}

// v8.1: בדיקת תקינות מפתח Gemini API + הצעת פעולה למפתחות פגי-תוקף
async function testGeminiApiKey() {
    const key = document.getElementById('geminiApiKey').value.trim();
    const result = document.getElementById('testKeyResult');
    const btn = document.getElementById('testKeyBtn');
    if (!key) {
        result.className = 'mt-2 text-xs p-2 rounded bg-red-50 text-red-800 border border-red-200';
        result.textContent = '⚠️ הזן מפתח לפני הבדיקה.';
        result.classList.remove('hidden');
        return;
    }
    btn.disabled = true;
    btn.textContent = '⏳ בודק...';
    result.className = 'mt-2 text-xs p-2 rounded bg-blue-50 text-blue-800 border border-blue-200';
    result.textContent = 'בודק את המפתח מול שרתי Google...';
    result.classList.remove('hidden');
    try {
        const url = buildGeminiUrl('v1beta/models', key);
        const resp = await fetch(url);
        const data = await resp.json();
        if (resp.ok && data.models && data.models.length > 0) {
            // המפתח עובד - הצג סטטוס + רשימת מודלים מקוצרת
            const proModels = data.models.filter(m => /pro/i.test(m.name)).map(m => m.name.replace('models/', ''));
            const flashModels = data.models.filter(m => /flash/i.test(m.name)).map(m => m.name.replace('models/', ''));
            result.className = 'mt-2 text-xs p-2 rounded bg-green-50 text-green-900 border border-green-300';
            result.innerHTML = `✅ <strong>המפתח תקין!</strong> זוהו ${data.models.length} מודלים זמינים.<br>` +
                `🎯 Pro: ${proModels.slice(0, 4).join(', ')}${proModels.length > 4 ? '...' : ''}<br>` +
                `⚡ Flash: ${flashModels.slice(0, 4).join(', ')}${flashModels.length > 4 ? '...' : ''}<br>` +
                `<span class="text-green-700">אם התמלול עדיין נכשל — ייתכן שהמודל הראשי שבחרת אינו ברשימה. החלף ל-gemini-2.5-pro או gemini-2.5-flash.</span>`;
        } else {
            // שגיאה - הצג הודעה ספציפית
            const errMsg = data.error?.message || `קוד שגיאה ${resp.status}`;
            let advice = '';
            if (/expired|invalid|API_KEY_INVALID/i.test(errMsg)) {
                advice = '<br><br>💡 <strong>הפתרון:</strong> גש ל-<a href="https://aistudio.google.com/app/apikey" target="_blank" class="underline">AI Studio</a>, לחץ "Create API key", ובחר <strong>"Create project"</strong> (פרויקט חדש - לא הקיים). כל המפתחות באותו פרויקט פגי-תוקף יחד.';
            } else if (/PERMISSION_DENIED/i.test(errMsg)) {
                advice = '<br><br>💡 בדוק שהפעלת את "Generative Language API" בפרויקט שלך ב-Google Cloud Console.';
            } else if (resp.status === 403) {
                advice = '<br><br>💡 ה-API עצמו לא מאופשר בחשבונך. ייתכן בעיה גיאוגרפית או שצריך להפעיל את "Generative Language API".';
            }
            result.className = 'mt-2 text-xs p-2 rounded bg-red-50 text-red-800 border border-red-300';
            result.innerHTML = `❌ <strong>המפתח אינו תקין:</strong> ${errMsg}${advice}`;
        }
    } catch (e) {
        result.className = 'mt-2 text-xs p-2 rounded bg-red-50 text-red-800 border border-red-300';
        result.innerHTML = `❌ שגיאת רשת: ${e.message}<br>בדוק את החיבור לאינטרנט.`;
    } finally {
        btn.disabled = false;
        btn.textContent = '🔑 בדוק תקינות המפתח';
    }
}


// =======================================================
// v8.3: מנגנון anti-stuck — ניסיון חוזר לצ'אנקים שנכשלו
// =======================================================

/**
 * rebuildMergedTranscript — בונה מחדש את התמלול המאוחד מכל chunkResults.
 * נקרא אחרי ניסיון חוזר של צ'אנקים — כדי שהתיקון ישתלב במקומו הנכון.
 */
function rebuildMergedTranscript() {
    let merged = "";
    for (let i = 0; i < chunkResults.length; i++) {
        const t = chunkResults[i].text || '';
        if (!t) continue;
        if (!merged) {
            merged = t;
        } else {
            const r = smartMergeChunks(merged, t);
            merged = r.merged;
        }
    }
    const rawTextArea = document.getElementById('rawTranscript');
    if (rawTextArea) rawTextArea.value = merged;
    updateQualityDashboard();
    try { showQualityVerdict(); } catch (e) {}
    return merged;
}

/**
 * renderRetryButton — מציג/מסתיר את כפתור "נסה שוב" לפי מספר הצ'אנקים שנכשלו.
 */
function renderRetryButton() {
    const container = document.getElementById('retryChunksContainer');
    if (!container) return;
    const badCount = chunkResults.filter(r => r.status === 'bad').length;
    const label = document.getElementById('retryChunksLabel');
    if (badCount > 0) {
        container.classList.remove('hidden');
        if (label) label.textContent = `⚠️ ${badCount} צ'אנקים נכשלו (יש "חורים" בתמלול). שווה לנסות שוב — שרתי Gemini פחות עמוסים בזמנים שונים.`;
    } else {
        container.classList.add('hidden');
    }
}

/**
 * retryFailedChunks — מעבד מחדש רק את הצ'אנקים שנכשלו, וממזג מחדש את הכל.
 * משתמש ב-cachedDecodedBuffer (נשמר מהריצה הקודמת) כדי לא לפענח שוב.
 */
async function retryFailedChunks() {
    const badChunks = chunkResults.filter(r => r.status === 'bad');
    if (badChunks.length === 0) {
        alert('אין צ\'אנקים שנכשלו — הכל תקין!');
        renderRetryButton();
        return;
    }
    const apiKey = document.getElementById('geminiApiKey').value.trim();
    if (!apiKey) { alert('נדרש מפתח Gemini API.'); return; }
    if (!cachedDecodedBuffer) {
        alert('האודיו המפוענח כבר לא בזיכרון. הרץ את התמלול המלא מחדש (התמלול הקיים יישמר אם תעתיק אותו קודם).');
        return;
    }

    const btn = document.getElementById('retryFailedChunksBtn');
    const model = document.getElementById('geminiModel').value;
    const fastModel = document.getElementById('geminiFastModel').value;
    const systemPrompt = buildTranscriptionSystemPrompt(extractedAnchors, false);

    resetAbortState();
    setInputsDisabledState(true);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ מעבד...'; }

    const statusEl = document.getElementById('pipelineStatus');
    const statusText = document.getElementById('pipelineStatusText');
    const rawTextArea = document.getElementById('rawTranscript');
    statusEl.classList.remove('hidden');
    startTimer('pipelineTimer');

    let fixed = 0, stillBad = 0;
    try {
        for (let bi = 0; bi < badChunks.length; bi++) {
            if (pipelineAborted) break;
            const cr = badChunks[bi];
            const i = cr.index;
            setChunkStatus(i, 'active');

            // ניסיון חוזר עם fallback אוטומטי בדיוק כמו בלולאה הראשית
            let chunkText = '';
            let success = false;
            let curModel = model;
            let fbStage = 0;
            let att = 0;
            while (att < 4 && !success) {
                att++;
                try {
                    statusText.innerText = `🔧 ניסיון חוזר צ'אנק ${i + 1} (${curModel}) — ${bi + 1}/${badChunks.length}...`;
                    const sliced = sliceAudioToMono16kFloat32(cachedDecodedBuffer, cr.startSec, cr.endSec);
                    const wavBlob = monoFloat32ToWavBlob(sliced);
                    const uploaded = await uploadAudioBlobToGemini(apiKey, wavBlob, `retry_chunk_${i + 1}`);
                    await waitForFileProcessing(apiKey, uploaded.name, statusText);
                    const chunkSourcePart = { fileData: { mimeType: uploaded.mimeType || 'audio/wav', fileUri: uploaded.uri } };
                    const userPrompt = "תמלל את כל קטע השמע המצורף, מהתחלה ועד סוף, מילה במילה, ללא דילוגים. אם לא ברור — [לא ברור] והמשך. רק עברית/ארמית/יידיש מהשמע.";
                    let liveText = '';
                    const result = await callGeminiAPIStreaming(apiKey, curModel, systemPrompt, chunkSourcePart, userPrompt,
                        (t) => {
                            liveText = t;
                            rawTextArea.value = (rawTextArea.value.split('\n[--- מעבד צ\'אנק')[0]) + `\n[--- מעבד צ'אנק ${i + 1}: ${t.slice(-120)} ---]`;
                        });
                    if (result.finishReason === 'USER_ABORTED') throw new Error('נעצר על ידי המשתמש');
                    if (result.finishReason === 'LOOP_DETECTED') chunkText = trimRepetitionJunk(result.text);
                    else chunkText = result.text;
                    if (chunkText && chunkText.trim().length > 20) { success = true; }
                    else throw new Error('התקבל טקסט ריק או קצר מדי');
                } catch (err) {
                    if (pipelineAborted) break;
                    const isOverload = /עמוסים|500|503|overloaded|UNAVAILABLE|Internal/i.test(err.message);
                    if (isOverload && att >= 2 && fbStage < 2) {
                        fbStage++;
                        curModel = fbStage === 1 ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
                        att = 0;
                        statusText.innerText = `🔄 צ'אנק ${i + 1}: עובר ל-${curModel}...`;
                        await new Promise(r => setTimeout(r, 3000));
                        continue;
                    }
                    if (att < 4) {
                        const waitMs = isOverload ? Math.min(15000, 2000 * Math.pow(2, att - 1)) : 1500;
                        statusText.innerText = `⏳ צ'אנק ${i + 1}: ${err.message} — ממתין ${Math.round(waitMs/1000)}ש'...`;
                        await new Promise(r => setTimeout(r, waitMs));
                        continue;
                    }
                }
            }

            if (success) {
                if (cr.startSec > 0) chunkText = offsetTimestamps(chunkText, cr.startSec);
                cr.text = chunkText;
                cr.words = countWords(stripTimestamps(chunkText));
                const ratio = cr.expectedWords > 0 ? cr.words / cr.expectedWords : 0;
                cr.status = ratio >= 0.7 ? 'done' : (ratio >= 0.4 ? 'warn' : 'bad');
                setChunkStatus(i, cr.status);
                setChunkWords(i, cr.words, cr.expectedWords);
                if (cr.status !== 'bad') fixed++; else stillBad++;
            } else {
                stillBad++;
                setChunkStatus(i, 'bad');
            }
        }

        // מיזוג מחדש של כל הצ'אנקים — התיקונים משתלבים במקומם
        rebuildMergedTranscript();
        try { buildWordTimeMapFromChunks(); } catch (e) {}
        const summary = `🔧 הסתיים: ${fixed} צ'אנקים תוקנו, ${stillBad} עדיין נכשלו.`;
        statusText.innerText = summary;
        sendDesktopNotification('ניסיון חוזר הסתיים', summary);
        if (stillBad > 0) {
            showError(`${stillBad} צ'אנקים עדיין נכשלו. נסה שוב בעוד מספר דקות, או החלף את "מודל ראשי" ל-gemini-2.5-flash.`);
        }
    } catch (err) {
        showError('שגיאה בניסיון חוזר: ' + err.message);
    } finally {
        stopTimer();
        statusEl.classList.add('hidden');
        setInputsDisabledState(false);
        if (btn) { btn.disabled = false; btn.textContent = '🔧 נסה שוב צ\'אנקים שנכשלו'; }
        renderRetryButton();
    }
}


/* ======================================================= */
/* v8.6: כפתור "חזרה למעלה" — הוצא מ-<script> נפרד            */
/* ======================================================= */
// v8.6: הצגת כפתור "חזרה למעלה" בגלילה
window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollTopBtn');
    if (btn) btn.style.display = window.scrollY > 400 ? 'block' : 'none';
});


/* =======================================================
   v9: מבנה טאבים — 4 ארונות כלים
   ======================================================= */
const V9_TABS = ['intake', 'editing', 'sources', 'publish'];
let currentTab = 'intake';

function switchTab(tabName) {
    if (!V9_TABS.includes(tabName)) return;
    currentTab = tabName;
    V9_TABS.forEach(t => {
        const panel = document.getElementById('tab-' + t);
        const btn = document.getElementById('tabBtn-' + t);
        if (panel) panel.classList.toggle('active', t === tabName);
        if (btn) btn.classList.toggle('active', t === tabName);
    });
    // שמירת הטאב הפעיל בפרויקט (לא קריטי — רק נוחות)
    try {
        if (activeProject) {
            activeProject.activeTab = tabName;
            scheduleProjectAutosave();
        }
    } catch (e) {}
    // גלילה רכה לראש האזור
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
}

/* =======================================================
   v9: מערכת פרויקטים — שמירה ב-localStorage
   מבנה: torahApp_projects = { activeId, projects: { id: {...} } }
   ======================================================= */
const PROJECTS_STORAGE_KEY = 'torahApp_projects_v9';
let activeProject = null;          // אובייקט הפרויקט הפעיל
let projectAutosaveTimer = null;   // debounce לשמירה אוטומטית

function genProjectId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function nowISO() { return new Date().toISOString(); }

function formatProjectDate(iso) {
    if (!iso) return '--';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('he-IL') + ' ' +
               d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return iso; }
}

// קריאת כל מאגר הפרויקטים מ-localStorage
function loadProjectsStore() {
    try {
        const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
        if (!raw) return { activeId: null, projects: {} };
        const parsed = JSON.parse(raw);
        if (!parsed.projects) parsed.projects = {};
        return parsed;
    } catch (e) {
        console.warn('שגיאה בקריאת מאגר הפרויקטים:', e);
        return { activeId: null, projects: {} };
    }
}

// כתיבת כל מאגר הפרויקטים ל-localStorage
function saveProjectsStore(store) {
    try {
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(store));
        return true;
    } catch (e) {
        console.warn('שגיאה בשמירת מאגר הפרויקטים:', e);
        // ככל הנראה חריגת מכסה — נודיע למשתמש
        showProjectSaveStatus('error');
        return false;
    }
}

// יצירת אובייקט פרויקט ריק
function createEmptyProject(name) {
    return {
        id: genProjectId(),
        name: name || 'פרויקט חדש',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        activeTab: 'intake',
        // מטא-דאטה
        meta: {
            audioDurationSeconds: 0,
            audioFileName: '',
            rawCoverageRatio: null,
            editCoverageRatio: null
        },
        // תוכן הליבה
        content: {
            rawTranscript: '',
            editedTranscript: '',
            anchors: '',
            validationReport: ''
        },
        // הגדרות עריכה
        editSettings: {
            intensity: 2,
            style: 'yeshivish',
            customEditPrompt: '',
            optStructuredMode: false,
            optShortParagraphs: false,
            optNiqqudVerses: true,
            optCitationsParens: true,
            optMarkAmbiguous: true,
            optPreserveTimestamps: true,
            optLengthLimit: false,
            optMaxWords: ''
        }
    };
}

// איסוף מצב הדף הנוכחי לתוך אובייקט הפרויקט הפעיל
function collectStateIntoActiveProject() {
    if (!activeProject) return;
    const g = id => document.getElementById(id);
    // תוכן
    activeProject.content.rawTranscript = g('rawTranscript') ? g('rawTranscript').value : '';
    activeProject.content.editedTranscript = g('editedTranscript') ? g('editedTranscript').value : '';
    activeProject.content.anchors = g('anchorsTextarea') ? g('anchorsTextarea').value : '';
    activeProject.content.validationReport = g('validationTextarea') ? g('validationTextarea').value : '';
    // מטא-דאטה
    activeProject.meta.audioDurationSeconds = audioDurationSeconds || 0;
    const af = g('audioFile');
    if (af && af.files && af.files[0]) activeProject.meta.audioFileName = af.files[0].name;
    // יחסי כיסוי — מחושבים מהטקסט אם יש משך אודיו
    try {
        if (audioDurationSeconds > 0) {
            const expected = Math.round((audioDurationSeconds / 60) * 130);
            const rawW = countWords(activeProject.content.rawTranscript);
            const edW = countWords(activeProject.content.editedTranscript);
            activeProject.meta.rawCoverageRatio = expected > 0 ? +(rawW / expected).toFixed(3) : null;
            activeProject.meta.editCoverageRatio = rawW > 0 ? +(edW / rawW).toFixed(3) : null;
        }
    } catch (e) {}
    // הגדרות עריכה
    const es = activeProject.editSettings;
    if (g('editIntensity')) es.intensity = parseInt(g('editIntensity').value, 10) || 2;
    const styleEl = document.querySelector('input[name="editStyle"]:checked');
    if (styleEl) es.style = styleEl.value;
    if (g('customEditPrompt')) es.customEditPrompt = g('customEditPrompt').value;
    ['optStructuredMode','optShortParagraphs','optNiqqudVerses','optCitationsParens',
     'optMarkAmbiguous','optPreserveTimestamps','optLengthLimit'].forEach(k => {
        if (g(k)) es[k] = g(k).checked;
    });
    if (g('optMaxWords')) es.optMaxWords = g('optMaxWords').value;
    // v9 שלב ב': איסוף מצב המקורות (מוגדר ב-sefaria.js)
    if (typeof collectSourcesIntoProject === 'function') {
        try { collectSourcesIntoProject(activeProject); } catch (e) { console.warn('collectSourcesIntoProject:', e); }
    }
    // v9 שלב ג': איסוף מצב ההגהה (מוגדר ב-proofing.js)
    if (typeof collectProofingIntoProject === 'function') {
        try { collectProofingIntoProject(activeProject); } catch (e) { console.warn('collectProofingIntoProject:', e); }
    }
    // v9 שלב ד': איסוף הגדרות ההוצאה לאור (מוגדר ב-publishing.js)
    if (typeof collectPublishingIntoProject === 'function') {
        try { collectPublishingIntoProject(activeProject); } catch (e) { console.warn('collectPublishingIntoProject:', e); }
    }
    // v9 שלב ג': מצב העבודה (תמלול / טקסט)
    if (typeof currentWorkMode !== 'undefined') activeProject.workMode = currentWorkMode;
    activeProject.activeTab = currentTab;
    activeProject.updatedAt = nowISO();
}

// החלת אובייקט פרויקט על הדף
function applyProjectToPage(proj) {
    if (!proj) return;
    const g = id => document.getElementById(id);
    // תוכן
    if (g('rawTranscript')) g('rawTranscript').value = proj.content.rawTranscript || '';
    if (g('editedTranscript')) g('editedTranscript').value = proj.content.editedTranscript || '';
    if (g('anchorsTextarea')) g('anchorsTextarea').value = proj.content.anchors || '';
    if (g('validationTextarea')) g('validationTextarea').value = proj.content.validationReport || '';
    // משתנים גלובליים
    extractedAnchors = proj.content.anchors || '';
    validationReport = proj.content.validationReport || '';
    audioDurationSeconds = (proj.meta && proj.meta.audioDurationSeconds) || 0;
    // הגדרות עריכה
    const es = proj.editSettings || {};
    if (g('editIntensity') && es.intensity) g('editIntensity').value = es.intensity;
    if (es.style) {
        const styleEl = document.querySelector('input[name="editStyle"][value="' + es.style + '"]');
        if (styleEl) styleEl.checked = true;
    }
    if (g('customEditPrompt')) g('customEditPrompt').value = es.customEditPrompt || '';
    ['optStructuredMode','optShortParagraphs','optNiqqudVerses','optCitationsParens',
     'optMarkAmbiguous','optPreserveTimestamps','optLengthLimit'].forEach(k => {
        if (g(k) && typeof es[k] === 'boolean') g(k).checked = es[k];
    });
    if (g('optMaxWords')) g('optMaxWords').value = es.optMaxWords || '';
    // רענון תצוגות תלויות
    try { onEditIntensityChange(); } catch (e) {}
    try { if (extractedAnchors) renderAnchorChips(extractedAnchors); } catch (e) {}
    try { updateQualityDashboard(); } catch (e) {}
    // הצגת קטעים שיש בהם תוכן
    try { revealSectionsWithContent(proj); } catch (e) {}
    // v9 שלב ב': החלת מצב המקורות (מוגדר ב-sefaria.js)
    if (typeof applySourcesFromProject === 'function') {
        try { applySourcesFromProject(proj); } catch (e) { console.warn('applySourcesFromProject:', e); }
    }
    // v9 שלב ג': החלת מצב ההגהה (מוגדר ב-proofing.js)
    if (typeof applyProofingFromProject === 'function') {
        try { applyProofingFromProject(proj); } catch (e) { console.warn('applyProofingFromProject:', e); }
    }
    // v9 שלב ד': החלת הגדרות ההוצאה לאור (מוגדר ב-publishing.js)
    if (typeof applyPublishingFromProject === 'function') {
        try { applyPublishingFromProject(proj); } catch (e) { console.warn('applyPublishingFromProject:', e); }
    }
    // v9 שלב ג': החלת מצב העבודה
    if (proj.workMode && typeof switchWorkMode === 'function') {
        try { switchWorkMode(proj.workMode); } catch (e) {}
    }
    // טאב פעיל
    if (proj.activeTab) switchTab(proj.activeTab);
    updateProjectBarUI();
}

// חשיפת קטעי-תוכן אם נטען פרויקט עם תמלול קיים
function revealSectionsWithContent(proj) {
    const show = id => { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); };
    if (proj.content.rawTranscript && proj.content.rawTranscript.trim()) {
        show('rawTranscriptSection');
        show('qualityDashboard');
        show('editingControlsSection');
    }
    if (proj.content.anchors && proj.content.anchors.trim()) show('anchorsSection');
    if (proj.content.validationReport && proj.content.validationReport.trim()) show('validationSection');
    if (proj.content.editedTranscript && proj.content.editedTranscript.trim()) show('editedTranscriptSection');
}

// שמירה אוטומטית עם debounce
function scheduleProjectAutosave() {
    if (projectAutosaveTimer) clearTimeout(projectAutosaveTimer);
    showProjectSaveStatus('saving');
    projectAutosaveTimer = setTimeout(() => {
        commitActiveProject();
    }, 1200);
}

// כתיבת הפרויקט הפעיל למאגר
function commitActiveProject() {
    if (!activeProject) return;
    collectStateIntoActiveProject();
    const store = loadProjectsStore();
    store.projects[activeProject.id] = activeProject;
    store.activeId = activeProject.id;
    if (saveProjectsStore(store)) {
        showProjectSaveStatus('saved');
        updateProjectBarUI();
    }
}

// עדכון אינדיקטור סטטוס שמירה
function showProjectSaveStatus(state) {
    const el = document.getElementById('pbSaveStatus');
    if (!el) return;
    el.classList.remove('saved', 'saving');
    if (state === 'saving') {
        el.textContent = '💾 שומר...';
        el.classList.add('saving');
    } else if (state === 'saved') {
        el.textContent = '✓ נשמר';
        el.classList.add('saved');
    } else if (state === 'error') {
        el.textContent = '⚠️ שמירה נכשלה';
    } else {
        el.textContent = '';
    }
}

// עדכון סרגל הפרויקט (שם, מטא-דאטה)
function updateProjectBarUI() {
    if (!activeProject) return;
    const nameEl = document.getElementById('pbName');
    if (nameEl && nameEl.value !== activeProject.name) {
        nameEl.value = activeProject.name;
    }
    const metaEl = document.getElementById('pbMeta');
    if (metaEl) {
        const m = activeProject.meta || {};
        const parts = [];
        if (m.audioDurationSeconds > 0) parts.push('משך: ' + formatDuration(m.audioDurationSeconds));
        const rawW = countWords(activeProject.content.rawTranscript || '');
        if (rawW > 0) parts.push(rawW.toLocaleString('he-IL') + ' מילים');
        parts.push('עודכן: ' + formatProjectDate(activeProject.updatedAt));
        metaEl.textContent = parts.join(' · ');
    }
}

// יצירת פרויקט חדש
function newProject(promptName) {
    // שמירת הנוכחי לפני מעבר
    if (activeProject) commitActiveProject();
    let name = 'פרויקט חדש';
    if (promptName) {
        const input = prompt('שם הפרויקט החדש:', 'שיעור ' + new Date().toLocaleDateString('he-IL'));
        if (input === null) return; // המשתמש ביטל
        name = input.trim() || name;
    }
    activeProject = createEmptyProject(name);
    const store = loadProjectsStore();
    store.projects[activeProject.id] = activeProject;
    store.activeId = activeProject.id;
    saveProjectsStore(store);
    // ניקוי הדף
    resetPageForNewProject();
    applyProjectToPage(activeProject);
    switchTab('intake');
    showProjectSaveStatus('saved');
}

// ניקוי שדות הדף לפרויקט חדש
function resetPageForNewProject() {
    const g = id => document.getElementById(id);
    ['rawTranscript','editedTranscript','anchorsTextarea','validationTextarea',
     'customEditPrompt','customTranscriptionPrompt','verifyCompleteResult','verifyFidelityResult'].forEach(id => {
        if (g(id)) g(id).value = '';
    });
    extractedAnchors = '';
    validationReport = '';
    audioDurationSeconds = 0;
    chunkResults = [];
    wordTimeMap = [];
    // v9.1: ניקוי audioBlobUrl ו-cachedDecodedBuffer למניעת memory leak ושמע שגוי
    try {
        if (typeof audioBlobUrl !== 'undefined' && audioBlobUrl) {
            URL.revokeObjectURL(audioBlobUrl);
            audioBlobUrl = null;
        }
    } catch(e) {}
    try { if (typeof cachedDecodedBuffer !== 'undefined') cachedDecodedBuffer = null; } catch(e) {}
    const navPlayer = g('navAudioPlayer');
    if (navPlayer) { try { navPlayer.pause(); navPlayer.src = ''; navPlayer.load(); } catch(e) {} }
    ['anchorsSection','rawTranscriptSection','validationSection','editingControlsSection',
     'editedTranscriptSection','qualityDashboard','chunksSection',
     'rawAudioNavBar','editedAudioNavBar'].forEach(id => {
        if (g(id)) g(id).classList.add('hidden');
    });
    const afInfo = g('audioFileInfo');
    if (afInfo) afInfo.innerHTML = '';
    const af = g('audioFile');
    if (af) af.value = '';
}

// v9.1: ניקוי משאבים בסגירת הדף - מונע memory leaks
window.addEventListener('beforeunload', () => {
    try {
        if (typeof audioBlobUrl !== 'undefined' && audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    } catch(e) {}
});

// טעינת פרויקט קיים לפי מזהה
function loadProject(projectId) {
    if (activeProject && activeProject.id === projectId) return;
    if (activeProject) commitActiveProject();
    const store = loadProjectsStore();
    const proj = store.projects[projectId];
    if (!proj) { showError('הפרויקט לא נמצא.'); return; }
    activeProject = proj;
    store.activeId = projectId;
    saveProjectsStore(store);
    resetPageForNewProject();
    applyProjectToPage(activeProject);
    closeProjectsModal();
}

// "שמור כפרויקט חדש" — שכפול המצב הנוכחי לפרויקט חדש
function saveAsNewProject() {
    const input = prompt('שם הפרויקט החדש (העתק של הנוכחי):',
        (activeProject ? activeProject.name : 'פרויקט') + ' — עותק');
    if (input === null) return;
    if (activeProject) collectStateIntoActiveProject();
    const copy = activeProject ? JSON.parse(JSON.stringify(activeProject)) : createEmptyProject();
    copy.id = genProjectId();
    copy.name = input.trim() || 'פרויקט חדש';
    copy.createdAt = nowISO();
    copy.updatedAt = nowISO();
    activeProject = copy;
    const store = loadProjectsStore();
    store.projects[copy.id] = copy;
    store.activeId = copy.id;
    saveProjectsStore(store);
    updateProjectBarUI();
    renderProjectsList();
    showProjectSaveStatus('saved');
    alert('נשמר כפרויקט חדש: ' + copy.name);
}

// מחיקת פרויקט
function deleteProject(projectId) {
    const store = loadProjectsStore();
    const proj = store.projects[projectId];
    if (!proj) return;
    if (!confirm('למחוק את הפרויקט "' + proj.name + '"? פעולה זו אינה הפיכה.')) return;
    delete store.projects[projectId];
    // אם מחקנו את הפעיל — נעבור לאחר או ניצור חדש
    if (store.activeId === projectId) {
        const remaining = Object.keys(store.projects);
        if (remaining.length > 0) {
            store.activeId = remaining[0];
            activeProject = store.projects[remaining[0]];
            saveProjectsStore(store);
            resetPageForNewProject();
            applyProjectToPage(activeProject);
        } else {
            store.activeId = null;
            saveProjectsStore(store);
            activeProject = null;
            newProject(false);
        }
    } else {
        saveProjectsStore(store);
    }
    renderProjectsList();
}

// שינוי שם הפרויקט הפעיל (מתוך הסרגל)
function renameActiveProject(newName) {
    if (!activeProject) return;
    const trimmed = (newName || '').trim();
    if (!trimmed) {
        // החזרת השם הקודם אם ריק
        const nameEl = document.getElementById('pbName');
        if (nameEl) nameEl.value = activeProject.name;
        return;
    }
    activeProject.name = trimmed;
    activeProject.updatedAt = nowISO();
    commitActiveProject();
}

/* --- מודאל ניהול פרויקטים --- */
function openProjectsModal() {
    if (activeProject) commitActiveProject();
    renderProjectsList();
    const m = document.getElementById('projectsModal');
    if (m) m.classList.remove('hidden');
}
function closeProjectsModal() {
    const m = document.getElementById('projectsModal');
    if (m) m.classList.add('hidden');
}
function renderProjectsList() {
    const container = document.getElementById('projectsListContainer');
    if (!container) return;
    const store = loadProjectsStore();
    const ids = Object.keys(store.projects);
    if (ids.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm">אין פרויקטים שמורים עדיין.</p>';
        return;
    }
    // מיון לפי תאריך עדכון, חדש-לישן
    ids.sort((a, b) => {
        const da = store.projects[a].updatedAt || '';
        const db = store.projects[b].updatedAt || '';
        return db.localeCompare(da);
    });
    container.innerHTML = '';
    ids.forEach(id => {
        const p = store.projects[id];
        const isActive = activeProject && activeProject.id === id;
        const rawW = countWords((p.content && p.content.rawTranscript) || '');
        const item = document.createElement('div');
        item.className = 'project-list-item' + (isActive ? ' is-active' : '');
        item.innerHTML =
            '<div class="pli-info">' +
                '<div class="pli-name">' + escapeHtmlV9(p.name) + (isActive ? ' <span style="color:#4338ca;font-size:0.75rem;">● פעיל</span>' : '') + '</div>' +
                '<div class="pli-meta">' +
                    (rawW > 0 ? rawW.toLocaleString('he-IL') + ' מילים · ' : '') +
                    'עודכן ' + formatProjectDate(p.updatedAt) +
                '</div>' +
            '</div>';
        const openBtn = document.createElement('button');
        openBtn.className = 'text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 font-semibold';
        openBtn.textContent = isActive ? 'פעיל' : 'פתח';
        openBtn.disabled = isActive;
        if (isActive) openBtn.style.opacity = '0.5';
        openBtn.onclick = () => loadProject(id);
        const delBtn = document.createElement('button');
        delBtn.className = 'text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 font-semibold';
        delBtn.textContent = '🗑️';
        delBtn.title = 'מחק פרויקט';
        delBtn.setAttribute('aria-label', 'מחק פרויקט'); // v9.1: נגישות
        delBtn.onclick = () => deleteProject(id);
        item.appendChild(openBtn);
        item.appendChild(delBtn);
        container.appendChild(item);
    });
}

function escapeHtmlV9(str) {
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// אתחול מערכת הפרויקטים בטעינת הדף
function initProjectSystem() {
    const store = loadProjectsStore();
    const ids = Object.keys(store.projects);
    if (store.activeId && store.projects[store.activeId]) {
        activeProject = store.projects[store.activeId];
    } else if (ids.length > 0) {
        activeProject = store.projects[ids[0]];
        store.activeId = activeProject.id;
        saveProjectsStore(store);
    } else {
        // אין פרויקטים — יוצרים ראשון אוטומטית, בלי לשאול שם
        activeProject = createEmptyProject('הפרויקט הראשון שלי');
        store.projects[activeProject.id] = activeProject;
        store.activeId = activeProject.id;
        saveProjectsStore(store);
    }
    applyProjectToPage(activeProject);
    updateProjectBarUI();
    showProjectSaveStatus('saved');
}

// חיווט מאזיני-קלט לשמירה אוטומטית
function wireProjectAutosave() {
    const watchIds = [
        'rawTranscript', 'editedTranscript', 'anchorsTextarea', 'validationTextarea',
        'customEditPrompt', 'editIntensity', 'optMaxWords',
        'optStructuredMode', 'optShortParagraphs', 'optNiqqudVerses',
        'optCitationsParens', 'optMarkAmbiguous', 'optPreserveTimestamps', 'optLengthLimit'
    ];
    watchIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const evt = (el.type === 'checkbox' || el.type === 'range' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(evt, () => { if (activeProject) scheduleProjectAutosave(); });
    });
    // רדיו של סגנון עריכה
    document.querySelectorAll('input[name="editStyle"]').forEach(r => {
        r.addEventListener('change', () => { if (activeProject) scheduleProjectAutosave(); });
    });
    // שם הפרויקט (שדה טקסט)
    const nameEl = document.getElementById('pbName');
    if (nameEl) {
        nameEl.addEventListener('blur', () => renameActiveProject(nameEl.value));
        nameEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
        });
    }
}

/* =======================================================
   v9: אתחול — מאזין DOMContentLoaded נוסף
   (נפרד מהמאזין הראשי כדי לא לגעת בקוד הקיים)
   ======================================================= */
document.addEventListener('DOMContentLoaded', () => {
    try { initProjectSystem(); } catch (e) { console.warn('initProjectSystem:', e); }
    try { wireProjectAutosave(); } catch (e) { console.warn('wireProjectAutosave:', e); }
    // סגירת מודאל בלחיצה על הרקע
    const modal = document.getElementById('projectsModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeProjectsModal();
        });
    }
    // ESC לסגירת מודאל
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProjectsModal();
    });
});


/* =======================================================
   v9 שלב ג': מסלול עריכת טקסט קיים + צ'אנקים לעריכה
   ======================================================= */

// מצב העבודה הנוכחי: 'audio' (תמלול) או 'text' (עריכת טקסט קיים)
let currentWorkMode = 'audio';

// סף מילים לחלוקה אוטומטית לצ'אנקים בעריכת טקסט
const TEXT_EDIT_CHUNK_THRESHOLD = 6000;
// יעד גודל צ'אנק (מילים) כשמחלקים
const TEXT_EDIT_CHUNK_TARGET = 4000;

// מצב צ'אנקים של עריכת טקסט: נשמר כדי לאחד בסוף
let textEditChunks = [];   // [{ index, text, startWord, edited, status }]

/* --- בורר מסלול --- */
function switchWorkMode(mode) {
    currentWorkMode = (mode === 'text') ? 'text' : 'audio';
    const audioSections = document.getElementById('audioRouteSections');
    const textPanel = document.getElementById('textRoutePanel');
    if (audioSections) audioSections.classList.toggle('hidden', currentWorkMode === 'text');
    if (textPanel) textPanel.classList.toggle('hidden', currentWorkMode !== 'text');
    // עדכון כרטיסי-הבחירה (הדגשה ויזואלית)
    const cardA = document.getElementById('routeCardAudio');
    const cardT = document.getElementById('routeCardText');
    if (cardA) cardA.classList.toggle('route-card-active', currentWorkMode === 'audio');
    if (cardT) cardT.classList.toggle('route-card-active', currentWorkMode === 'text');
    // v9: עדכון תוויות "תמלול"/"טקסט" בשלבים 2-3 לפי המסלול
    updateModeLabels();
    // שמירה בפרויקט
    if (typeof activeProject !== 'undefined' && activeProject) {
        activeProject.workMode = currentWorkMode;
        if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
    }
}

// v9: מעדכן את כל התוויות עם class="src-mode-label" לפי מצב העבודה.
// במצב 'text' — "התמלול" הופך ל"הטקסט"; במצב 'audio' — חוזר ל"התמלול".
function updateModeLabels() {
    const useText = (typeof currentWorkMode !== 'undefined' && currentWorkMode === 'text');
    const labels = document.querySelectorAll('.src-mode-label');
    labels.forEach(el => {
        const target = useText ? el.getAttribute('data-mode-text') : el.getAttribute('data-mode-edited');
        if (target) el.textContent = target;
    });
}

/* --- טאבים בתוך מסלול הטקסט (הדבקה / קובץ) --- */
function switchTextInputTab(which) {
    // v9 שלב ד': שלושה מקורות — paste / file / image (OCR)
    const panels = {
        paste: document.getElementById('textPastePanel'),
        file: document.getElementById('textFilePanel'),
        image: document.getElementById('textImagePanel')
    };
    const tabs = {
        paste: document.getElementById('textTabPaste'),
        file: document.getElementById('textTabFile'),
        image: document.getElementById('textTabImage')
    };
    const active = (which === 'file' || which === 'image') ? which : 'paste';
    Object.keys(panels).forEach(k => {
        if (panels[k]) panels[k].classList.toggle('hidden', k !== active);
        if (tabs[k]) tabs[k].classList.toggle('active', k === active);
    });
}

/* --- קריאת קובץ Word / טקסט --- */
async function loadTextFileForEditing(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const info = document.getElementById('textFileInfo');
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (info) info.innerHTML = '⏳ קורא את הקובץ <strong>' + escapeHtmlV9(file.name) + '</strong>...';

    try {
        let text = '';
        const lowerName = file.name.toLowerCase();
        if (lowerName.endsWith('.docx')) {
            // המרת .docx באמצעות mammoth.js
            if (typeof mammoth === 'undefined') {
                throw new Error('ספריית mammoth.js לא נטענה. בדוק חיבור אינטרנט ורענן את הדף.');
            }
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            text = result.value || '';
        } else {
            // .txt / .md — קריאה ישירה
            text = await file.text();
        }
        text = text.trim();
        if (!text) {
            throw new Error('הקובץ ריק או לא מכיל טקסט קריא.');
        }
        // הכנסה ל-textarea של ההדבקה (נקודת-הכניסה האחידה)
        const pasteEl = document.getElementById('pastedTextInput');
        if (pasteEl) pasteEl.value = text;
        const wordCount = countWords(text);
        if (info) {
            info.innerHTML = '✓ נקרא <strong>' + escapeHtmlV9(file.name) + '</strong> — ' +
                sizeMB + ' MB, ~' + wordCount.toLocaleString('he-IL') + ' מילים. ' +
                'הטקסט הוכנס לאזור ההדבקה — לחץ "טען לעריכה".';
        }
        updatePastedTextInfo();
    } catch (err) {
        if (info) info.innerHTML = '<span style="color:#b91c1c;">שגיאה: ' + escapeHtmlV9(err.message) + '</span>';
    }
}

/* --- מעקב אחרי גודל הטקסט המודבק --- */
function updatePastedTextInfo() {
    const el = document.getElementById('pastedTextInput');
    const info = document.getElementById('pastedTextInfo');
    const chunkInfo = document.getElementById('textChunkInfo');
    if (!el) return;
    const text = el.value.trim();
    const wordCount = countWords(text);
    if (info) {
        info.textContent = text ? ('~' + wordCount.toLocaleString('he-IL') + ' מילים') : '';
    }
    // אזהרת צ'אנקים אם הטקסט ארוך
    if (chunkInfo) {
        if (wordCount > TEXT_EDIT_CHUNK_THRESHOLD) {
            const estChunks = Math.ceil(wordCount / TEXT_EDIT_CHUNK_TARGET);
            chunkInfo.innerHTML = '🧩 הטקסט ארוך (~' + wordCount.toLocaleString('he-IL') +
                ' מילים). הוא יחולק אוטומטית ל-<strong>' + estChunks +
                ' קטעים</strong> — כל קטע ייערך בנפרד תחת אותן הגדרות, ויאוחד בסוף.';
            chunkInfo.classList.remove('hidden');
        } else {
            chunkInfo.classList.add('hidden');
        }
    }
}

/* --- טעינת הטקסט לאזור העריכה --- */
function loadTextIntoEditor() {
    const pasteEl = document.getElementById('pastedTextInput');
    const text = pasteEl ? pasteEl.value.trim() : '';
    if (!text) {
        showError('אין טקסט לטעינה. הדבק טקסט או העלה קובץ.');
        return;
    }
    // הטקסט נכנס ל-rawTranscript — נקודת-הכניסה האחידה לעריכה
    const rawEl = document.getElementById('rawTranscript');
    if (rawEl) rawEl.value = text;

    // חשיפת קטעי העריכה
    ['rawTranscriptSection', 'editingControlsSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    });
    // עדכון לוח האיכות אם קיים
    try { if (typeof updateQualityDashboard === 'function') updateQualityDashboard(); } catch (e) {}

    // חלוקה לצ'אנקים אם ארוך
    const wordCount = countWords(text);
    textEditChunks = [];
    if (wordCount > TEXT_EDIT_CHUNK_THRESHOLD) {
        textEditChunks = splitTextIntoEditChunks(text);
    }

    // מעבר לטאב העריכה
    if (typeof switchTab === 'function') switchTab('editing');

    // שמירה בפרויקט
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();

    const msg = textEditChunks.length > 1
        ? 'הטקסט נטען וחולק ל-' + textEditChunks.length + ' קטעים. לחץ "בצע עריכה מתקדמת" — כל קטע ייערך תחת אותן הגדרות.'
        : 'הטקסט נטען לעריכה. בחר את הגדרות העריכה ולחץ "בצע עריכה מתקדמת".';
    if (typeof sendDesktopNotification === 'function') {
        sendDesktopNotification('הטקסט נטען', msg);
    }
}

/* --- חלוקת טקסט ארוך לצ'אנקים על גבולות פסקאות --- */
function splitTextIntoEditChunks(text) {
    const chunks = [];
    // חלוקה ראשונית לפסקאות (שורה ריקה = גבול פסקה)
    const paragraphs = text.split(/\n\s*\n/);
    let current = '';
    let currentWords = 0;
    let chunkIndex = 0;
    let wordOffset = 0;

    const flush = () => {
        if (current.trim()) {
            chunks.push({
                index: chunkIndex++,
                text: current.trim(),
                startWord: wordOffset,
                edited: '',
                status: 'pending'
            });
            wordOffset += currentWords;
        }
        current = '';
        currentWords = 0;
    };

    for (const para of paragraphs) {
        const paraWords = countWords(para);
        // אם פסקה בודדת ענקית — היא צ'אנק בפני עצמה
        if (paraWords > TEXT_EDIT_CHUNK_TARGET * 1.5) {
            flush();
            chunks.push({
                index: chunkIndex++,
                text: para.trim(),
                startWord: wordOffset,
                edited: '',
                status: 'pending'
            });
            wordOffset += paraWords;
            continue;
        }
        // אם הוספת הפסקה תחרוג מהיעד — סגור צ'אנק נוכחי
        if (currentWords + paraWords > TEXT_EDIT_CHUNK_TARGET && current.trim()) {
            flush();
        }
        current += (current ? '\n\n' : '') + para;
        currentWords += paraWords;
    }
    flush();
    return chunks;
}

/* --- איחוד הצ'אנקים הערוכים --- */
function mergeEditedChunks() {
    // איחוד פשוט ובטוח: שרשור עם שורה ריקה בין צ'אנקים.
    // כל צ'אנק נערך כיחידה שלמה תחת אותן הגדרות, אז אין חפיפה לנקות.
    const parts = textEditChunks
        .filter(c => c.edited && c.edited.trim())
        .map(c => c.edited.trim());
    return parts.join('\n\n');
}

/* --- אתחול מסלול הטקסט --- */
function initWorkModeRoute() {
    // מאזין לשינוי גודל הטקסט המודבק
    const pasteEl = document.getElementById('pastedTextInput');
    if (pasteEl) {
        pasteEl.addEventListener('input', () => {
            updatePastedTextInfo();
        });
    }
    // ברירת מחדל: מצב אודיו
    switchWorkMode('audio');
}

document.addEventListener('DOMContentLoaded', () => {
    try { initWorkModeRoute(); } catch (e) { console.warn('initWorkModeRoute:', e); }
});


/* =======================================================
   v9 שלב ג': עריכת טקסט בצ'אנקים
   כל צ'אנק נערך תחת אותן הגדרות בדיוק, ואז מאוחד.
   ======================================================= */

// בונה את ה-systemPrompt של העריכה — זהה ללוגיקה ב-startEditing.
// מופרד כדי שעריכת-צ'אנקים תשתמש בדיוק באותן הגדרות.
function buildEditingSystemPrompt() {
    const intensityLevel = parseInt(document.getElementById('editIntensity')?.value || '2', 10);
    const profile = EDIT_INTENSITY_PROFILES[intensityLevel] || EDIT_INTENSITY_PROFILES[2];
    const styleKey = document.querySelector('input[name="editStyle"]:checked')?.value || 'yeshivish';
    const styleAddon = EDIT_STYLE_ADDONS[styleKey] || '';
    let systemPrompt = profile.prompt + styleAddon;

    const isStructured = document.getElementById('optStructuredMode')?.checked === true;
    if (isStructured) {
        systemPrompt += '\n\n**מבנה:** הוסף כותרת ראשית (#) המתארת את נושא השיעור, וכותרות משנה (**) לפני שינוי נושא משמעותי. בלי "תמצית:".';
    }
    const ruleList = [];
    if (document.getElementById('optShortParagraphs')?.checked) {
        ruleList.push('חלק לפסקאות לפי גבולות-נושא טבעיים (לא לפי ספירת משפטים) — בלי לאחד או להשמיט תוכן.');
    }
    if (document.getElementById('optNiqqudVerses')?.checked) ruleList.push('הוסף ניקוד מלא ומדויק רק למילים שהן ציטוט מפורש מפסוקי תנ"ך. אל תנקד טקסט אחר.');
    if (document.getElementById('optCitationsParens')?.checked) ruleList.push('עטוף בסוגריים עגולים את כל מראי המקומות, לדוגמה: (ברכות ה ע"א).');
    if (document.getElementById('optMarkAmbiguous')?.checked) ruleList.push('סמן מילים מעורפלות או שיש בהן ספק בעטיפה: [ספק: המילה].');
    if (document.getElementById('optPreserveTimestamps')?.checked) {
        ruleList.push('שמור על *כל* סימוני הזמן [MM:SS] שמופיעים בטקסט — הם נחוצים לניווט. אל תסיר ואל תזיז אותם.');
    }
    if (ruleList.length > 0) systemPrompt += '\n\n**תוספות-פלט:**\n' + ruleList.map((r, i) => (i + 1) + '. ' + r).join('\n');

    const intensityLevelNum = intensityLevel;
    const limitLength = document.getElementById('optLengthLimit')?.checked && intensityLevelNum >= 3;
    if (limitLength) {
        const maxW = parseInt(document.getElementById('optMaxWords')?.value || '0', 10);
        if (maxW > 100) {
            systemPrompt += '\n\n**מגבלת אורך:** המשתמש ביקש פלט של עד ~' + maxW + ' מילים. שאף לזה — אבל אל תקרע תוכן ענייני.';
        }
    }
    if (typeof extractedAnchors !== 'undefined' && extractedAnchors && extractedAnchors.trim()) {
        systemPrompt += '\n\n**מילון עוגנים מוסמך (לכתיב נכון בלבד):**\n' + extractedAnchors;
    }
    if (typeof validationReport !== 'undefined' && validationReport && validationReport.trim()) {
        systemPrompt += '\n\n**דוח ולידציה — תיקוני כתיב מומלצים (לא לקצר!):**\n' + validationReport;
    }
    const userCustomEdit = (document.getElementById('customEditPrompt') || {}).value;
    if (userCustomEdit && userCustomEdit.trim()) {
        systemPrompt += '\n\n**הנחיות מיוחדות מהמשתמש:**\n' + userCustomEdit.trim();
    }
    const targetPct = Math.round(profile.targetMin * 100) + '%-' + Math.round(profile.targetMax * 100) + '%';
    systemPrompt += '\n\n**תזכורת אחרונה לפני הפלט:** רמת העריכה — ' + profile.name +
        '. אורך מצופה: ' + targetPct + ' ממספר המילים בגולמי. הצלחה = פלט בטווח הזה, עם כל התוכן הענייני נשמר.';
    return systemPrompt;
}

// עריכת טקסט ארוך בצ'אנקים — כל צ'אנק תחת אותו systemPrompt בדיוק.
async function runChunkedTextEditing() {
    hideError();
    if (!textEditChunks || textEditChunks.length < 2) {
        showError('אין צ\'אנקים לעריכה.');
        return;
    }
    const provider = getTextProvider();
    const systemPrompt = buildEditingSystemPrompt();  // נבנה פעם אחת — זהה לכל הצ'אנקים
    const mainModel = document.getElementById('geminiModel').value;

    setInputsDisabledState(true);
    resetAbortState();
    const stopBtn = document.getElementById('stopEditBtn');
    if (stopBtn) { stopBtn.disabled = false; stopBtn.textContent = '⏹️ עצור עריכה'; }
    document.getElementById('editStatus').classList.remove('hidden');
    document.getElementById('editDashboard').classList.remove('hidden');
    document.getElementById('verifyFidelityResult').classList.add('hidden');
    activateStageCard('editedTranscriptSection');

    const editedTextArea = document.getElementById('editedTranscript');
    const fullRaw = textEditChunks.map(c => c.text).join('\n\n');
    const rawWordCount = countWords(fullRaw);
    updateStat('editStatRawWords', rawWordCount);
    updateStat('editStatEditedWords', 0);
    updateStat('editStatRatio', '0%');
    updateStat('editStatProvider', provider === 'claude' ? '🟠 Claude' : '🔵 Gemini');
    startTimer('editTimerDisplay');

    const statusText = document.getElementById('editStatusText');
    let mergedSoFar = '';
    let failedChunks = 0;

    try {
        for (let i = 0; i < textEditChunks.length; i++) {
            const chunk = textEditChunks[i];
            if (pipelineAborted) throw new Error('העריכה נעצרה על ידי המשתמש.');
            if (statusText) {
                statusText.textContent = 'עורך קטע ' + (i + 1) + '/' + textEditChunks.length + '...';
            }
            chunk.status = 'editing';

            const userInputBlock = '--- הטקסט הגולמי (קטע ' + (i + 1) + ' מתוך ' +
                textEditChunks.length + ') ---\n' + chunk.text +
                '\n\n--- סוף קטע ---\n\nאנא בצע עריכה מתקדמת מלאה לקטע זה. ' +
                'ערוך אותו כיחידה שלמה — אל תוסיף הקדמה או סיכום, רק את הקטע הערוך.';

            let chunkEdited = '';
            const chunkHandler = (liveText) => {
                chunkEdited = liveText;
                // תצוגה חיה: מה שכבר אוחד + הקטע הנוכחי
                const preview = mergedSoFar + (mergedSoFar ? '\n\n' : '') + liveText;
                updateTextWithSmartScroll('editedTranscript', preview);
                updateEditDashboard(rawWordCount, preview);
            };

            let result;
            try {
                if (provider === 'claude') {
                    result = await callClaudeAPIStreaming(
                        document.getElementById('claudeApiKey').value.trim(),
                        document.getElementById('claudeModel').value,
                        systemPrompt, userInputBlock, chunkHandler);
                } else {
                    result = await callGeminiAPIStreaming(
                        document.getElementById('geminiApiKey').value.trim(),
                        mainModel, systemPrompt, null, userInputBlock, chunkHandler,
                        { maxOutputTokens: 32000 });
                }
            } catch (chunkErr) {
                if (pipelineAborted) throw chunkErr;
                // צ'אנק בודד נכשל — נסמן ונמשיך
                chunk.status = 'failed';
                chunk.edited = '[שגיאה בעריכת קטע זה: ' + chunkErr.message + ']\n\n' + chunk.text;
                failedChunks++;
                mergedSoFar += (mergedSoFar ? '\n\n' : '') + chunk.edited;
                continue;
            }

            if (result.finishReason === 'USER_ABORTED') {
                chunk.edited = chunkEdited || result.text;
                chunk.status = 'aborted';
                mergedSoFar += (mergedSoFar ? '\n\n' : '') + chunk.edited;
                editedTextArea.value = mergedSoFar;
                throw new Error('העריכה נעצרה על ידי המשתמש.');
            }

            // הצלחה (כולל MAX_TOKENS — לקטע בודד זה נדיר; נשמר מה שיש)
            chunk.edited = (chunkEdited || result.text || '').trim();
            chunk.status = 'done';
            mergedSoFar += (mergedSoFar ? '\n\n' : '') + chunk.edited;
            editedTextArea.value = mergedSoFar;
            updateEditDashboard(rawWordCount, mergedSoFar);
        }

        // איחוד סופי
        const merged = mergeEditedChunks();
        editedTextArea.value = merged;
        stopTimer();
        try { showEditPostCheck(rawWordCount, merged); } catch (e) {}

        const summary = failedChunks > 0
            ? 'העריכה הסתיימה — ' + (textEditChunks.length - failedChunks) + '/' +
              textEditChunks.length + ' קטעים נערכו (' + failedChunks + ' נכשלו).'
            : 'העריכה הסתיימה — כל ' + textEditChunks.length + ' הקטעים נערכו ואוחדו.';
        if (typeof sendDesktopNotification === 'function') {
            sendDesktopNotification('עריכת הטקסט הסתיימה', summary);
        }
        if (failedChunks > 0) {
            showError(failedChunks + ' קטעים נכשלו בעריכה. אפשר לנסות שוב — הקטעים שהצליחו נשמרו.');
        }
        if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
    } catch (err) {
        stopTimer();
        showError('שגיאה בעריכת הטקסט:\n' + err.message);
    } finally {
        document.getElementById('editStatus').classList.add('hidden');
        setInputsDisabledState(false);
    }
}





/* =======================================================
   v9 שלב ד': OCR מתמונה — מקור קלט שלישי במסלול הטקסט
   ======================================================= */

let ocrImageData = null;   // { base64, mimeType, fileName }

// קריאת קובץ תמונה ל-base64
function loadOcrImage(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const info = document.getElementById('ocrImageInfo');
    const runBtn = document.getElementById('runOcrBtn');
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        // dataUrl = "data:image/png;base64,XXXX"
        const commaIdx = dataUrl.indexOf(',');
        const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
        const mimeMatch = dataUrl.match(/^data:([^;]+);/);
        ocrImageData = {
            base64: base64,
            mimeType: mimeMatch ? mimeMatch[1] : (file.type || 'image/png'),
            fileName: file.name
        };
        if (info) {
            info.innerHTML = '✓ נטענה תמונה: <strong>' + escapeHtmlV9(file.name) +
                '</strong> (' + sizeMB + ' MB). לחץ "חלץ טקסט מהתמונה".';
        }
        if (runBtn) runBtn.disabled = false;
    };
    reader.onerror = () => {
        if (info) info.innerHTML = '<span style="color:#b91c1c;">שגיאה בקריאת התמונה.</span>';
        ocrImageData = null;
        if (runBtn) runBtn.disabled = true;
    };
    reader.readAsDataURL(file);
}

const OCR_SYSTEM_PROMPT = `אתה מנוע OCR מדויק לטקסט תורני בעברית.
קיבלת תמונה של דף טקסט (שיעור, ספר, או כתב-יד מודפס).
המשימה: לחלץ את כל הטקסט שבתמונה, מדויק ככל האפשר.

כללים:
1. החזר אך ורק את הטקסט שבתמונה — בלי הקדמה, בלי הסבר, בלי תיאור התמונה.
2. שמור על מבנה הפסקאות — שורה ריקה בין פסקאות.
3. כתיב תורני מדויק: גרשיים אמיתיים (") בראשי-תיבות, גרש (') בקיצורים.
4. אם חלק מהטקסט מטושטש או לא קריא — סמן [לא ברור] במקום לנחש.
5. אל תתקן, אל תערוך, אל תפרש — רק חלץ את מה שכתוב.
6. אם אין טקסט בתמונה — כתוב "[לא נמצא טקסט בתמונה]".`;

// הרצת OCR דרך Gemini Vision
async function runImageOcr() {
    if (!ocrImageData) {
        showError('לא נטענה תמונה. בחר קובץ תמונה קודם.');
        return;
    }
    const apiKey = (document.getElementById('geminiApiKey') || {}).value;
    if (!apiKey || !apiKey.trim()) {
        showError('נדרש מפתח Gemini API (בטאב "קליטת חומר", במסלול האודיו) עבור OCR.');
        return;
    }
    const model = (document.getElementById('geminiModel') || {}).value || 'gemini-2.5-flash';

    const runBtn = document.getElementById('runOcrBtn');
    const status = document.getElementById('ocrStatus');
    const statusText = document.getElementById('ocrStatusText');
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ מחלץ...'; }
    if (status) status.classList.remove('hidden');
    hideError();

    try {
        // contentPart במבנה של Gemini inline image
        const imagePart = {
            inlineData: {
                mimeType: ocrImageData.mimeType,
                data: ocrImageData.base64
            }
        };
        let ocrText = '';
        await callGeminiAPIStreaming(apiKey, model, OCR_SYSTEM_PROMPT, imagePart,
            'חלץ את כל הטקסט מהתמונה המצורפת.',
            (liveText) => {
                ocrText = liveText;
                if (statusText) statusText.textContent = 'מחלץ טקסט... (' + liveText.length + ' תווים)';
            });

        if (!ocrText || !ocrText.trim() || /\[לא נמצא טקסט בתמונה\]/.test(ocrText)) {
            showError('לא חולץ טקסט מהתמונה. ודא שהתמונה מכילה טקסט קריא.');
            return;
        }

        // הכנסת הטקסט שחולץ לאזור ההדבקה
        const pasteEl = document.getElementById('pastedTextInput');
        if (pasteEl) pasteEl.value = ocrText.trim();
        // מעבר ללשונית ההדבקה כדי שהמשתמש יראה ויוכל לתקן
        switchTextInputTab('paste');
        if (typeof updatePastedTextInfo === 'function') updatePastedTextInfo();

        const info = document.getElementById('ocrImageInfo');
        if (info) {
            info.innerHTML = '✓ הטקסט חולץ והוכנס לאזור ההדבקה — בדוק, תקן אם צריך, ולחץ "טען לעריכה".';
        }
        if (typeof sendDesktopNotification === 'function') {
            sendDesktopNotification('OCR הושלם', countWords(ocrText) + ' מילים חולצו מהתמונה.');
        }
    } catch (err) {
        showError('שגיאה ב-OCR: ' + err.message);
    } finally {
        if (runBtn) { runBtn.disabled = false; runBtn.textContent = '🔍 חלץ טקסט מהתמונה'; }
        if (status) status.classList.add('hidden');
    }
}
