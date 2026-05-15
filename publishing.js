/* =======================================================
   ארגז כלים לעורך תורני — v9
   publishing.js — טאב "הוצאה לאור" (שלב ד')
   ייצוא Word (.doc) ו-PDF מעוצבים, עם דף שער, תוכן עניינים,
   מפתח מקורות, ומספרי עמודים.
   ======================================================= */

/* =======================================================
   מצב גלובלי של מודול ההוצאה לאור
   ======================================================= */
let publishSettings = {
    docTitle: '',          // כותרת המסמך (אם ריק — שם הפרויקט)
    docAuthor: '',         // שם המחבר/העורך
    includeTitlePage: true,
    includeTOC: true,
    includeSourcesIndex: true,
    includePageNumbers: true
};

/* =======================================================
   עזרי טקסט
   ======================================================= */

function pubEscapeHtml(str) {
    if (typeof escapeHtmlV9 === 'function') return escapeHtmlV9(str);
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// מקור הטקסט לייצוא — תמיד התמלול הערוך אם יש בו תוכן, אחרת הגולמי.
function getPublishText() {
    const edited = document.getElementById('editedTranscript');
    const raw = document.getElementById('rawTranscript');
    const editedVal = edited ? edited.value.trim() : '';
    if (editedVal) return editedVal;
    return raw ? raw.value.trim() : '';
}

// כותרת המסמך בפועל
function getEffectiveDocTitle() {
    if (publishSettings.docTitle && publishSettings.docTitle.trim()) {
        return publishSettings.docTitle.trim();
    }
    if (typeof activeProject !== 'undefined' && activeProject && activeProject.name) {
        return activeProject.name;
    }
    return 'שיעור תורני';
}

/* =======================================================
   ניתוח הטקסט למבנה — פסקאות + כותרות
   ======================================================= */

// מפרק את הטקסט הערוך לרשימת בלוקים: { type: 'h1'|'h2'|'p', text }
function parseDocStructure(text) {
    const blocks = [];
    // ניקוי timestamps
    const clean = typeof stripTimestamps === 'function' ? stripTimestamps(text) : text;
    const lines = clean.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('# ')) {
            blocks.push({ type: 'h1', text: trimmed.replace(/^#\s*/, '') });
        } else if (trimmed.startsWith('#')) {
            blocks.push({ type: 'h1', text: trimmed.replace(/^#+\s*/, '') });
        } else if (/^\*\*(.+)\*\*$/.test(trimmed)) {
            blocks.push({ type: 'h2', text: trimmed.replace(/^\*\*|\*\*$/g, '') });
        } else if (trimmed.includes('**')) {
            // שורה עם **כותרת** באמצע — מתייחסים אליה ככותרת-משנה
            blocks.push({ type: 'h2', text: trimmed.replace(/\*\*/g, '') });
        } else {
            blocks.push({ type: 'p', text: trimmed });
        }
    });
    return blocks;
}

// בונה את תוכן העניינים מהכותרות
function buildTOC(blocks) {
    const toc = [];
    blocks.forEach((b, idx) => {
        if (b.type === 'h1' || b.type === 'h2') {
            toc.push({ level: b.type, text: b.text, anchor: 'sec_' + idx });
        }
    });
    return toc;
}

/* =======================================================
   עיצוב תוכן בלוק — הדגשת [ספק:] ומראי-מקומות
   ======================================================= */

function formatBlockText(text) {
    let html = pubEscapeHtml(text);
    // [ספק: ...] — הדגשה צהובה
    html = html.replace(/\[ספק:\s*(.*?)\]/g,
        '<span style="background-color:#fef3c7; color:#92400e; padding:1px 4px; border-radius:3px;">[ספק: $1]</span>');
    // מראי-מקומות בסוגריים — צבע כחול
    html = html.replace(/\(([^)]{1,80})\)/g, '<span style="color:#1e40af;">($1)</span>');
    return html;
}

/* =======================================================
   הרכבת ה-HTML של המסמך המלא
   משותף ל-Word ול-PDF (עם הבדלי-עיצוב קלים)
   ======================================================= */

// mode: 'word' | 'pdf' | 'preview'
function buildDocumentHTML(mode) {
    const text = getPublishText();
    if (!text) return null;

    const blocks = parseDocStructure(text);
    const toc = buildTOC(blocks);
    const title = getEffectiveDocTitle();
    const author = publishSettings.docAuthor && publishSettings.docAuthor.trim()
        ? publishSettings.docAuthor.trim() : '';
    const dateStr = new Date().toLocaleDateString('he-IL', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    let body = '';

    // --- דף שער ---
    if (publishSettings.includeTitlePage) {
        body += '<div class="doc-title-page">';
        body += '<div class="doc-title-deco">✦</div>';
        body += '<h1 class="doc-main-title">' + pubEscapeHtml(title) + '</h1>';
        if (author) body += '<p class="doc-author">' + pubEscapeHtml(author) + '</p>';
        body += '<p class="doc-date">' + pubEscapeHtml(dateStr) + '</p>';
        body += '</div>';
        body += '<div class="doc-page-break"></div>';
    }

    // --- תוכן עניינים ---
    if (publishSettings.includeTOC && toc.length > 0) {
        body += '<div class="doc-toc">';
        body += '<h2 class="doc-toc-title">תוכן עניינים</h2>';
        body += '<ul class="doc-toc-list">';
        toc.forEach(item => {
            const cls = item.level === 'h1' ? 'doc-toc-h1' : 'doc-toc-h2';
            body += '<li class="' + cls + '">' + pubEscapeHtml(item.text) + '</li>';
        });
        body += '</ul></div>';
        body += '<div class="doc-page-break"></div>';
    }

    // --- גוף הטקסט ---
    body += '<div class="doc-body">';
    blocks.forEach((b, idx) => {
        if (b.type === 'h1') {
            body += '<h1 class="doc-h1" id="sec_' + idx + '">' + pubEscapeHtml(b.text) + '</h1>';
        } else if (b.type === 'h2') {
            body += '<h2 class="doc-h2" id="sec_' + idx + '">' + pubEscapeHtml(b.text) + '</h2>';
        } else {
            body += '<p class="doc-p">' + formatBlockText(b.text) + '</p>';
        }
    });
    body += '</div>';

    // --- מפתח מקורות ---
    if (publishSettings.includeSourcesIndex) {
        const indexHTML = buildSourcesIndexHTML();
        if (indexHTML) {
            body += '<div class="doc-page-break"></div>';
            body += indexHTML;
        }
    }

    // עטיפה לפי המצב
    return wrapDocument(body, title, mode);
}

// בונה את ה-HTML של מפתח המקורות (מ-sourcesIndexData ב-sefaria.js)
function buildSourcesIndexHTML() {
    // sourcesIndexData מוגדר ב-sefaria.js — ייתכן שריק
    if (typeof sourcesIndexData === 'undefined' || !sourcesIndexData ||
        sourcesIndexData.length === 0) {
        return null;
    }
    let html = '<div class="doc-sources-index">';
    html += '<h2 class="doc-h1">מפתח מקורות</h2>';
    sourcesIndexData.forEach(group => {
        html += '<div class="doc-index-group">';
        html += '<span class="doc-index-book">' +
            pubEscapeHtml(group.heBaseName || group.baseName) + '</span>';
        if (group.category) {
            html += ' <span class="doc-index-cat">(' + pubEscapeHtml(group.category) + ')</span>';
        }
        html += ': ';
        const refs = (group.refs || []).slice().sort((a, b) =>
            String(a.ref).localeCompare(String(b.ref), undefined, { numeric: true }));
        html += refs.map(r => pubEscapeHtml(r.heRef || r.ref)).join('; ');
        html += '</div>';
    });
    const totalRefs = sourcesIndexData.reduce((s, g) => s + (g.refs ? g.refs.length : 0), 0);
    html += '<p class="doc-index-summary">סה"כ ' + totalRefs + ' מקורות ב-' +
        sourcesIndexData.length + ' ספרים/מסכתות.</p>';
    html += '</div>';
    return html;
}

/* =======================================================
   עטיפת המסמך — CSS לפי מצב
   ======================================================= */

function wrapDocument(body, title, mode) {
    // CSS משותף לכל המצבים
    const baseCSS = `
        body { font-family: 'David', 'Narkisim', 'Times New Roman', serif; line-height: 1.7;
               color: #1f2937; direction: rtl; }
        .doc-title-page { text-align: center; padding-top: 6cm; }
        .doc-title-deco { font-size: 28pt; color: #b45309; margin-bottom: 1cm; }
        .doc-main-title { font-size: 28pt; font-weight: bold; color: #1e3a8a; margin: 0.5cm 0; }
        .doc-author { font-size: 15pt; color: #4b5563; margin: 0.8cm 0 0.3cm; }
        .doc-date { font-size: 12pt; color: #9ca3af; }
        .doc-toc-title, .doc-toc-list { direction: rtl; }
        .doc-toc-title { font-size: 18pt; color: #1e3a8a; border-bottom: 2px solid #c7d2fe;
                         padding-bottom: 6pt; margin-bottom: 12pt; }
        .doc-toc-list { list-style: none; padding: 0; }
        .doc-toc-h1 { font-size: 13pt; font-weight: bold; margin: 8pt 0 4pt; color: #1e3a8a; }
        .doc-toc-h2 { font-size: 11pt; margin: 3pt 0 3pt 0; padding-right: 1.2cm; color: #4b5563; }
        .doc-body { }
        .doc-h1 { font-size: 18pt; font-weight: bold; color: #1e3a8a; text-align: center;
                  margin: 18pt 0 12pt; }
        .doc-h2 { font-size: 14pt; font-weight: bold; color: #166534; margin: 14pt 0 6pt;
                  text-align: right; }
        .doc-p { font-size: 12pt; text-align: justify; margin: 0 0 8pt; line-height: 1.8; }
        .doc-sources-index { }
        .doc-index-group { font-size: 11pt; margin: 4pt 0; }
        .doc-index-book { font-weight: bold; color: #92400e; }
        .doc-index-cat { color: #a16207; font-size: 10pt; }
        .doc-index-summary { font-size: 10pt; color: #6b7280; margin-top: 10pt; }
    `;

    if (mode === 'word') {
        // Word — HTML עם namespaces של Office, מודפס כ-.doc
        const pageNumCSS = publishSettings.includePageNumbers
            ? `@page { size: 21cm 29.7cm; margin: 2.5cm; mso-footer: f1; }
               div.f1 { text-align: center; font-size: 9pt; color: #9ca3af; }`
            : `@page { size: 21cm 29.7cm; margin: 2.5cm; }`;
        const pageNumFooter = publishSettings.includePageNumbers
            ? `<div style="mso-element:footer" id="f1"><div class="f1">עמוד <span style="mso-field-code: PAGE"></span></div></div>`
            : '';
        const pageBreakCSS = '.doc-page-break { page-break-before: always; }';
        return `<html xmlns:o='urn:schemas-microsoft-com:office:office' ` +
            `xmlns:w='urn:schemas-microsoft-com:office:word' ` +
            `xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'>` +
            `<title>${pubEscapeHtml(title)}</title>` +
            `<style>${baseCSS}\n${pageNumCSS}\n${pageBreakCSS}</style></head>` +
            `<body dir='rtl'>${pageNumFooter}${body}</body></html>`;
    }

    // pdf / preview — HTML רגיל עם print CSS
    const printCSS = `
        @media print {
            .doc-page-break { page-break-before: always; }
            .doc-h1, .doc-h2 { page-break-after: avoid; }
            .doc-p { orphans: 3; widows: 3; }
            ${publishSettings.includePageNumbers
                ? '@page { margin: 2.5cm; } body { counter-reset: page; }'
                : '@page { margin: 2.5cm; }'}
        }
        @media screen {
            body { max-width: 18cm; margin: 1cm auto; padding: 1.5cm;
                   background: white; box-shadow: 0 0 12px rgba(0,0,0,0.1); }
            .doc-page-break { border-top: 2px dashed #d1d5db; margin: 1cm 0; padding-top: 1cm; }
        }
    `;
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">` +
        `<title>${pubEscapeHtml(title)}</title>` +
        `<style>${baseCSS}\n${printCSS}</style></head>` +
        `<body dir="rtl">${body}</body></html>`;
}

/* =======================================================
   ייצוא Word (.doc)
   ======================================================= */

function exportToWord() {
    const html = buildDocumentHTML('word');
    if (!html) {
        showPublishError('אין טקסט לייצוא. ערוך תמלול בטאב "עריכה והגהה" קודם.');
        return;
    }
    hidePublishError();
    const title = getEffectiveDocTitle();
    const filename = sanitizeFilename(title) + '.doc';
    const blob = new Blob(['﻿', html], { type: 'application/msword;charset=utf-8' });
    triggerDownload(blob, filename);
    showPublishNotice('המסמך יוצא כקובץ Word: ' + filename);
    if (typeof sendDesktopNotification === 'function') {
        sendDesktopNotification('ייצוא Word הושלם', filename);
    }
}

/* =======================================================
   ייצוא PDF — דרך חלון הדפסה
   ======================================================= */

function exportToPDF() {
    const html = buildDocumentHTML('pdf');
    if (!html) {
        showPublishError('אין טקסט לייצוא. ערוך תמלול בטאב "עריכה והגהה" קודם.');
        return;
    }
    hidePublishError();
    // פתיחת חלון חדש עם המסמך והפעלת הדפסה (המשתמש בוחר "שמור כ-PDF")
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showPublishError('הדפדפן חסם את חלון ההדפסה. אפשר חלונות קופצים לאתר זה ונסה שוב.');
        return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    // המתנה קצרה לטעינת הפונטים, ואז הדפסה
    setTimeout(() => {
        try {
            printWindow.focus();
            printWindow.print();
        } catch (e) {
            // אם ההדפסה נכשלה — המסמך עדיין פתוח לצפייה
        }
    }, 600);
    showPublishNotice('נפתח חלון הדפסה — בחר "שמור כ-PDF" כיעד ההדפסה.');
}

/* =======================================================
   תצוגה מקדימה
   ======================================================= */

function showPublishPreview() {
    const html = buildDocumentHTML('preview');
    const container = document.getElementById('publishPreviewContainer');
    if (!container) return;
    if (!html) {
        showPublishError('אין טקסט לתצוגה מקדימה.');
        return;
    }
    hidePublishError();
    // הצגה ב-iframe מבודד כדי שה-CSS לא ידלוף
    container.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.className = 'publish-preview-frame';
    iframe.setAttribute('title', 'תצוגה מקדימה של המסמך');
    container.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    container.classList.remove('hidden');
}

/* =======================================================
   עזרי הורדה
   ======================================================= */

function sanitizeFilename(name) {
    return String(name).replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =======================================================
   עזרי UI — הודעות
   ======================================================= */

function showPublishError(msg) {
    const el = document.getElementById('publishError');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden', 'pub-notice');
    el.classList.add('pub-error');
}

function showPublishNotice(msg) {
    const el = document.getElementById('publishError');
    if (!el) return;
    el.textContent = '✓ ' + msg;
    el.classList.remove('hidden', 'pub-error');
    el.classList.add('pub-notice');
    setTimeout(() => {
        if (el.classList.contains('pub-notice')) el.classList.add('hidden');
    }, 6000);
}

function hidePublishError() {
    const el = document.getElementById('publishError');
    if (el) el.classList.add('hidden');
}

/* =======================================================
   קריאת הגדרות מה-UI
   ======================================================= */

function readPublishSettingsFromUI() {
    const g = id => document.getElementById(id);
    if (g('publishDocTitle')) publishSettings.docTitle = g('publishDocTitle').value;
    if (g('publishDocAuthor')) publishSettings.docAuthor = g('publishDocAuthor').value;
    if (g('publishIncludeTitlePage')) publishSettings.includeTitlePage = g('publishIncludeTitlePage').checked;
    if (g('publishIncludeTOC')) publishSettings.includeTOC = g('publishIncludeTOC').checked;
    if (g('publishIncludeSourcesIndex')) publishSettings.includeSourcesIndex = g('publishIncludeSourcesIndex').checked;
    if (g('publishIncludePageNumbers')) publishSettings.includePageNumbers = g('publishIncludePageNumbers').checked;
    // שמירה בפרויקט
    if (typeof scheduleProjectAutosave === 'function') scheduleProjectAutosave();
}

function applyPublishSettingsToUI() {
    const g = id => document.getElementById(id);
    if (g('publishDocTitle')) g('publishDocTitle').value = publishSettings.docTitle || '';
    if (g('publishDocAuthor')) g('publishDocAuthor').value = publishSettings.docAuthor || '';
    if (g('publishIncludeTitlePage')) g('publishIncludeTitlePage').checked = publishSettings.includeTitlePage !== false;
    if (g('publishIncludeTOC')) g('publishIncludeTOC').checked = publishSettings.includeTOC !== false;
    if (g('publishIncludeSourcesIndex')) g('publishIncludeSourcesIndex').checked = publishSettings.includeSourcesIndex !== false;
    if (g('publishIncludePageNumbers')) g('publishIncludePageNumbers').checked = publishSettings.includePageNumbers !== false;
}

/* =======================================================
   אינטגרציה עם מערכת הפרויקטים
   ======================================================= */

function collectPublishingIntoProject(proj) {
    if (!proj) return;
    readPublishSettingsFromUI();
    proj.publishing = {
        docTitle: publishSettings.docTitle,
        docAuthor: publishSettings.docAuthor,
        includeTitlePage: publishSettings.includeTitlePage,
        includeTOC: publishSettings.includeTOC,
        includeSourcesIndex: publishSettings.includeSourcesIndex,
        includePageNumbers: publishSettings.includePageNumbers
    };
}

function applyPublishingFromProject(proj) {
    if (!proj || !proj.publishing) {
        publishSettings = {
            docTitle: '', docAuthor: '',
            includeTitlePage: true, includeTOC: true,
            includeSourcesIndex: true, includePageNumbers: true
        };
        applyPublishSettingsToUI();
        return;
    }
    const p = proj.publishing;
    publishSettings = {
        docTitle: p.docTitle || '',
        docAuthor: p.docAuthor || '',
        includeTitlePage: p.includeTitlePage !== false,
        includeTOC: p.includeTOC !== false,
        includeSourcesIndex: p.includeSourcesIndex !== false,
        includePageNumbers: p.includePageNumbers !== false
    };
    applyPublishSettingsToUI();
}

/* =======================================================
   אתחול טאב הוצאה לאור
   ======================================================= */

function initPublishingTab() {
    // מאזיני שינוי על שדות ההגדרות
    ['publishDocTitle', 'publishDocAuthor', 'publishIncludeTitlePage', 'publishIncludeTOC',
     'publishIncludeSourcesIndex', 'publishIncludePageNumbers'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const evt = el.type === 'checkbox' ? 'change' : 'input';
        el.addEventListener(evt, () => readPublishSettingsFromUI());
    });
    applyPublishSettingsToUI();
}

document.addEventListener('DOMContentLoaded', () => {
    try { initPublishingTab(); } catch (e) { console.warn('initPublishingTab:', e); }
});
