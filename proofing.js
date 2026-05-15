/* =======================================================
   ארגז כלים לעורך תורני — v9
   proofing.js — כלי הגהה מתקדמים (שלב ג')
   1. הגהת כתיב תורני (מקומי)
   2. אחידות כתיב על פני המסמך (מקומי)
   3. ניקוד סלקטיבי (Gemini)
   4. זיהוי ציטוטים סמויים (Gemini)
   ======================================================= */

/* =======================================================
   מצב גלובלי של מודול ההגהה
   ======================================================= */
let proofingSpellingResults = [];   // [{ id, index, length, found, suggestion, rule, accepted }]
let proofingConsistencyResults = []; // [{ id, canonical, variants:[{form,count}], chosenForm }]
let proofingHiddenCitations = [];    // [{ id, quote, index, length, suggestedRef, accepted }]
let proofingInProgress = false;

// איזה טקסט מגהים — 'edited' (ברירת מחדל) או 'raw'
let proofingTarget = 'edited';

/* =======================================================
   1. מילון הגהת כתיב תורני
   מיפוי שגיאות-כתיב נפוצות (פונטי / OCR) -> כתיב מדויק.
   המפתח הוא הצורה השגויה, הערך הוא {to, reason}.
   ======================================================= */
const TORAH_SPELLING_FIXES = {
    // ראשי-תיבות בלי גרשיים -> עם גרשיים
    'רשי': { to: 'רש"י', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'רמבם': { to: 'רמב"ם', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'רמבן': { to: 'רמב"ן', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'רשבא': { to: 'רשב"א', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'ריטבא': { to: 'ריטב"א', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'ראש': { to: 'רא"ש', reason: 'ראשי-תיבות — חסרים גרשיים (בהקשר תורני)' },
    'ריף': { to: 'רי"ף', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'שך': { to: 'ש"ך', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'טז': { to: 'ט"ז', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'שו"ע': { to: 'שו"ע', reason: 'תקין' },  // נשמר — דוגמה
    'שוע': { to: 'שו"ע', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'רמא': { to: 'רמ"א', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'מגא': { to: 'מג"א', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'חזל': { to: 'חז"ל', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'תנך': { to: 'תנ"ך', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'תוס': { to: 'תוס\'', reason: 'קיצור — חסר גרש' },
    'גמ': { to: 'גמ\'', reason: 'קיצור — חסר גרש' },
    'עא': { to: 'ע"א', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'עב': { to: 'ע"ב', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'דה': { to: 'ד"ה', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'זל': { to: 'ז"ל', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'זצל': { to: 'זצ"ל', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'שליטא': { to: 'שליט"א', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'בס"ד': { to: 'בס"ד', reason: 'תקין' },
    'בסד': { to: 'בס"ד', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'הקבה': { to: 'הקב"ה', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'קוב"ה': { to: 'הקב"ה', reason: 'כתיב מקובל: הקב"ה' },
    'אעפ': { to: 'אע"פ', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'אעג': { to: 'אע"ג', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'קמל': { to: 'קמ"ל', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'תש': { to: 'ת"ש', reason: 'ראשי-תיבות — חסרים גרשיים (תא שמע)' },
    'צע': { to: 'צ"ע', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'צל': { to: 'צ"ל', reason: 'ראשי-תיבות — חסרים גרשיים' },
    'וכו': { to: 'וכו\'', reason: 'קיצור — חסר גרש' },
    'וכד': { to: 'וכד\'', reason: 'קיצור — חסר גרש' },
    // שגיאות פונטיות נפוצות בתמלול
    'תוסעת': { to: 'תוס\'', reason: 'שגיאת תמלול פונטית של "תוספות"' },
    'תוסף': { to: 'תוס\'', reason: 'שגיאת תמלול פונטית של "תוספות"' },
    'גמרה': { to: 'גמרא', reason: 'כתיב — "גמרא" באל"ף' },
    'משנא': { to: 'משנה', reason: 'כתיב — "משנה" בה"א' },
    'מסכתה': { to: 'מסכת', reason: 'כתיב מקובל: "מסכת"' },
};

// מפת גרשיים: ממיר אפוסטרוף ASCII (') וגרש-יוניקוד שגוי לגרש תקני בראשי-תיבות.
// כאן מטפלים רק בתבנית: אות + ' + אות (ראשי-תיבות) -> אות + " + אות
// וגם אות בודדת + ' בסוף מילה (קיצור) -> נשאר עם גרש.

/* =======================================================
   עזרי טקסט
   ======================================================= */

// מחזיר את הטקסט שמיועד להגהה (לפי proofingTarget), אחרי ניקוי timestamps.
function getProofingText() {
    const elId = proofingTarget === 'raw' ? 'rawTranscript' : 'editedTranscript';
    const el = document.getElementById(elId);
    if (!el) return '';
    return el.value || '';
}

function getProofingTextElement() {
    const elId = proofingTarget === 'raw' ? 'rawTranscript' : 'editedTranscript';
    return document.getElementById(elId);
}

// escape ל-HTML — משתמש ב-escapeHtmlV9 מ-app.js אם קיים, אחרת מקומי.
function proofEscapeHtml(str) {
    if (typeof escapeHtmlV9 === 'function') return escapeHtmlV9(str);
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// בונה regex לזיהוי "מילה" תורנית עם גבולות נכונים.
// מאפשר תחילית עברית בודדת (ו/ב/ה/ל/מ/ש/כ/פ) לפני המילה — כך "ורש\"י" נתפס.
// קבוצות: 1=גבול לפני, 2=תחילית אופציונלית, 3=המילה עצמה.
function buildWordRegex(form) {
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nonLetter = '[\\s.,;:!?()\\[\\]"\u05be\u2013\u2014\\-]';
    const prefixes = '[\u05d5\u05d1\u05d4\u05dc\u05de\u05e9\u05db\u05e4]?';
    return new RegExp('(^|' + nonLetter + ')(' + prefixes + ')(' + escaped + ')(?=$|' + nonLetter + ')', 'g');
}

/* =======================================================
   1. הגהת כתיב תורני — סריקה מקומית
   ======================================================= */

// סורק את הטקסט ומחזיר רשימת תיקוני-כתיב מוצעים.
function scanTorahSpelling() {
    const text = getProofingText();
    if (!text.trim()) {
        showProofingError('אין טקסט להגהה. ודא שיש תמלול ערוך (או בחר "גולמי").');
        return;
    }
    hideProofingError();
    proofingSpellingResults = [];
    let idCounter = 0;

    // 1) מילון השגיאות — חיפוש כמילה שלמה (גבולות מילה עבריים)
    Object.keys(TORAH_SPELLING_FIXES).forEach(wrong => {
        const fix = TORAH_SPELLING_FIXES[wrong];
        if (fix.reason === 'תקין') return; // דילוג על ערכי-בקרה
        // גבול-מילה: לפני — תחילת-טקסט/רווח/פיסוק; אחרי — סוף/רווח/פיסוק
        // לא משתמשים ב-\b כי הוא לא עובד טוב עם עברית
        const re = buildWordRegex(wrong);
        let m;
        while ((m = re.exec(text)) !== null) {
            // m[1]=גבול, m[2]=תחילית אופציונלית, m[3]=המילה השגויה
            const matchIndex = m.index + m[1].length + m[2].length;
            proofingSpellingResults.push({
                id: 'sp_' + (idCounter++),
                index: matchIndex,
                length: wrong.length,
                found: wrong,
                suggestion: fix.to,
                rule: fix.reason,
                accepted: true  // ברירת מחדל: מאושר
            });
            // מניעת לולאה אינסופית על match בגודל 0
            if (re.lastIndex === m.index) re.lastIndex++;
        }
    });

    // 2) אפוסטרוף ASCII בראשי-תיבות -> גרשיים תקניים
    //    תבנית: אות עברית + ' + אות עברית  (למשל רש'י -> רש"י)
    const apostropheRe = /([א-ת])'([א-ת])/g;
    let am;
    while ((am = apostropheRe.exec(text)) !== null) {
        proofingSpellingResults.push({
            id: 'sp_' + (idCounter++),
            index: am.index,
            length: 3,
            found: am[0],
            suggestion: am[1] + '"' + am[2],
            rule: 'גרשיים — אפוסטרוף ASCII במקום גרשיים תקניים (")',
            accepted: true
        });
    }

    // 3) גרש-יוניקוד שגוי (‘ ’) -> אפוסטרוף/גרש תקני בקיצורים
    const wrongGeresh = /[‘’]/g;
    let wm;
    while ((wm = wrongGeresh.exec(text)) !== null) {
        proofingSpellingResults.push({
            id: 'sp_' + (idCounter++),
            index: wm.index,
            length: 1,
            found: wm[0],
            suggestion: "'",
            rule: 'גרש — תו יוניקוד מסולסל במקום גרש ישר',
            accepted: true
        });
    }

    // מיון לפי מיקום + הסרת חפיפות
    proofingSpellingResults.sort((a, b) => a.index - b.index);
    proofingSpellingResults = dedupeByPosition(proofingSpellingResults);

    renderSpellingResults();
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
}

// הסרת תוצאות שחופפות במיקום (שומר את הראשונה)
function dedupeByPosition(results) {
    const out = [];
    let lastEnd = -1;
    for (const r of results) {
        if (r.index >= lastEnd) {
            out.push(r);
            lastEnd = r.index + r.length;
        }
    }
    return out;
}

// החלת תיקוני-הכתיב המאושרים על הטקסט
function applySpellingFixes() {
    const accepted = proofingSpellingResults.filter(r => r.accepted);
    if (accepted.length === 0) {
        showProofingError('לא נבחרו תיקונים להחלה.');
        return;
    }
    const el = getProofingTextElement();
    if (!el) return;
    let text = el.value;

    // החלה מהסוף להתחלה — כדי שהמיקומים לא יזוזו
    const sorted = accepted.slice().sort((a, b) => b.index - a.index);
    let appliedCount = 0;
    for (const r of sorted) {
        // אימות שהטקסט במיקום עדיין תואם (הגנה מפני עריכה ידנית בינתיים)
        const actual = text.substr(r.index, r.length);
        if (actual === r.found) {
            text = text.slice(0, r.index) + r.suggestion + text.slice(r.index + r.length);
            appliedCount++;
        }
    }
    el.value = text;

    // ניקוי התוצאות שהוחלו
    proofingSpellingResults = proofingSpellingResults.filter(r => !r.accepted);
    renderSpellingResults();

    // עדכון תצוגות תלויות
    try { if (typeof updateQualityDashboard === 'function') updateQualityDashboard(); } catch (e) {}
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();

    showProofingNotice(appliedCount + ' תיקוני כתיב הוחלו על הטקסט.');
    if (typeof sendDesktopNotification === 'function') {
        sendDesktopNotification('הגהת כתיב', appliedCount + ' תיקונים הוחלו.');
    }
}

// סימון/ביטול-סימון של תיקון בודד
function toggleSpellingFix(id) {
    const r = proofingSpellingResults.find(x => x.id === id);
    if (r) {
        r.accepted = !r.accepted;
        const cb = document.getElementById('cb_' + id);
        if (cb) cb.checked = r.accepted;
        updateSpellingApplyButton();
    }
}

// סימון/ביטול-סימון של כל התיקונים
function toggleAllSpellingFixes(checked) {
    proofingSpellingResults.forEach(r => { r.accepted = checked; });
    renderSpellingResults();
}

function updateSpellingApplyButton() {
    const btn = document.getElementById('applySpellingBtn');
    if (!btn) return;
    const count = proofingSpellingResults.filter(r => r.accepted).length;
    btn.textContent = count > 0 ? `✓ החל ${count} תיקונים` : 'החל תיקונים';
    btn.disabled = count === 0;
}

/* =======================================================
   2. אחידות כתיב על פני המסמך
   מזהה ביטויים שמופיעים בכמה וריאציות, ומציע לאחד.
   ======================================================= */

// קבוצות-אחידות ידועות: כל קבוצה היא רשימת צורות שמשמעותן זהה.
// הצורה הראשונה היא ה"מועדפת" (canonical).
const CONSISTENCY_GROUPS = [
    { canonical: 'רש"י', forms: ['רש"י', 'רשי', "רש'י"] },
    { canonical: 'רמב"ם', forms: ['רמב"ם', 'רמבם', "רמב'ם"] },
    { canonical: 'רמב"ן', forms: ['רמב"ן', 'רמבן', "רמב'ן"] },
    { canonical: 'תוס\'', forms: ['תוס\'', 'תוס', 'תוספות', 'תוס"', 'תוסעת'] },
    { canonical: 'גמ\'', forms: ['גמ\'', 'גמ', 'גמרא', 'גמרה'] },
    { canonical: 'ע"א', forms: ['ע"א', 'עא', 'עמוד א'] },
    { canonical: 'ע"ב', forms: ['ע"ב', 'עב', 'עמוד ב'] },
    { canonical: 'הקב"ה', forms: ['הקב"ה', 'הקבה', 'קוב"ה', 'הקדוש ברוך הוא'] },
    { canonical: 'חז"ל', forms: ['חז"ל', 'חזל'] },
    { canonical: 'שו"ע', forms: ['שו"ע', 'שוע', 'שולחן ערוך'] },
    { canonical: 'ש"ך', forms: ['ש"ך', 'שך'] },
];

// סורק את הטקסט. עבור כל קבוצה — סופר כמה פעמים כל וריאציה מופיעה.
// אם יש יותר מצורה אחת בשימוש — זו אי-אחידות שצריך לאחד.
function scanConsistency() {
    const text = getProofingText();
    if (!text.trim()) {
        showProofingError('אין טקסט לבדיקת אחידות.');
        return;
    }
    hideProofingError();
    proofingConsistencyResults = [];
    let idCounter = 0;

    CONSISTENCY_GROUPS.forEach(group => {
        const counts = [];
        group.forms.forEach(form => {
            const re = buildWordRegex(form);
            let count = 0;
            let cm;
            while ((cm = re.exec(text)) !== null) {
                count++;
                if (re.lastIndex === cm.index) re.lastIndex++;
            }
            if (count > 0) counts.push({ form: form, count: count });
        });
        // אי-אחידות = יותר מצורה אחת בשימוש
        if (counts.length > 1) {
            // ברירת מחדל: הצורה המועדפת אם היא בשימוש, אחרת הנפוצה ביותר
            let chosen = group.canonical;
            if (!counts.some(c => c.form === group.canonical)) {
                chosen = counts.slice().sort((a, b) => b.count - a.count)[0].form;
            }
            proofingConsistencyResults.push({
                id: 'cn_' + (idCounter++),
                canonical: group.canonical,
                variants: counts.sort((a, b) => b.count - a.count),
                chosenForm: chosen
            });
        }
    });

    renderConsistencyResults();
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
}

// שינוי הצורה הנבחרת לקבוצת-אחידות
function setConsistencyChoice(id, form) {
    const g = proofingConsistencyResults.find(x => x.id === id);
    if (g) {
        g.chosenForm = form;
        renderConsistencyResults();
    }
}

// החלת איחוד-הכתיב: כל הוריאציות -> הצורה הנבחרת
function applyConsistency() {
    if (proofingConsistencyResults.length === 0) {
        showProofingError('אין אי-אחידויות לתיקון.');
        return;
    }
    const el = getProofingTextElement();
    if (!el) return;
    let text = el.value;
    let totalReplaced = 0;

    proofingConsistencyResults.forEach(group => {
        const target = group.chosenForm;
        group.variants.forEach(v => {
            if (v.form === target) return; // לא מחליפים את הצורה הנבחרת בעצמה
            const re = buildWordRegex(v.form);
            text = text.replace(re, (match, pre, prefix) => {
                totalReplaced++;
                return pre + prefix + target;
            });
        });
    });

    el.value = text;
    proofingConsistencyResults = [];
    renderConsistencyResults();
    try { if (typeof updateQualityDashboard === 'function') updateQualityDashboard(); } catch (e) {}
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
    showProofingNotice(totalReplaced + ' החלפות בוצעו לאחידות כתיב.');
}

/* =======================================================
   3. ניקוד סלקטיבי — דרך Gemini
   המשתמש בוחר קטע, והמודל מנקד רק אותו.
   ======================================================= */

const NIQQUD_SYSTEM_PROMPT = `אתה מנקד מומחה לעברית ולארמית תלמודית.
קיבלת קטע טקסט תורני. המשימה: להוסיף ניקוד מלא ומדויק לקטע.

כללים:
1. נקד אך ורק את הקטע שניתן — אל תוסיף, אל תשמיט, אל תשנה אף מילה.
2. שמור על כל סימני הפיסוק, הגרשיים, והרווחים בדיוק כפי שהם.
3. ניקוד מדויק לפי הדקדוק — כולל ארמית תלמודית אם מופיעה.
4. פסוקי תנ"ך — נקד לפי הניקוד המסורתי המדויק (כולל טעמי המקרא אם אתה בטוח, אחרת רק ניקוד).
5. אל תוסיף הקדמה, הסבר או טקסט באנגלית. החזר אך ורק את הקטע המנוקד.`;

// מנקד את הקטע שסומן ב-textarea (selectionStart..selectionEnd), או את כל הטקסט.
async function runالسelectiveNiqqud() { /* placeholder — לא בשימוש, ראה runSelectiveNiqqud */ }

async function runSelectiveNiqqud() {
    if (proofingInProgress) return;
    const el = getProofingTextElement();
    if (!el) { showProofingError('לא נמצא שדה טקסט.'); return; }

    const fullText = el.value;
    if (!fullText.trim()) {
        showProofingError('אין טקסט לניקוד.');
        return;
    }

    // קביעת הקטע: אם יש בחירה — רק היא; אחרת — כל הטקסט (עם אזהרה)
    let selStart = (typeof el.selectionStart === 'number') ? el.selectionStart : 0;
    let selEnd = (typeof el.selectionEnd === 'number') ? el.selectionEnd : 0;
    let segment, isSelection;
    if (selEnd > selStart) {
        segment = fullText.slice(selStart, selEnd);
        isSelection = true;
    } else {
        segment = fullText;
        isSelection = false;
        if (segment.length > 4000) {
            showProofingError('הטקסט ארוך מדי לניקוד מלא בבת אחת. סמן קטע ספציפי ב-textarea ונסה שוב.');
            return;
        }
    }

    const apiKey = (document.getElementById('geminiApiKey') || {}).value;
    if (!apiKey || !apiKey.trim()) {
        showProofingError('נדרש מפתח Gemini API (בטאב "קליטת חומר") עבור ניקוד.');
        return;
    }
    const model = (document.getElementById('geminiModel') || {}).value || 'gemini-2.5-flash';

    proofingInProgress = true;
    setNiqqudUIState(true);
    hideProofingError();

    try {
        const userPrompt = '--- קטע לניקוד ---\n' + segment +
            '\n\nנקד את הקטע במלואו והחזר אותו מנוקד.';
        let niqqudResult = '';
        await callGeminiAPIStreaming(apiKey, model, NIQQUD_SYSTEM_PROMPT, null, userPrompt,
            (liveText) => {
                niqqudResult = liveText;
                const out = document.getElementById('niqqudPreview');
                if (out) out.textContent = liveText;
            });

        if (!niqqudResult || niqqudResult.trim().length < segment.length * 0.5) {
            showProofingError('לא התקבל ניקוד תקין מהמודל.');
            return;
        }

        // הצגת תוצאה + כפתור החלה
        const preview = document.getElementById('niqqudPreview');
        if (preview) preview.textContent = niqqudResult;
        const applyBtn = document.getElementById('applyNiqqudBtn');
        if (applyBtn) {
            applyBtn.classList.remove('hidden');
            // שמירת ההקשר להחלה
            applyBtn.dataset.selStart = isSelection ? String(selStart) : '';
            applyBtn.dataset.selEnd = isSelection ? String(selEnd) : '';
            applyBtn.dataset.result = niqqudResult;
        }
        showProofingNotice('הניקוד מוכן. בדוק את התצוגה ולחץ "החל ניקוד".');
    } catch (err) {
        showProofingError('שגיאה בניקוד: ' + err.message);
    } finally {
        proofingInProgress = false;
        setNiqqudUIState(false);
    }
}

// החלת הניקוד שהתקבל על הטקסט
function applyNiqqud() {
    const applyBtn = document.getElementById('applyNiqqudBtn');
    if (!applyBtn) return;
    const result = applyBtn.dataset.result || '';
    if (!result) { showProofingError('אין ניקוד להחלה.'); return; }

    const el = getProofingTextElement();
    if (!el) return;

    const selStart = applyBtn.dataset.selStart;
    const selEnd = applyBtn.dataset.selEnd;
    if (selStart !== '' && selEnd !== '') {
        // החלה על הקטע שנבחר
        const s = parseInt(selStart, 10);
        const e = parseInt(selEnd, 10);
        el.value = el.value.slice(0, s) + result + el.value.slice(e);
    } else {
        // החלה על כל הטקסט
        el.value = result;
    }

    // ניקוי
    applyBtn.classList.add('hidden');
    applyBtn.dataset.result = '';
    const preview = document.getElementById('niqqudPreview');
    if (preview) preview.textContent = '';

    try { if (typeof updateQualityDashboard === 'function') updateQualityDashboard(); } catch (e) {}
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
    showProofingNotice('הניקוד הוחל על הטקסט.');
}

/* =======================================================
   4. זיהוי ציטוטים סמויים — דרך Gemini
   מוצא ציטוטים שלא סומנו במפורש ומציע מראה-מקום.
   ======================================================= */

const HIDDEN_CITATIONS_SYSTEM_PROMPT = `אתה תלמיד-חכם בקיא בתנ"ך, תלמוד, מדרש ופוסקים.
קיבלת טקסט של שיעור תורני. המשימה: לזהות "ציטוטים סמויים" — מקומות שבהם הדובר
מצטט פסוק, מאמר חז"ל, או מקור, בלי לציין במפורש מאיפה זה.

כללים:
1. אתר רק ציטוטים ממשיים — לשון של פסוק/גמרא/מדרש שמשולבת בדברי הדובר.
2. אל תסמן פרפראזות כלליות או רעיונות — רק ציטוט מילולי או כמעט-מילולי.
3. עבור כל ציטוט סמוי שמצאת, החזר שורה בפורמט המדויק הבא:
   ציטוט: <הציטוט המדויק כפי שמופיע בטקסט> | מקור: <מראה המקום המשוער>
4. אם אינך בטוח במקור — כתוב "מקור: לא ודאי" אבל עדיין דווח על הציטוט.
5. אם לא מצאת ציטוטים סמויים — כתוב: "לא נמצאו ציטוטים סמויים."
6. כתוב בעברית בלבד. ללא הקדמות, ללא הסברים — רק רשימת השורות בפורמט הנ"ל.`;

async function scanHiddenCitations() {
    if (proofingInProgress) return;
    const text = getProofingText();
    if (!text.trim()) {
        showProofingError('אין טקסט לסריקת ציטוטים סמויים.');
        return;
    }

    const apiKey = (document.getElementById('geminiApiKey') || {}).value;
    if (!apiKey || !apiKey.trim()) {
        showProofingError('נדרש מפתח Gemini API (בטאב "קליטת חומר") לזיהוי ציטוטים סמויים.');
        return;
    }
    const model = (document.getElementById('geminiModel') || {}).value || 'gemini-2.5-flash';

    proofingInProgress = true;
    setHiddenCitationsUIState(true);
    hideProofingError();
    proofingHiddenCitations = [];

    try {
        // ניקוי timestamps
        const cleanText = typeof stripTimestamps === 'function' ? stripTimestamps(text) : text;
        // הגבלת אורך — אם ארוך מדי נשלח את ההתחלה (אזהרה למשתמש)
        let sendText = cleanText;
        let truncated = false;
        if (sendText.length > 12000) {
            sendText = sendText.slice(0, 12000);
            truncated = true;
        }

        const userPrompt = '--- טקסט השיעור ---\n' + sendText +
            '\n\nאתר את הציטוטים הסמויים והחזר את הרשימה בפורמט המבוקש.';
        let result = '';
        await callGeminiAPIStreaming(apiKey, model, HIDDEN_CITATIONS_SYSTEM_PROMPT, null, userPrompt,
            (liveText) => {
                result = liveText;
                const statusText = document.getElementById('hiddenCitationsStatusText');
                if (statusText) statusText.textContent = 'המודל מנתח... (' + liveText.length + ' תווים)';
            });

        // ניתוח התשובה — כל שורה בפורמט "ציטוט: X | מקור: Y"
        proofingHiddenCitations = parseHiddenCitationsResponse(result, cleanText);

        renderHiddenCitations();
        if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();

        const msg = proofingHiddenCitations.length > 0
            ? proofingHiddenCitations.length + ' ציטוטים סמויים זוהו.'
            : 'לא נמצאו ציטוטים סמויים.';
        showProofingNotice(msg + (truncated ? ' (נסרקו 12,000 התווים הראשונים בלבד)' : ''));
        if (typeof sendDesktopNotification === 'function') {
            sendDesktopNotification('זיהוי ציטוטים סמויים', msg);
        }
    } catch (err) {
        showProofingError('שגיאה בזיהוי ציטוטים סמויים: ' + err.message);
    } finally {
        proofingInProgress = false;
        setHiddenCitationsUIState(false);
    }
}

// ניתוח תשובת המודל לרשימת ציטוטים מובנית
function parseHiddenCitationsResponse(response, sourceText) {
    const out = [];
    if (!response || /לא נמצאו ציטוטים סמויים/.test(response)) return out;
    let idCounter = 0;
    const lines = response.split('\n');
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        // פורמט: "ציטוט: X | מקור: Y"
        const m = line.match(/ציטוט:\s*(.+?)\s*\|\s*מקור:\s*(.+)/);
        if (!m) return;
        const quote = m[1].trim();
        const ref = m[2].trim();
        if (!quote) return;
        // ניסיון לאתר את הציטוט בטקסט המקור (למיקום)
        let index = -1;
        if (sourceText) {
            index = sourceText.indexOf(quote);
        }
        out.push({
            id: 'hc_' + (idCounter++),
            quote: quote,
            index: index,
            length: quote.length,
            suggestedRef: ref,
            accepted: ref !== 'לא ודאי' && ref !== 'לא נמצא'
        });
    });
    return out;
}

// סימון/ביטול ציטוט סמוי בודד
function toggleHiddenCitation(id) {
    const c = proofingHiddenCitations.find(x => x.id === id);
    if (c) {
        c.accepted = !c.accepted;
        const cb = document.getElementById('hccb_' + id);
        if (cb) cb.checked = c.accepted;
    }
}

// החלת הציטוטים הסמויים שאושרו — הוספת מראה-מקום בסוגריים אחרי הציטוט.
function applyHiddenCitations() {
    const accepted = proofingHiddenCitations.filter(c => c.accepted && c.index >= 0);
    if (accepted.length === 0) {
        showProofingError('לא נבחרו ציטוטים סמויים להוספת מראה-מקום (או שלא נמצאו במיקום בטקסט).');
        return;
    }
    const el = getProofingTextElement();
    if (!el) return;
    let text = el.value;

    // עבודה מהסוף להתחלה כדי לשמור מיקומים
    const sorted = accepted.slice().sort((a, b) => b.index - a.index);
    let appliedCount = 0;
    for (const c of sorted) {
        const actual = text.substr(c.index, c.length);
        if (actual === c.quote) {
            // הוספת מראה-מקום בסוגריים אחרי הציטוט
            const insertion = ' (' + c.suggestedRef + ')';
            const after = c.index + c.length;
            text = text.slice(0, after) + insertion + text.slice(after);
            appliedCount++;
        }
    }
    el.value = text;

    proofingHiddenCitations = proofingHiddenCitations.filter(c => !c.accepted);
    renderHiddenCitations();
    try { if (typeof updateQualityDashboard === 'function') updateQualityDashboard(); } catch (e) {}
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
    showProofingNotice(appliedCount + ' מראי-מקומות נוספו לציטוטים הסמויים.');
}

/* =======================================================
   רינדור UI
   ======================================================= */

function renderSpellingResults() {
    const container = document.getElementById('spellingResultsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (proofingSpellingResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm p-2">לא נמצאו שגיאות כתיב תורני, או שטרם בוצעה סריקה.</p>';
        updateSpellingApplyButton();
        return;
    }

    // כותרת עם "סמן הכל"
    const head = document.createElement('div');
    head.className = 'proof-list-head';
    head.innerHTML =
        '<label class="proof-checkall"><input type="checkbox" id="spellingCheckAll" checked> ' +
        'סמן הכל (' + proofingSpellingResults.length + ' תיקונים)</label>';
    container.appendChild(head);
    const checkAll = head.querySelector('#spellingCheckAll');
    if (checkAll) checkAll.addEventListener('change', (e) => toggleAllSpellingFixes(e.target.checked));

    proofingSpellingResults.forEach(r => {
        const item = document.createElement('div');
        item.className = 'proof-item';
        item.innerHTML =
            '<label class="proof-item-check">' +
            '<input type="checkbox" id="cb_' + r.id + '" ' + (r.accepted ? 'checked' : '') + '>' +
            '</label>' +
            '<div class="proof-item-body">' +
            '<div class="proof-fix-line">' +
            '<span class="proof-found">' + proofEscapeHtml(r.found) + '</span>' +
            '<span class="proof-arrow">←</span>' +
            '<span class="proof-suggestion">' + proofEscapeHtml(r.suggestion) + '</span>' +
            '</div>' +
            '<div class="proof-rule">' + proofEscapeHtml(r.rule) + '</div>' +
            '</div>';
        const cb = item.querySelector('#cb_' + r.id);
        if (cb) cb.addEventListener('change', () => toggleSpellingFix(r.id));
        container.appendChild(item);
    });

    updateSpellingApplyButton();
}

function renderConsistencyResults() {
    const container = document.getElementById('consistencyResultsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (proofingConsistencyResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm p-2">לא נמצאו אי-אחידויות כתיב, או שטרם בוצעה סריקה.</p>';
        const btn = document.getElementById('applyConsistencyBtn');
        if (btn) btn.disabled = true;
        return;
    }

    proofingConsistencyResults.forEach(group => {
        const item = document.createElement('div');
        item.className = 'proof-consistency-item';
        const variantsText = group.variants.map(v =>
            proofEscapeHtml(v.form) + ' (' + v.count + ')').join(' · ');
        let html = '<div class="proof-cn-variants">נמצאו וריאציות: ' + variantsText + '</div>';
        html += '<div class="proof-cn-choose"><span class="proof-cn-label">אחד ל:</span>';
        group.variants.forEach(v => {
            const active = v.form === group.chosenForm ? ' proof-cn-active' : '';
            html += '<button type="button" class="proof-cn-btn' + active + '" data-id="' +
                group.id + '" data-form="' + proofEscapeHtml(v.form) + '">' +
                proofEscapeHtml(v.form) + '</button>';
        });
        html += '</div>';
        item.innerHTML = html;
        item.querySelectorAll('.proof-cn-btn').forEach(btn => {
            btn.addEventListener('click', () =>
                setConsistencyChoice(btn.dataset.id, btn.dataset.form));
        });
        container.appendChild(item);
    });

    const btn = document.getElementById('applyConsistencyBtn');
    if (btn) btn.disabled = false;
}

function renderHiddenCitations() {
    const container = document.getElementById('hiddenCitationsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (proofingHiddenCitations.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm p-2">לא זוהו ציטוטים סמויים, או שטרם בוצעה סריקה.</p>';
        const btn = document.getElementById('applyHiddenCitationsBtn');
        if (btn) btn.disabled = true;
        return;
    }

    proofingHiddenCitations.forEach(c => {
        const item = document.createElement('div');
        item.className = 'proof-item';
        const notFound = c.index < 0
            ? '<span class="proof-hc-notfound">⚠️ לא אותר במיקום מדויק</span>' : '';
        item.innerHTML =
            '<label class="proof-item-check">' +
            '<input type="checkbox" id="hccb_' + c.id + '" ' +
            (c.accepted ? 'checked' : '') + (c.index < 0 ? ' disabled' : '') + '>' +
            '</label>' +
            '<div class="proof-item-body">' +
            '<div class="proof-hc-quote">"' + proofEscapeHtml(c.quote) + '"</div>' +
            '<div class="proof-hc-ref">📖 מקור משוער: <strong>' +
            proofEscapeHtml(c.suggestedRef) + '</strong> ' + notFound + '</div>' +
            '</div>';
        const cb = item.querySelector('#hccb_' + c.id);
        if (cb) cb.addEventListener('change', () => toggleHiddenCitation(c.id));
        container.appendChild(item);
    });

    const btn = document.getElementById('applyHiddenCitationsBtn');
    if (btn) btn.disabled = false;
}

/* =======================================================
   עזרי UI — סטטוס, שגיאות, נעילת כפתורים
   ======================================================= */

function setNiqqudUIState(busy) {
    const btn = document.getElementById('runNiqqudBtn');
    const status = document.getElementById('niqqudStatus');
    if (btn) {
        btn.disabled = busy;
        btn.textContent = busy ? '⏳ מנקד...' : '✒️ נקד את הקטע הנבחר';
    }
    if (status) status.classList.toggle('hidden', !busy);
}

function setHiddenCitationsUIState(busy) {
    const btn = document.getElementById('scanHiddenCitationsBtn');
    const status = document.getElementById('hiddenCitationsStatus');
    if (btn) {
        btn.disabled = busy;
        btn.textContent = busy ? '⏳ מנתח...' : '🔍 זהה ציטוטים סמויים';
    }
    if (status) status.classList.toggle('hidden', !busy);
}

function showProofingError(msg) {
    const el = document.getElementById('proofingError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    el.classList.remove('proof-notice');
    el.classList.add('proof-error');
}

function showProofingNotice(msg) {
    const el = document.getElementById('proofingError');
    if (!el) return;
    el.textContent = '✓ ' + msg;
    el.classList.remove('hidden');
    el.classList.remove('proof-error');
    el.classList.add('proof-notice');
    // הסתרה אוטומטית אחרי 5 שניות
    setTimeout(() => {
        if (el.classList.contains('proof-notice')) el.classList.add('hidden');
    }, 5000);
}

function hideProofingError() {
    const el = document.getElementById('proofingError');
    if (el) el.classList.add('hidden');
}

// עדכון בורר המקור (גולמי/ערוך) לכל כלי ההגהה
function setProofingTarget(target) {
    proofingTarget = (target === 'raw') ? 'raw' : 'edited';
}

/* =======================================================
   אינטגרציה עם מערכת הפרויקטים
   ======================================================= */

function collectProofingIntoProject(proj) {
    if (!proj) return;
    proj.proofing = {
        target: proofingTarget,
        spellingResults: proofingSpellingResults.slice(),
        consistencyResults: proofingConsistencyResults.slice(),
        hiddenCitations: proofingHiddenCitations.slice()
    };
}

function applyProofingFromProject(proj) {
    if (!proj || !proj.proofing) {
        proofingSpellingResults = [];
        proofingConsistencyResults = [];
        proofingHiddenCitations = [];
        proofingTarget = 'edited';
        renderSpellingResults();
        renderConsistencyResults();
        renderHiddenCitations();
        return;
    }
    const p = proj.proofing;
    proofingTarget = p.target || 'edited';
    proofingSpellingResults = Array.isArray(p.spellingResults) ? p.spellingResults.slice() : [];
    proofingConsistencyResults = Array.isArray(p.consistencyResults) ? p.consistencyResults.slice() : [];
    proofingHiddenCitations = Array.isArray(p.hiddenCitations) ? p.hiddenCitations.slice() : [];
    // עדכון בורר המקור ב-UI
    const radio = document.querySelector('input[name="proofingTarget"][value="' + proofingTarget + '"]');
    if (radio) radio.checked = true;
    renderSpellingResults();
    renderConsistencyResults();
    renderHiddenCitations();
}

/* =======================================================
   אתחול
   ======================================================= */

function initProofingTab() {
    // בורר ברירת-מחדל
    const def = document.querySelector('input[name="proofingTarget"][value="edited"]');
    if (def) def.checked = true;
    // מאזיני בורר המקור
    document.querySelectorAll('input[name="proofingTarget"]').forEach(r => {
        r.addEventListener('change', () => setProofingTarget(r.value));
    });
    // רינדור ראשוני
    renderSpellingResults();
    renderConsistencyResults();
    renderHiddenCitations();
}

document.addEventListener('DOMContentLoaded', () => {
    try { initProofingTab(); } catch (e) { console.warn('initProofingTab:', e); }
});
