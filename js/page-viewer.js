/* ============================================================
   حصوني — عارض صفحات المصحف (صور حقيقية) + ورقة تفاصيل الوحدة
   ============================================================ */

// مسار صور المصحف (ملفات حقيقية ضمن المشروع، تُقرأ مباشرة سواء محليًا أو عبر GitHub Pages)
const PAGES_FOLDER = 'pages/';

function mushafImageSrc(pageNum) {
  return PAGES_FOLDER + pageNum + '.jpg';
}

function mushafImageHtml(pageNum, opts) {
  opts = opts || {};
  const hideMode = !!opts.hidden;
  const src = mushafImageSrc(pageNum);
  const uid = 'mimg_' + pageNum + '_' + Math.random().toString(36).slice(2, 7);
  return `
    <div class="mushaf-frame" id="frame_${uid}">
      <img src="${src}" alt="صفحة ${pageNum}" loading="lazy"
           style="${hideMode ? 'filter:blur(22px) brightness(.8);' : ''}"
           onerror="this.closest('.mushaf-frame').innerHTML=mushafMissingHtml(${pageNum})">
    </div>`;
}
function mushafMissingHtml(pageNum) {
  return `<div class="mushaf-missing">${ICONS.book}<br>تعذّر تحميل صورة الصفحة ${pageNum}.<br>
    تأكد من وجود مجلد <b>pages</b> بجانب <b>index.html</b> وأنه يحتوي الملف <b>${pageNum}.jpg</b>.</div>`;
}

/* ---------- ورقة تفاصيل الوحدة (سورة/جزء/حزب/ربع/ثمن/صفحة) ---------- */
let UNIT_VIEWER = { pages: [], idx: 0 };

function openUnit(type, id) {
  id = Number(id);
  let p1, p2, title;
  if (type === 'page') {
    p1 = p2 = id;
    const d = pageDisplayName(id);
    title = 'صفحة ' + id + ' — ' + d.surahName;
  } else {
    const range = unitPageRange(type, id);
    p1 = range[0]; p2 = range[1];
    const map = { surah: 'سورة ', juz: 'الجزء ', hizb: 'الحزب ', rub: 'ربع رقم ', thumn: 'ثمن رقم ' };
    title = (map[type] || '') + (type === 'surah' ? SURAH_BY_NUM[id].name : id);
  }
  const pages = [];
  for (let p = p1; p <= p2; p++) pages.push(p);
  UNIT_VIEWER = { pages, idx: 0, type, id, title };
  renderUnitSheet();
}

function renderUnitSheet() {
  const { pages, idx, title } = UNIT_VIEWER;
  const p = pages[idx];
  const r = getPageRec(p);
  const d = pageDisplayName(p);
  const html = `
    <div class="overlay" data-action="close-sheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">${title} ${iconBtnClose()}</div>
        <div id="unit-sheet-body">${renderUnitSheetBody()}</div>
      </div>
    </div>`;
  document.getElementById('modal-root').innerHTML = html;
}

function renderUnitSheetBody() {
  const { pages, idx } = UNIT_VIEWER;
  const p = pages[idx];
  const r = getPageRec(p);
  const d = pageDisplayName(p);
  return `
    <div class="muted small" style="margin-bottom:10px;">${d.surahName} · جزء ${d.juz} · حزب ${d.hizb} ${pages.length > 1 ? '· صفحة ' + (idx + 1) + ' من ' + pages.length : ''}</div>
    ${mushafImageHtml(p)}
    <div class="page-nav">
      <button class="btn btn-soft btn-sm" data-action="unit-nav" data-dir="-1" ${idx === 0 ? 'disabled' : ''}>${icon('chevronR')} السابقة</button>
      <span class="center">صفحة ${p}</span>
      <button class="btn btn-soft btn-sm" data-action="unit-nav" data-dir="1" ${idx === pages.length - 1 ? 'disabled' : ''}>التالية ${icon('chevronL')}</button>
    </div>

    <div class="field mt16">
      <label>الحالة</label>
      <div class="seg">
        <button class="${!r || !r.status ? 'active' : ''}" data-action="set-status" data-page="${p}" data-status="">لم تُحفظ</button>
        <button class="${r && r.status === 'new' ? 'active' : ''}" data-action="set-status" data-page="${p}" data-status="new">جديد</button>
        <button class="${r && r.status === 'stable' ? 'active' : ''}" data-action="set-status" data-page="${p}" data-status="stable">ثابت</button>
        <button class="${r && r.status === 'weak' ? 'active' : ''}" data-action="set-status" data-page="${p}" data-status="weak">ضعيف</button>
        <button class="${r && r.status === 'loose' ? 'active' : ''}" data-action="set-status" data-page="${p}" data-status="loose">متفلت</button>
      </div>
    </div>
    ${r && r.status ? `
    <div class="muted small">
      تاريخ الحفظ: ${r.dateMemorized || '—'} · المراجعة القادمة: ${r.nextReview || '—'} · عدد المراجعات: ${r.reviewCount || 0} · الأخطاء: ${r.mistakeCount || 0}
    </div>` : ''}
  `;
}

function unitNav(dir) {
  const n = UNIT_VIEWER.idx + dir;
  if (n < 0 || n >= UNIT_VIEWER.pages.length) return;
  UNIT_VIEWER.idx = n;
  document.getElementById('unit-sheet-body').innerHTML = renderUnitSheetBody();
}

function setPageStatus(pageNum, status) {
  const rec = ensurePageRec(pageNum);
  if (!status) {
    delete STATE.pages[String(pageNum)];
  } else {
    if (!rec.status) { // كان غير محفوظ
      rec.dateMemorized = todayStr();
      rec.history = [{ date: todayStr(), action: 'حفظ يدوي' }];
      rec.reviewCount = 0; rec.mistakeCount = 0;
    }
    rec.status = status;
    rec.box = status === 'stable' ? 5 : status === 'weak' ? 2 : status === 'loose' ? 1 : 1;
    rec.nextReview = addDays(todayStr(), BOX_INTERVALS[rec.box] || 1);
  }
  scheduleSave();
  document.getElementById('unit-sheet-body').innerHTML = renderUnitSheetBody();
  render();
}

function gotoLoose() {
  UI.tab = 'memorize';
  UI.memUnitView = 'page';
  render();
  toast('الصفحات المظللة بالأحمر هي «المتفلت» — اضغط عليها للتفاصيل');
}
