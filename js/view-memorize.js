/* ============================================================
   حصوني — واجهة «حفظي» (تصفح الوحدات + إضافة حفظ جديد)
   ============================================================ */

function unitListFor(type) {
  if (type === 'surah') return QURAN_STRUCTURE.surahs.map(s => ({ id: s.n, label: s.n + '. ' + s.name, p1: s.p1, p2: s.p2 }));
  if (type === 'juz') return QURAN_STRUCTURE.juz.map(j => ({ id: j.j, label: 'الجزء ' + arabicOrdinalNum(j.j), p1: j.p1, p2: j.p2 }));
  if (type === 'hizb') return QURAN_STRUCTURE.hizb.map(h => ({ id: h.h, label: 'الحزب ' + h.h, p1: h.p1, p2: h.p2 }));
  if (type === 'rub') return QURAN_STRUCTURE.rub.map(r => ({ id: r.r, label: 'حزب ' + r.h + ' — ربع ' + r.q, p1: r.p1, p2: r.p2 }));
  if (type === 'thumn') return QURAN_STRUCTURE.thumn.map(t => ({ id: t.t, label: 'حزب ' + t.h + ' — ثمن ' + t.e, p1: t.p1, p2: t.p2 }));
  return [];
}
function arabicOrdinalNum(n) { return String(n); }

function unitStatusSummary(p1, p2) {
  let done = 0, stable = 0, weak = 0, loose = 0, nw = 0;
  for (let p = p1; p <= p2; p++) {
    const r = getPageRec(p);
    if (r && r.status) {
      done++;
      if (r.status === 'stable') stable++;
      else if (r.status === 'weak') weak++;
      else if (r.status === 'loose') loose++;
      else nw++;
    }
  }
  const total = p2 - p1 + 1;
  return { done, total, stable, weak, loose, nw, complete: done === total };
}

function dominantStatusClass(sum) {
  if (sum.done === 0) return '';
  if (sum.loose > 0) return 'loose';
  if (sum.weak > 0) return 'weak';
  if (sum.done < sum.total) return 'new';
  return 'stable';
}

function renderMemorize() {
  const types = [['surah', 'سورة'], ['page', 'صفحة'], ['thumn', 'ثمن'], ['rub', 'ربع'], ['hizb', 'حزب'], ['juz', 'جزء']];
  const type = UI.memUnitView;

  let bodyHtml = '';
  if (type === 'page') {
    bodyHtml = renderPageGrid();
  } else {
    const list = unitListFor(type);
    bodyHtml = `<div class="card" style="padding:6px 10px;">` + list.map(u => {
      const sum = unitStatusSummary(u.p1, u.p2);
      const cls = dominantStatusClass(sum);
      return `
        <div class="list-row" data-action="open-unit" data-type="${type}" data-id="${u.id}">
          <span class="status-dot" style="background:var(--${cls || 'border'});"></span>
          <div class="main">
            <div class="title">${u.label}</div>
            <div class="sub">صفحات ${u.p1}${u.p2 !== u.p1 ? '–' + u.p2 : ''} ${sum.done ? '· ' + sum.done + '/' + sum.total + ' محفوظ' : ''}</div>
          </div>
          ${sum.complete ? icon('check') : ''}
        </div>`;
    }).join('') + `</div>`;
  }

  return `
    <div class="view-title">حفظي</div>
    <div class="btn-row mt8" style="margin-bottom:14px;">
      <button class="btn btn-primary" data-action="open-add-sheet" style="flex:1;">${icon('plus')} حفظ جديد</button>
      <button class="btn btn-outline" data-action="goto-loose">${icon('alert')} المتفلت</button>
    </div>

    <div class="seg mt8" style="margin-bottom:14px;">
      ${types.map(([t, l]) => `<button class="${type === t ? 'active' : ''}" data-action="mem-unit-view" data-type="${t}">${l}</button>`).join('')}
    </div>

    ${bodyHtml}
  `;
}

function renderPageGrid() {
  let html = `<div class="card"><div class="page-grid">`;
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const r = getPageRec(p);
    const cls = r && r.status ? 'st-' + r.status : '';
    html += `<div class="page-cell ${cls}" data-action="open-unit" data-type="page" data-id="${p}">${p}</div>`;
  }
  html += `</div></div>`;
  return html;
}

/* ---------- ورقة إضافة حفظ جديد ---------- */
function openAddSheet() {
  const fwdNext = STATE.tracks.forward.lastPage + 1;
  const bwdNext = STATE.tracks.backward.lastPage - 1;
  const html = `
    <div class="overlay" data-action="close-sheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">حفظ جديد ${iconBtnClose()}</div>

        <div class="field">
          <label>المسار</label>
          <div class="seg" id="add-track-seg">
            <button class="active" data-action="add-track-select" data-val="forward">من البداية ${fwdNext <= TOTAL_PAGES ? '(ص ' + fwdNext + ')' : ''}</button>
            <button data-action="add-track-select" data-val="backward">من النهاية ${bwdNext >= 1 ? '(ص ' + bwdNext + ')' : ''}</button>
          </div>
        </div>

        <div class="field">
          <label>وحدة الحفظ</label>
          <div class="seg" id="add-unit-seg">
            <button class="active" data-action="add-unit-select" data-val="page">صفحة</button>
            <button data-action="add-unit-select" data-val="thumn">ثمن</button>
            <button data-action="add-unit-select" data-val="rub">ربع</button>
            <button data-action="add-unit-select" data-val="hizb">حزب</button>
            <button data-action="add-unit-select" data-val="juz">جزء</button>
            <button data-action="add-unit-select" data-val="surah">سورة</button>
          </div>
        </div>

        <div class="field">
          <label>العدد</label>
          <div class="stepper">
            <button data-action="add-count-step" data-dir="-1">−</button>
            <span class="val" id="add-count-val">1</span>
            <button data-action="add-count-step" data-dir="1">+</button>
          </div>
        </div>

        <div class="field">
          <div class="muted small" id="add-preview"></div>
        </div>

        <button class="btn btn-primary btn-block" data-action="confirm-add">${icon('check')} تأكيد الحفظ</button>
      </div>
    </div>`;
  document.getElementById('modal-root').innerHTML = html;
  UI._add = { track: 'forward', unit: 'page', count: 1 };
  updateAddPreview();
}
function iconBtnClose() { return `<button class="icon-btn" data-action="close-sheet" style="margin-inline-start:auto;">${icon('x')}</button>`; }

function updateAddPreview() {
  const el = document.getElementById('add-preview');
  if (!el) return;
  const { track, unit, count } = UI._add;
  const pages = computeAddPages(track, unit, count);
  if (!pages.length) { el.textContent = 'لا مزيد من الصفحات في هذا الاتجاه 🎉'; return; }
  const p1 = pages[0], p2 = pages[pages.length - 1];
  const d1 = pageDisplayName(p1), d2 = pageDisplayName(p2);
  el.innerHTML = `سيُسجَّل من صفحة <b>${p1}</b> (${d1.surahName}) إلى صفحة <b>${p2}</b> (${d2.surahName}) — ${pages.length} صفحة`;
}

function computeAddPages(track, unit, count) {
  let pages = [];
  if (unit === 'page') {
    if (track === 'forward') {
      const start = STATE.tracks.forward.lastPage + 1;
      for (let i = 0; i < count && start + i <= TOTAL_PAGES; i++) pages.push(start + i);
    } else {
      const start = STATE.tracks.backward.lastPage - 1;
      for (let i = 0; i < count && start - i >= 1; i++) pages.push(start - i);
      pages.reverse();
    }
    return pages;
  }
  const list = unitListFor(unit).slice().sort((a, b) => a.p1 - b.p1);
  let chosen = [];
  if (track === 'forward') {
    const boundary = STATE.tracks.forward.lastPage;
    const candidates = list.filter(u => u.p2 > boundary);
    chosen = candidates.slice(0, count);
  } else {
    const boundary = STATE.tracks.backward.lastPage;
    const candidates = list.filter(u => u.p1 < boundary).reverse();
    chosen = candidates.slice(0, count);
  }
  chosen.forEach(u => { for (let p = u.p1; p <= u.p2; p++) if (!pages.includes(p)) pages.push(p); });
  pages.sort((a, b) => a - b);
  return pages;
}

function confirmAdd() {
  const { track, unit, count } = UI._add;
  const pages = computeAddPages(track, unit, count);
  if (!pages.length) { toast('لا توجد صفحات لإضافتها'); return; }
  pages.forEach(p => {
    const rec = ensurePageRec(p);
    if (!rec.status) {
      rec.status = 'new'; rec.box = 1; rec.track = track; rec.dateMemorized = todayStr();
      rec.nextReview = addDays(todayStr(), 1); rec.reviewCount = 0; rec.mistakeCount = 0;
      rec.history = [{ date: todayStr(), action: 'حفظ' }];
    }
  });
  if (track === 'forward') {
    STATE.tracks.forward.lastPage = Math.max(STATE.tracks.forward.lastPage, Math.max(...pages));
    if (!STATE.tracks.forward.startedAt) STATE.tracks.forward.startedAt = todayStr();
  } else {
    STATE.tracks.backward.lastPage = Math.min(STATE.tracks.backward.lastPage, Math.min(...pages));
    if (!STATE.tracks.backward.startedAt) STATE.tracks.backward.startedAt = todayStr();
  }
  logDaily('newPages', pages);
  scheduleSave();
  closeSheet();
  toast('تم تسجيل ' + pages.length + ' صفحة كحفظ جديد ✓');
  render();
}

function closeSheet() { document.getElementById('modal-root').innerHTML = ''; }
