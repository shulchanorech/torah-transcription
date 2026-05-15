/* =======================================================
   ארגז כלים לעורך תורני — v9
   sefaria.js — שכבת אינטגרציה עם Sefaria API + טאב מקורות
   שלב ב': זיהוי ציטוטים, אימות, תצוגת מקור, מפתח מקורות, חיפוש
   ======================================================= */

/* =======================================================
   קבועים והגדרות
   ======================================================= */
const SEFARIA_BASE = 'https://www.sefaria.org';
const SEFARIA_FINDREFS_URL = SEFARIA_BASE + '/api/find-refs';
const SEFARIA_ASYNC_URL = SEFARIA_BASE + '/api/async/';
const SEFARIA_TEXTS_URL = SEFARIA_BASE + '/api/texts/';
const SEFARIA_NAME_URL = SEFARIA_BASE + '/api/name/';
const SEFARIA_SEARCH_URL = SEFARIA_BASE + '/api/search-wrapper';

// הגדרות polling ל-async task
const ASYNC_POLL_INTERVAL_MS = 1200;   // מרווח בין בדיקות
const ASYNC_MAX_POLLS = 50;            // מקסימום ניסיונות (~60 שניות)
const FETCH_TIMEOUT_MS = 30000;        // timeout לכל קריאת רשת

// גודל מקסימלי של גוף טקסט לשליחה אחת ל-find-refs
// (find-refs יכול לטפל בטקסטים ארוכים, אבל נחתוך לבטיחות)
const FINDREFS_MAX_CHARS = 9000;

/* =======================================================
   מצב גלובלי של מודול המקורות
   ======================================================= */
let sefariaScanResults = [];      // [{ startChar, endChar, text, linkFailed, refs, chosenRef, refData, status }]
let sefariaScanInProgress = false;
let sefariaScanAborted = false;
let sourcesIndexData = [];        // מפתח מקורות מקובץ
let sefariaTextCache = {};        // cache: ref -> { he, en, heRef, url, fetchedAt }
let currentSourceScanTarget = 'edited';  // 'raw' | 'edited' — איזה טקסט לסרוק

/* =======================================================
   עזרי רשת — fetch עם timeout + טיפול בשגיאות
   ======================================================= */

// fetch עטוף עם timeout ו-AbortController
async function sefariaFetch(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timer);
        return resp;
    } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
            throw new Error('הקריאה ל-Sefaria חרגה מזמן ההמתנה (timeout).');
        }
        // שגיאת רשת / CORS — fetch זורק TypeError
        throw new Error('שגיאת רשת בקריאה ל-Sefaria: ' + (err.message || err));
    }
}

// GET עם fallback ל-JSONP אם CORS חוסם.
// ה-GET endpoints של Sefaria תומכים ב-callback= ל-JSONP.
async function sefariaGetJSON(url) {
    // ניסיון ראשון — fetch רגיל (CORS)
    try {
        const resp = await sefariaFetch(url, { headers: { 'Accept': 'application/json' } });
        if (resp.ok) {
            return await resp.json();
        }
        // אם זה 404 וכד' — נחזיר שגיאה ברורה, לא ננסה JSONP
        if (resp.status === 404) throw new Error('לא נמצא (404): ' + url);
        throw new Error('Sefaria החזיר קוד ' + resp.status);
    } catch (err) {
        // אם נראה כמו בעיית CORS/רשת — ננסה JSONP
        if (/שגיאת רשת|Failed to fetch|NetworkError|CORS/i.test(err.message)) {
            try {
                return await sefariaJSONP(url);
            } catch (jsonpErr) {
                throw new Error('הקריאה ל-Sefaria נכשלה (גם ב-JSONP): ' + jsonpErr.message);
            }
        }
        throw err;
    }
}

// JSONP — הוספת <script> עם callback. עובד רק על GET endpoints.
function sefariaJSONP(url, timeoutMs = FETCH_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
        const cbName = '__sefariaJSONP_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        const sep = url.includes('?') ? '&' : '?';
        const script = document.createElement('script');
        let done = false;
        const cleanup = () => {
            try { delete window[cbName]; } catch (e) { window[cbName] = undefined; }
            if (script.parentNode) script.parentNode.removeChild(script);
        };
        const timer = setTimeout(() => {
            if (done) return;
            done = true; cleanup();
            reject(new Error('JSONP timeout'));
        }, timeoutMs);
        window[cbName] = (data) => {
            if (done) return;
            done = true; clearTimeout(timer); cleanup();
            resolve(data);
        };
        script.onerror = () => {
            if (done) return;
            done = true; clearTimeout(timer); cleanup();
            reject(new Error('JSONP script error'));
        };
        script.src = url + sep + 'callback=' + cbName;
        document.head.appendChild(script);
    });
}

/* =======================================================
   find-refs — זיהוי ציטוטים בטקסט (אסינכרוני)
   ======================================================= */

// שולח טקסט ל-find-refs, מחזיר task_id.
// find-refs הוא POST — אם CORS חוסם, אין fallback ל-JSONP (JSONP רק ל-GET).
async function sefariaSubmitFindRefs(bodyText, titleText, lang) {
    const payload = {
        text: {
            title: titleText || '',
            body: bodyText || ''
        },
        lang: lang || 'he'
    };
    let resp;
    try {
        resp = await sefariaFetch(SEFARIA_FINDREFS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        throw new Error('לא ניתן לשלוח את הטקסט ל-Sefaria. ייתכן שהדפדפן חוסם את הקריאה (CORS), ' +
            'או שאין חיבור לאינטרנט. פרטים: ' + err.message);
    }
    // find-refs מחזיר 202 עם task_id, או לפעמים 200 עם התוצאה ישירות
    let data;
    try {
        data = await resp.json();
    } catch (e) {
        throw new Error('תשובת Sefaria אינה JSON תקין (קוד ' + resp.status + ').');
    }
    if (!resp.ok && resp.status !== 202) {
        throw new Error('Sefaria החזיר קוד ' + resp.status + (data && data.error ? (': ' + data.error) : ''));
    }
    return data; // { task_id } או { result } או { title, body } ישירות
}

// בודק את ה-async task עד שמוכן. מחזיר את ה-result.
async function sefariaPollAsyncTask(taskId, onProgress) {
    for (let i = 0; i < ASYNC_MAX_POLLS; i++) {
        if (sefariaScanAborted) throw new Error('הסריקה בוטלה.');
        if (onProgress) onProgress(i + 1, ASYNC_MAX_POLLS);
        await new Promise(r => setTimeout(r, ASYNC_POLL_INTERVAL_MS));
        if (sefariaScanAborted) throw new Error('הסריקה בוטלה.');

        let data;
        try {
            const resp = await sefariaFetch(SEFARIA_ASYNC_URL + encodeURIComponent(taskId));
            data = await resp.json();
        } catch (err) {
            // ננסה שוב — שגיאת רשת חולפת
            continue;
        }
        const state = data.state || '';
        if (data.ready === true || state === 'SUCCESS') {
            if (data.result) return data.result;
            // לפעמים ה-result מוטמע אחרת
            return data;
        }
        if (state === 'FAILURE') {
            throw new Error('Sefaria נכשל בעיבוד: ' + (data.error || 'שגיאה לא ידועה'));
        }
        // PENDING / RECEIVED / STARTED / RETRY — ממשיכים
    }
    throw new Error('Sefaria לא סיים את העיבוד בזמן. נסה שוב, או עם קטע טקסט קצר יותר.');
}

// פונקציית-על: שולח טקסט, מחכה, ומחזיר את ה-result המנורמל.
async function sefariaFindRefs(bodyText, titleText, lang, onProgress) {
    const submitData = await sefariaSubmitFindRefs(bodyText, titleText, lang);

    // מקרה 1: התשובה כבר מכילה result (סינכרוני)
    if (submitData.result) {
        return submitData.result;
    }
    // מקרה 2: התשובה היא ישירות { title, body } (וריאציה אפשרית)
    if (submitData.title || submitData.body) {
        return submitData;
    }
    // מקרה 3: התקבל task_id — צריך polling
    if (submitData.task_id) {
        return await sefariaPollAsyncTask(submitData.task_id, onProgress);
    }
    throw new Error('תשובת Sefaria לא מוכרת — אין task_id ואין result.');
}

/* =======================================================
   נרמול תוצאות find-refs — parser גמיש
   מתמודד עם וריאציות במבנה התשובה
   ======================================================= */

// מקבל את אובייקט ה-result ומחזיר מערך אחיד של ציטוטים.
// כל ציטוט: { startChar, endChar, text, linkFailed, refs[], chosenRef, refData, status, source }
function normalizeFindRefsResult(result, offsetMap) {
    const out = [];
    if (!result || typeof result !== 'object') return out;

    // result אמור להכיל title ו/או body
    ['title', 'body'].forEach(section => {
        const sectionData = result[section];
        if (!sectionData || typeof sectionData !== 'object') return;
        const results = Array.isArray(sectionData.results) ? sectionData.results : [];
        const refData = sectionData.refData && typeof sectionData.refData === 'object'
            ? sectionData.refData : {};
        results.forEach(r => {
            if (!r || typeof r !== 'object') return;
            const refs = Array.isArray(r.refs) ? r.refs.filter(x => typeof x === 'string') : [];
            const chosenRef = refs.length > 0 ? refs[0] : null;
            // איסוף refData עבור כל ה-refs האפשריים
            const collectedRefData = {};
            refs.forEach(ref => {
                if (refData[ref]) collectedRefData[ref] = refData[ref];
            });
            // קביעת סטטוס
            let status;
            if (r.linkFailed === true) {
                status = 'failed';     // זוהה אבל לא קושר למקור
            } else if (refs.length === 0) {
                status = 'failed';
            } else if (refs.length > 1) {
                status = 'ambiguous';  // יותר ממקור אחד אפשרי
            } else {
                status = 'verified';   // קושר בהצלחה למקור יחיד
            }
            // התאמת מיקום אם נשלח offset (כשחותכים טקסט לקטעים)
            const baseOffset = (offsetMap && typeof offsetMap[section] === 'number')
                ? offsetMap[section] : 0;
            out.push({
                section: section,
                startChar: (typeof r.startChar === 'number' ? r.startChar : 0) + baseOffset,
                endChar: (typeof r.endChar === 'number' ? r.endChar : 0) + baseOffset,
                text: typeof r.text === 'string' ? r.text : '',
                linkFailed: r.linkFailed === true,
                refs: refs,
                chosenRef: chosenRef,
                refData: collectedRefData,
                status: status
            });
        });
    });
    return out;
}

/* =======================================================
   GET /api/texts — שליפת טקסט מקור לתצוגה/אימות
   ======================================================= */

// שולף את הטקסט של ref מסוים. מחזיר { he, en, heRef, url, ref }.
async function sefariaGetText(ref, opts = {}) {
    if (!ref) throw new Error('לא צוין ref.');
    // cache
    if (sefariaTextCache[ref] && !opts.noCache) {
        return sefariaTextCache[ref];
    }
    // בניית URL — context=0 כדי לקבל רק את הקטע המבוקש
    const encoded = encodeURIComponent(ref).replace(/%20/g, '_');
    const url = SEFARIA_TEXTS_URL + encoded + '?context=0&commentary=0';
    const data = await sefariaGetJSON(url);
    if (data && data.error) {
        throw new Error('Sefaria: ' + data.error);
    }
    // נרמול — he/text יכולים להיות מחרוזת או מערך
    const normalizeText = v => {
        if (Array.isArray(v)) return v.join('\n');
        if (typeof v === 'string') return v;
        return '';
    };
    const entry = {
        ref: data.ref || ref,
        heRef: data.heRef || ref,
        he: normalizeText(data.he),
        en: normalizeText(data.text),
        url: (data.ref || ref).replace(/ /g, '_').replace(/:/g, '.'),
        fetchedAt: new Date().toISOString()
    };
    sefariaTextCache[ref] = entry;
    return entry;
}

/* =======================================================
   GET /api/name — פתרון שמות (לציטוטים מעורפלים)
   ======================================================= */

async function sefariaGetName(name) {
    if (!name) throw new Error('לא צוין שם.');
    const url = SEFARIA_NAME_URL + encodeURIComponent(name) + '?limit=8';
    const data = await sefariaGetJSON(url);
    return data; // { lang, is_ref, completions, ... }
}

/* =======================================================
   חיפוש מקורות חופשי לפי נושא
   משתמש ב-Search API של Sefaria
   ======================================================= */

async function sefariaSearchTopic(query, opts = {}) {
    if (!query || !query.trim()) throw new Error('לא הוזן ביטוי לחיפוש.');
    const size = opts.size || 12;
    // Sefaria search-wrapper הוא POST. אם CORS חוסם — ננסה את endpoint הישן עם GET.
    const payload = {
        query: query.trim(),
        type: 'text',
        size: size,
        field: 'naive_lemmatizer'
    };
    try {
        const resp = await sefariaFetch(SEFARIA_SEARCH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            const data = await resp.json();
            return normalizeSearchResults(data);
        }
        throw new Error('קוד ' + resp.status);
    } catch (err) {
        // fallback: endpoint חיפוש ישן עם GET (תומך JSONP)
        try {
            const url = SEFARIA_BASE + '/api/search?q=' + encodeURIComponent(query.trim()) +
                '&type=text&size=' + size;
            const data = await sefariaGetJSON(url);
            return normalizeSearchResults(data);
        } catch (fallbackErr) {
            throw new Error('חיפוש המקורות נכשל. ייתכן שהדפדפן חוסם את הקריאה (CORS). ' +
                'פרטים: ' + err.message);
        }
    }
}

// נרמול תוצאות חיפוש — מבנה Elasticsearch של Sefaria
function normalizeSearchResults(data) {
    const out = [];
    if (!data) return out;
    // המבנה: data.hits.hits[] עם _source / highlight
    let hits = [];
    if (data.hits && Array.isArray(data.hits.hits)) {
        hits = data.hits.hits;
    } else if (Array.isArray(data.hits)) {
        hits = data.hits;
    } else if (Array.isArray(data.results)) {
        hits = data.results;
    }
    hits.forEach(h => {
        const src = h._source || h.source || h || {};
        const ref = src.ref || h.ref || (h._id || '');
        if (!ref) return;
        let snippet = '';
        if (h.highlight) {
            const hl = h.highlight;
            const firstKey = Object.keys(hl)[0];
            if (firstKey && Array.isArray(hl[firstKey])) snippet = hl[firstKey].join(' … ');
        }
        if (!snippet) {
            snippet = src.he || src.exact || src.naive_lemmatizer || '';
            if (Array.isArray(snippet)) snippet = snippet.join(' ');
        }
        out.push({
            ref: ref,
            heRef: src.heRef || ref,
            category: src.primary_category || src.category || (Array.isArray(src.categories) ? src.categories[0] : ''),
            snippet: typeof snippet === 'string' ? snippet : '',
            version: src.version || ''
        });
    });
    return out;
}

/* =======================================================
   חיתוך טקסט ארוך לקטעים ל-find-refs
   ======================================================= */

// אם הטקסט ארוך מ-FINDREFS_MAX_CHARS, חותכים לקטעים על גבולות פסקה/משפט.
// מחזיר מערך של { text, offset } כדי שנוכל לתקן את המיקומים אחר כך.
function splitTextForFindRefs(text) {
    if (!text || text.length <= FINDREFS_MAX_CHARS) {
        return [{ text: text || '', offset: 0 }];
    }
    const chunks = [];
    let pos = 0;
    while (pos < text.length) {
        let end = Math.min(text.length, pos + FINDREFS_MAX_CHARS);
        if (end < text.length) {
            // לחפש גבול טבעי אחורה — שורה ריקה, ואז newline, ואז רווח
            const window = text.slice(pos, end);
            let cut = window.lastIndexOf('\n\n');
            if (cut < FINDREFS_MAX_CHARS * 0.5) cut = window.lastIndexOf('\n');
            if (cut < FINDREFS_MAX_CHARS * 0.5) cut = window.lastIndexOf(' ');
            if (cut > FINDREFS_MAX_CHARS * 0.3) end = pos + cut;
        }
        chunks.push({ text: text.slice(pos, end), offset: pos });
        pos = end;
    }
    return chunks;
}

/* =======================================================
   סריקה מלאה — הפונקציה הראשית של טאב מקורות
   ======================================================= */

// סורק את הטקסט הנבחר, מזהה ציטוטים, ומעדכן את ה-UI.
async function runSourceScan() {
    if (sefariaScanInProgress) return;

    // בחירת מקור הטקסט
    const targetRadio = document.querySelector('input[name="sourceScanTarget"]:checked');
    currentSourceScanTarget = targetRadio ? targetRadio.value : 'edited';
    const sourceElId = currentSourceScanTarget === 'raw' ? 'rawTranscript' : 'editedTranscript';
    const sourceEl = document.getElementById(sourceElId);
    const text = sourceEl ? sourceEl.value.trim() : '';

    if (!text) {
        showSourcesError(currentSourceScanTarget === 'raw'
            ? 'אין תמלול גולמי לסריקה. עבור לטאב "קליטת חומר" או טען תמלול.'
            : 'אין תמלול ערוך לסריקה. בצע עריכה בטאב "עריכה והגהה", או בחר לסרוק את הגולמי.');
        return;
    }

    sefariaScanInProgress = true;
    sefariaScanAborted = false;
    sefariaScanResults = [];
    hideSourcesError();
    setSourceScanUIState(true);

    const statusEl = document.getElementById('sourceScanStatus');
    const statusText = document.getElementById('sourceScanStatusText');
    if (statusEl) statusEl.classList.remove('hidden');

    try {
        // ננקה timestamps מהטקסט לפני שליחה — הם מבלבלים את ה-linker
        const cleanText = typeof stripTimestamps === 'function'
            ? stripTimestamps(text) : text;

        const chunks = splitTextForFindRefs(cleanText);
        let allResults = [];

        for (let ci = 0; ci < chunks.length; ci++) {
            if (sefariaScanAborted) throw new Error('הסריקה בוטלה.');
            const chunk = chunks[ci];
            if (statusText) {
                statusText.textContent = chunks.length > 1
                    ? `סורק קטע ${ci + 1}/${chunks.length}... שולח ל-Sefaria`
                    : 'שולח את הטקסט ל-Sefaria לזיהוי ציטוטים...';
            }

            const result = await sefariaFindRefs(
                chunk.text, '', 'he',
                (poll, max) => {
                    if (statusText) {
                        statusText.textContent = chunks.length > 1
                            ? `קטע ${ci + 1}/${chunks.length}: ממתין לתוצאות Sefaria... (${poll})`
                            : `ממתין לתוצאות Sefaria... (בדיקה ${poll})`;
                    }
                }
            );

            // נרמול — כל הציטוטים מהקטע הזה ממופים ל-body (שלחנו רק body)
            const normalized = normalizeFindRefsResult(result, { body: chunk.offset, title: chunk.offset });
            allResults = allResults.concat(normalized);
        }

        // מיון לפי מיקום בטקסט + הסרת כפילויות חופפות
        allResults = dedupeAndSortResults(allResults);
        sefariaScanResults = allResults;

        // בניית מפתח המקורות
        buildSourcesIndex();

        // עדכון ה-UI
        renderSourcesList();
        renderSourcesIndex();
        renderHighlightedText(text);

        if (statusText) {
            const verified = allResults.filter(r => r.status === 'verified').length;
            const ambiguous = allResults.filter(r => r.status === 'ambiguous').length;
            const failed = allResults.filter(r => r.status === 'failed').length;
            statusText.textContent = `✓ הסריקה הושלמה: ${allResults.length} ציטוטים זוהו ` +
                `(${verified} אומתו, ${ambiguous} מעורפלים, ${failed} לא אומתו).`;
        }

        // שמירה בפרויקט
        if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();

        if (typeof sendDesktopNotification === 'function') {
            sendDesktopNotification('סריקת מקורות הושלמה',
                allResults.length + ' ציטוטים זוהו בשיעור.');
        }
    } catch (err) {
        showSourcesError('שגיאה בסריקת המקורות: ' + err.message);
        if (statusText) statusText.textContent = 'הסריקה נעצרה.';
    } finally {
        sefariaScanInProgress = false;
        setSourceScanUIState(false);
        setTimeout(() => {
            const se = document.getElementById('sourceScanStatus');
            if (se && !sefariaScanInProgress) se.classList.add('hidden');
        }, 4000);
    }
}

function abortSourceScan() {
    sefariaScanAborted = true;
}

// הסרת כפילויות — אם שני ציטוטים חופפים במיקום, שומרים את הארוך/המאומת
function dedupeAndSortResults(results) {
    const sorted = results.slice().sort((a, b) => a.startChar - b.startChar);
    const out = [];
    for (const r of sorted) {
        const last = out[out.length - 1];
        if (last && r.startChar < last.endChar) {
            // חפיפה — נשמור את הטוב יותר
            const rScore = (r.status === 'verified' ? 2 : r.status === 'ambiguous' ? 1 : 0)
                + (r.endChar - r.startChar) / 1000;
            const lastScore = (last.status === 'verified' ? 2 : last.status === 'ambiguous' ? 1 : 0)
                + (last.endChar - last.startChar) / 1000;
            if (rScore > lastScore) out[out.length - 1] = r;
        } else {
            out.push(r);
        }
    }
    return out;
}

/* =======================================================
   מפתח מקורות — קיבוץ הציטוטים לפי ספר/מסכת
   ======================================================= */

function buildSourcesIndex() {
    const groups = {};
    sefariaScanResults.forEach(r => {
        if (!r.chosenRef) return;
        // חילוץ שם הספר/מסכת — החלק לפני המספרים
        const refData = r.refData[r.chosenRef] || {};
        const category = refData.primaryCategory || 'אחר';
        // שם בסיס: הכל עד המספר הראשון
        const baseName = extractBaseName(r.chosenRef);
        const heBase = refData.heRef ? extractBaseName(refData.heRef) : baseName;
        const key = category + '|' + baseName;
        if (!groups[key]) {
            groups[key] = {
                category: category,
                baseName: baseName,
                heBaseName: heBase,
                refs: []
            };
        }
        groups[key].refs.push({
            ref: r.chosenRef,
            heRef: refData.heRef || r.chosenRef,
            text: r.text,
            status: r.status,
            url: refData.url || ''
        });
    });
    // המרה למערך ממוין
    sourcesIndexData = Object.values(groups).sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.baseName.localeCompare(b.baseName);
    });
    return sourcesIndexData;
}

// חילוץ שם בסיס מתוך ref — "Berakhot 2a:5" -> "Berakhot", "איוב י״ז:א׳" -> "איוב"
function extractBaseName(ref) {
    if (!ref) return '';
    // חיתוך בנקודה הראשונה שיש אחריה ספרה, או במספר
    // עברית: חיתוך לפני אותיות-מספר עם גרשיים
    let m = ref.match(/^(.+?)\s+[\dא-ת]['"׳״]?[\dא-ת]*/);
    if (m) return m[1].trim();
    m = ref.match(/^(.+?)[\s:.]+\d/);
    if (m) return m[1].trim();
    // אין מספרים — מחזירים כמו שהוא
    return ref.trim();
}

/* =======================================================
   ייצוא מפתח המקורות
   ======================================================= */

function exportSourcesIndex() {
    if (!sourcesIndexData || sourcesIndexData.length === 0) {
        showSourcesError('אין מפתח מקורות לייצוא. הרץ סריקה קודם.');
        return;
    }
    let txt = 'מפתח מקורות\n';
    txt += '═══════════════\n\n';
    let total = 0;
    sourcesIndexData.forEach(group => {
        txt += `▪ ${group.heBaseName || group.baseName}`;
        if (group.category) txt += `  (${group.category})`;
        txt += '\n';
        // מיון ה-refs בתוך הקבוצה
        const refs = group.refs.slice().sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
        refs.forEach(r => {
            const mark = r.status === 'verified' ? '✓' : r.status === 'ambiguous' ? '?' : '✗';
            txt += `   ${mark} ${r.heRef}\n`;
            total++;
        });
        txt += '\n';
    });
    txt += `───────────────\nסה"כ ${total} מקורות ב-${sourcesIndexData.length} ספרים/מסכתות.\n`;
    txt += `נוצר: ${new Date().toLocaleString('he-IL')}\n`;

    // הורדה כקובץ
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const projName = (typeof activeProject !== 'undefined' && activeProject)
        ? activeProject.name : 'שיעור';
    a.download = 'מפתח_מקורות_' + projName + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =======================================================
   העתקת מפתח המקורות ללוח
   ======================================================= */

function copySourcesIndex() {
    if (!sourcesIndexData || sourcesIndexData.length === 0) {
        showSourcesError('אין מפתח מקורות להעתקה.');
        return;
    }
    let txt = '';
    sourcesIndexData.forEach(group => {
        const refs = group.refs.slice().sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
        const refList = refs.map(r => r.heRef).join('; ');
        txt += `${group.heBaseName || group.baseName}: ${refList}\n`;
    });
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => {
            const btn = document.getElementById('copySourcesIndexBtn');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = '✓ הועתק';
                setTimeout(() => { btn.textContent = orig; }, 1500);
            }
        }).catch(() => showSourcesError('ההעתקה נכשלה.'));
    } else {
        showSourcesError('הדפדפן לא תומך בהעתקה אוטומטית.');
    }
}

/* =======================================================
   UI — רינדור רשימת הציטוטים
   ======================================================= */

function renderSourcesList() {
    const container = document.getElementById('sourcesListContainer');
    if (!container) return;
    container.innerHTML = '';

    if (sefariaScanResults.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-sm p-3">לא זוהו ציטוטים. ' +
            'ייתכן שאין בטקסט מראי-מקומות בפורמט שזוהה, או שהסריקה טרם רצה.</p>';
        return;
    }

    sefariaScanResults.forEach((r, idx) => {
        const item = document.createElement('div');
        item.className = 'source-item source-' + r.status;
        item.id = 'sourceItem_' + idx;

        const statusBadge = {
            verified: '<span class="src-badge src-badge-verified">✓ אומת</span>',
            ambiguous: '<span class="src-badge src-badge-ambiguous">? מעורפל</span>',
            failed: '<span class="src-badge src-badge-failed">✗ לא אומת</span>'
        }[r.status] || '';

        // שורת כותרת
        const header = document.createElement('div');
        header.className = 'source-item-header';
        const refDisplay = r.chosenRef && r.refData[r.chosenRef]
            ? (r.refData[r.chosenRef].heRef || r.chosenRef)
            : (r.refs.length > 0 ? r.refs.join(' / ') : 'לא זוהה מקור');
        header.innerHTML =
            '<div class="src-quote">"' + escapeHtmlV9(r.text) + '"</div>' +
            '<div class="src-ref-line">' + statusBadge +
            ' <span class="src-ref">' + escapeHtmlV9(refDisplay) + '</span></div>';
        item.appendChild(header);

        // אם מעורפל — להציג את כל האפשרויות
        if (r.status === 'ambiguous' && r.refs.length > 1) {
            const opts = document.createElement('div');
            opts.className = 'src-ambiguous-opts';
            opts.innerHTML = '<span class="src-opts-label">בחר את המקור הנכון:</span>';
            r.refs.forEach(ref => {
                const rd = r.refData[ref] || {};
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'src-opt-btn' + (ref === r.chosenRef ? ' src-opt-active' : '');
                btn.textContent = rd.heRef || ref;
                btn.onclick = () => chooseAmbiguousRef(idx, ref);
                opts.appendChild(btn);
            });
            item.appendChild(opts);
        }

        // כפתורי פעולה
        const actions = document.createElement('div');
        actions.className = 'src-actions';
        if (r.chosenRef) {
            const viewBtn = document.createElement('button');
            viewBtn.type = 'button';
            viewBtn.className = 'src-action-btn';
            viewBtn.textContent = '📖 הצג מקור';
            viewBtn.onclick = () => showSourceText(idx);
            actions.appendChild(viewBtn);

            const linkBtn = document.createElement('a');
            linkBtn.className = 'src-action-btn src-action-link';
            const rd = r.refData[r.chosenRef] || {};
            linkBtn.href = SEFARIA_BASE + '/' + (rd.url || r.chosenRef.replace(/ /g, '_'));
            linkBtn.target = '_blank';
            linkBtn.rel = 'noopener';
            linkBtn.textContent = '↗ פתח ב-Sefaria';
            actions.appendChild(linkBtn);
        }
        item.appendChild(actions);

        // אזור תצוגת טקסט המקור (נטען בלחיצה)
        const textArea = document.createElement('div');
        textArea.className = 'src-text-display hidden';
        textArea.id = 'srcTextDisplay_' + idx;
        item.appendChild(textArea);

        container.appendChild(item);
    });
}

// בחירת ref מבין אפשרויות מעורפלות
function chooseAmbiguousRef(idx, ref) {
    const r = sefariaScanResults[idx];
    if (!r) return;
    r.chosenRef = ref;
    r.status = 'verified'; // המשתמש בחר — נחשב מאומת
    buildSourcesIndex();
    renderSourcesList();
    renderSourcesIndex();
    const rawEl = document.getElementById('rawTranscript');
    const edEl = document.getElementById('editedTranscript');
    const txt = currentSourceScanTarget === 'raw'
        ? (rawEl ? rawEl.value : '')
        : (edEl ? edEl.value : '');
    renderHighlightedText(txt);
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
}

/* =======================================================
   UI — תצוגת טקסט המקור
   ======================================================= */

async function showSourceText(idx) {
    const r = sefariaScanResults[idx];
    if (!r || !r.chosenRef) return;
    const display = document.getElementById('srcTextDisplay_' + idx);
    if (!display) return;

    // toggle — אם כבר פתוח, סגור
    if (!display.classList.contains('hidden') && display.dataset.loaded === 'true') {
        display.classList.add('hidden');
        display.dataset.loaded = 'false';
        return;
    }

    display.classList.remove('hidden');
    display.innerHTML = '<div class="src-loading">טוען את טקסט המקור מ-Sefaria...</div>';

    try {
        const textData = await sefariaGetText(r.chosenRef);
        let html = '';
        if (textData.he) {
            html += '<div class="src-text-he" dir="rtl">' + escapeHtmlV9(textData.he) + '</div>';
        }
        if (textData.en) {
            html += '<div class="src-text-en" dir="ltr">' + escapeHtmlV9(textData.en) + '</div>';
        }
        if (!textData.he && !textData.en) {
            html = '<div class="src-loading">לא נמצא טקסט עבור מקור זה ב-Sefaria.</div>';
        }
        html += '<div class="src-text-ref-footer">' + escapeHtmlV9(textData.heRef || r.chosenRef) + '</div>';
        display.innerHTML = html;
        display.dataset.loaded = 'true';
    } catch (err) {
        display.innerHTML = '<div class="src-error">שגיאה בטעינת המקור: ' +
            escapeHtmlV9(err.message) + '</div>';
        display.dataset.loaded = 'false';
    }
}

/* =======================================================
   UI — הדגשת ציטוטים בטקסט
   ======================================================= */

function renderHighlightedText(originalText) {
    const container = document.getElementById('sourcesHighlightView');
    if (!container) return;

    if (!originalText || sefariaScanResults.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">' +
            'הרץ סריקה כדי לראות את הציטוטים מודגשים בטקסט.</p>';
        return;
    }

    // הטקסט שהוצג ב-find-refs היה אחרי stripTimestamps — צריך לעבוד על אותו טקסט
    const cleanText = typeof stripTimestamps === 'function'
        ? stripTimestamps(originalText) : originalText;

    // בניית HTML עם הדגשות. המיקומים הם על cleanText.
    let html = '';
    let cursor = 0;
    const sorted = sefariaScanResults.slice().sort((a, b) => a.startChar - b.startChar);
    sorted.forEach((r, i) => {
        const start = Math.max(cursor, r.startChar);
        const end = r.endChar;
        if (start >= end || start > cleanText.length) return;
        // טקסט רגיל לפני ההדגשה
        if (start > cursor) {
            html += escapeHtmlV9(cleanText.slice(cursor, start));
        }
        // הקטע המודגש
        const segment = cleanText.slice(start, Math.min(end, cleanText.length));
        const cls = 'cite-highlight cite-' + r.status;
        const refTitle = r.chosenRef
            ? (r.refData[r.chosenRef] && r.refData[r.chosenRef].heRef ? r.refData[r.chosenRef].heRef : r.chosenRef)
            : 'לא זוהה מקור';
        html += '<span class="' + cls + '" title="' + escapeHtmlV9(refTitle) +
            '" onclick="scrollToSourceItem(' + i + ')">' +
            escapeHtmlV9(segment) + '</span>';
        cursor = Math.min(end, cleanText.length);
    });
    // שארית הטקסט
    if (cursor < cleanText.length) {
        html += escapeHtmlV9(cleanText.slice(cursor));
    }

    container.innerHTML = html;
}

// גלילה לפריט בודד ברשימת המקורות (מהטקסט המודגש)
function scrollToSourceItem(idx) {
    const item = document.getElementById('sourceItem_' + idx);
    if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.classList.add('source-item-flash');
        setTimeout(() => item.classList.remove('source-item-flash'), 1500);
    }
}

/* =======================================================
   UI — רינדור מפתח המקורות
   ======================================================= */

function renderSourcesIndex() {
    const container = document.getElementById('sourcesIndexContainer');
    if (!container) return;
    container.innerHTML = '';

    if (!sourcesIndexData || sourcesIndexData.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-sm">מפתח המקורות ייבנה אוטומטית אחרי הסריקה.</p>';
        return;
    }

    sourcesIndexData.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'src-index-group';
        const refs = group.refs.slice().sort((a, b) =>
            a.ref.localeCompare(b.ref, undefined, { numeric: true }));
        const refsHtml = refs.map(r => {
            const mark = r.status === 'verified' ? '✓' : r.status === 'ambiguous' ? '?' : '✗';
            const cls = 'src-index-ref src-index-' + r.status;
            return '<span class="' + cls + '">' + mark + ' ' + escapeHtmlV9(r.heRef) + '</span>';
        }).join('');
        groupEl.innerHTML =
            '<div class="src-index-group-title">' + escapeHtmlV9(group.heBaseName || group.baseName) +
            (group.category ? ' <span class="src-index-cat">' + escapeHtmlV9(group.category) + '</span>' : '') +
            '</div>' +
            '<div class="src-index-refs">' + refsHtml + '</div>';
        container.appendChild(groupEl);
    });

    // סיכום
    const totalRefs = sourcesIndexData.reduce((s, g) => s + g.refs.length, 0);
    const summary = document.createElement('div');
    summary.className = 'src-index-summary';
    summary.textContent = `סה"כ ${totalRefs} מקורות ב-${sourcesIndexData.length} ספרים/מסכתות.`;
    container.appendChild(summary);
}

/* =======================================================
   חיפוש מקורות חופשי לפי נושא
   ======================================================= */

async function runTopicSearch() {
    const input = document.getElementById('topicSearchInput');
    const query = input ? input.value.trim() : '';
    if (!query) {
        showSourcesError('הזן ביטוי או נושא לחיפוש.');
        return;
    }
    const resultsContainer = document.getElementById('topicSearchResults');
    const btn = document.getElementById('topicSearchBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ מחפש...'; }
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="src-loading">מחפש ב-Sefaria...</div>';
    }
    hideSourcesError();

    try {
        const results = await sefariaSearchTopic(query, { size: 15 });
        if (!resultsContainer) return;
        if (results.length === 0) {
            resultsContainer.innerHTML = '<p class="text-gray-500 text-sm">לא נמצאו תוצאות עבור "' +
                escapeHtmlV9(query) + '".</p>';
            return;
        }
        resultsContainer.innerHTML = '';
        results.forEach(res => {
            const item = document.createElement('div');
            item.className = 'topic-result-item';
            item.innerHTML =
                '<div class="topic-result-ref">' + escapeHtmlV9(res.heRef || res.ref) +
                (res.category ? ' <span class="topic-result-cat">' + escapeHtmlV9(res.category) + '</span>' : '') +
                '</div>' +
                (res.snippet ? '<div class="topic-result-snippet" dir="rtl">' +
                    res.snippet + '</div>' : '');
            const linkRow = document.createElement('div');
            linkRow.className = 'topic-result-actions';
            const openLink = document.createElement('a');
            openLink.className = 'src-action-btn src-action-link';
            openLink.href = SEFARIA_BASE + '/' + res.ref.replace(/ /g, '_');
            openLink.target = '_blank';
            openLink.rel = 'noopener';
            openLink.textContent = '↗ פתח ב-Sefaria';
            linkRow.appendChild(openLink);
            item.appendChild(linkRow);
            resultsContainer.appendChild(item);
        });
    } catch (err) {
        if (resultsContainer) {
            resultsContainer.innerHTML = '<div class="src-error">' + escapeHtmlV9(err.message) + '</div>';
        }
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '🔍 חפש'; }
    }
}

/* =======================================================
   עזרי UI — סטטוס, שגיאות
   ======================================================= */

function setSourceScanUIState(scanning) {
    const btn = document.getElementById('runSourceScanBtn');
    const abortBtn = document.getElementById('abortSourceScanBtn');
    if (btn) {
        btn.disabled = scanning;
        btn.textContent = scanning ? '⏳ סורק...' : '🔍 סרוק ציטוטים';
    }
    if (abortBtn) {
        abortBtn.classList.toggle('hidden', !scanning);
    }
    // נעילת בורר המקור בזמן סריקה
    document.querySelectorAll('input[name="sourceScanTarget"]').forEach(r => {
        r.disabled = scanning;
    });
}

function showSourcesError(msg) {
    const el = document.getElementById('sourcesError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
}

function hideSourcesError() {
    const el = document.getElementById('sourcesError');
    if (el) el.classList.add('hidden');
}

/* =======================================================
   אינטגרציה עם מערכת הפרויקטים
   הפונקציות נקראות מ-app.js (collectStateIntoActiveProject / applyProjectToPage)
   ======================================================= */

// איסוף מצב המקורות לתוך אובייקט הפרויקט
function collectSourcesIntoProject(proj) {
    if (!proj) return;
    proj.sources = {
        scanTarget: currentSourceScanTarget,
        results: sefariaScanResults.map(r => ({
            section: r.section,
            startChar: r.startChar,
            endChar: r.endChar,
            text: r.text,
            linkFailed: r.linkFailed,
            refs: r.refs,
            chosenRef: r.chosenRef,
            refData: r.refData,
            status: r.status
        })),
        scannedAt: sefariaScanResults.length > 0 ? new Date().toISOString() : null
    };
}

// החלת מצב מקורות מהפרויקט על הדף
function applySourcesFromProject(proj) {
    if (!proj || !proj.sources) {
        // ניקוי
        sefariaScanResults = [];
        sourcesIndexData = [];
        currentSourceScanTarget = 'edited';
        renderSourcesList();
        renderSourcesIndex();
        renderHighlightedText('');
        return;
    }
    const s = proj.sources;
    currentSourceScanTarget = s.scanTarget || 'edited';
    sefariaScanResults = Array.isArray(s.results) ? s.results.slice() : [];
    // עדכון בורר המקור
    const radio = document.querySelector('input[name="sourceScanTarget"][value="' + currentSourceScanTarget + '"]');
    if (radio) radio.checked = true;
    // בנייה מחדש של המפתח והתצוגות
    buildSourcesIndex();
    renderSourcesList();
    renderSourcesIndex();
    const targetEl = document.getElementById(
        currentSourceScanTarget === 'raw' ? 'rawTranscript' : 'editedTranscript');
    renderHighlightedText(targetEl ? targetEl.value : '');
}

/* =======================================================
   אתחול טאב מקורות
   ======================================================= */

function initSourcesTab() {
    // ערך ברירת מחדל לבורר המקור
    const defaultRadio = document.querySelector('input[name="sourceScanTarget"][value="edited"]');
    if (defaultRadio) defaultRadio.checked = true;

    // Enter בשדה חיפוש הנושא -> חיפוש
    const topicInput = document.getElementById('topicSearchInput');
    if (topicInput) {
        topicInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); runTopicSearch(); }
        });
    }

    // רינדור ראשוני (ריק עד שתרוץ סריקה / ייטען פרויקט)
    renderSourcesList();
    renderSourcesIndex();
    renderHighlightedText('');
}

// מאזין אתחול נפרד
document.addEventListener('DOMContentLoaded', () => {
    try { initSourcesTab(); } catch (e) { console.warn('initSourcesTab:', e); }
});
