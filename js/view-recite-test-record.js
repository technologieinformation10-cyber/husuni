/* ============================================================
   حصوني — الاختبار (بدون عرض النص) + التسميع الصوتي
   ============================================================ */

/* ---------- الاختبار ---------- */
function renderTestTab() {
  if (UI.test.active) return renderTestActive();
  const mem = allMemorizedPages();
  return `
    <div class="card">
      <div class="section-title" style="margin-bottom:4px;">${icon('shield')} اختبار الحفظ</div>
      <div class="muted small">تُعرض الصفحة مخفيّة، سمِّع من ذاكرتك ثم اكشفها لتصحيح نفسك بأمانة. تُسجَّل النتيجة النهائية.</div>
      <hr class="hr">
      <div class="field">
        <label>نطاق الاختبار</label>
        <select id="test-scope-type">
          <option value="surah">سورة</option>
          <option value="juz">جزء</option>
          <option value="hizb">حزب</option>
          <option value="random">عشوائي من المحفوظ (10 صفحات)</option>
        </select>
      </div>
      <div class="field" id="test-scope-unit-wrap">
        <label>اختر</label>
        <select id="test-scope-unit"></select>
      </div>
      <button class="btn btn-primary btn-block" data-action="start-test" ${mem.length === 0 ? 'disabled' : ''}>${icon('play')} ابدأ الاختبار</button>
      ${mem.length === 0 ? '<div class="muted small center mt8">احفظ بعض الصفحات أولًا لتتمكن من الاختبار</div>' : ''}
    </div>
    ${renderTestHistory()}
  `;
}

function testScopeTypeChanged() {
  const type = document.getElementById('test-scope-type').value;
  const wrap = document.getElementById('test-scope-unit-wrap');
  if (type === 'random') { wrap.style.display = 'none'; return; }
  wrap.style.display = '';
  const sel = document.getElementById('test-scope-unit');
  const list = unitListFor(type);
  sel.innerHTML = list.map(u => `<option value="${u.id}">${u.label}</option>`).join('');
}

function startTest() {
  const type = document.getElementById('test-scope-type').value;
  let pages = [];
  if (type === 'random') {
    const mem = allMemorizedPages().slice();
    for (let i = mem.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[mem[i], mem[j]] = [mem[j], mem[i]]; }
    pages = mem.slice(0, 10).sort((a, b) => a - b);
  } else {
    const id = Number(document.getElementById('test-scope-unit').value);
    const range = unitPageRange(type, id);
    for (let p = range[0]; p <= range[1]; p++) pages.push(p);
  }
  if (!pages.length) { toast('لا صفحات في هذا النطاق'); return; }
  UI.test = { active: true, scope: type, pages, idx: 0, revealed: false, correct: 0, wrong: 0, wrongPages: [] };
  render();
}

function renderTestActive() {
  const { pages, idx, revealed } = UI.test;
  const p = pages[idx];
  const d = pageDisplayName(p);
  return `
    <div class="card">
      <div class="row-between">
        <span class="chip">${idx + 1} / ${pages.length}</span>
        <button class="icon-btn" data-action="end-test">${icon('x')}</button>
      </div>
      <div class="test-card">
        <div style="font-weight:900; font-size:16px;">صفحة ${p} — ${d.surahName}</div>
        ${revealed ? mushafImageHtml(p) : `<div class="hidden-block">${icon('book')}<br>سمِّع الصفحة من ذاكرتك، ثم اضغط «كشف الصفحة»</div>`}
        ${!revealed ? `<button class="btn btn-gold btn-block mt16" data-action="test-reveal">${icon('shield')} كشف الصفحة</button>` : `
        <div class="btn-row mt16">
          <button class="btn btn-maroon" style="flex:1;" data-action="test-answer" data-ok="0">${icon('x')} أخطأت</button>
          <button class="btn btn-primary" style="flex:1;" data-action="test-answer" data-ok="1">${icon('check')} أتقنت</button>
        </div>`}
      </div>
    </div>`;
}

function testReveal() { UI.test.revealed = true; render(); }
function testAnswer(ok) {
  const p = UI.test.pages[UI.test.idx];
  if (ok) UI.test.correct++; else { UI.test.wrong++; UI.test.wrongPages.push(p); }
  if (UI.test.idx + 1 >= UI.test.pages.length) { finishTest(); return; }
  UI.test.idx++; UI.test.revealed = false;
  render();
}
function finishTest() {
  const t = UI.test;
  STATE.testHistory.unshift({ id: 'tst_' + Date.now(), date: todayStr(), scope: t.scope, total: t.pages.length, correct: t.correct });
  if (STATE.testHistory.length > 50) STATE.testHistory.length = 50;
  t.wrongPages.forEach(p => reviewPage(p, 'mistake'));
  scheduleSave();
  const correct = t.correct, total = t.pages.length;
  UI.test = { active: false, scope: null, pages: [], idx: 0, revealed: false, correct: 0, wrong: 0 };
  render();
  showResultSheet(correct, total);
}
function endTest() { UI.test = { active: false, scope: null, pages: [], idx: 0, revealed: false, correct: 0, wrong: 0 }; render(); }

function showResultSheet(correct, total) {
  const pct = total ? Math.round((correct / total) * 100) : 0;
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" data-action="close-sheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="center" style="padding:10px 0 20px;">
          <div style="font-size:44px; font-weight:900; color:var(--primary); font-family:'Amiri';">%${pct}</div>
          <div class="muted mt8">أتقنت ${correct} من ${total} صفحة</div>
          ${total - correct > 0 ? `<div class="muted small mt8">الصفحات التي أخطأت فيها أُضيفت إلى قائمة التثبيت تلقائيًا</div>` : `<div class="muted small mt8">ما شاء الله، نتيجة ممتازة 🌟</div>`}
          <button class="btn btn-primary btn-block mt16" data-action="close-sheet">تم</button>
        </div>
      </div>
    </div>`;
}

function renderTestHistory() {
  if (!STATE.testHistory.length) return '';
  return `
    <div class="section-title mt16">${icon('chart')} آخر الاختبارات</div>
    <div class="card" style="padding:6px 10px;">
      ${STATE.testHistory.slice(0, 8).map(h => {
        const pct = h.total ? Math.round((h.correct / h.total) * 100) : 0;
        return `<div class="list-row" style="cursor:default;">
          <div class="main"><div class="title">${h.date}</div><div class="sub">${h.correct}/${h.total} صفحة</div></div>
          <span class="chip ${pct >= 80 ? 'stable' : pct >= 50 ? 'weak' : 'loose'}">%${pct}</span>
        </div>`;
      }).join('')}
    </div>`;
}

/* ---------- التسميع (تسجيل صوتي) ---------- */
function renderRecordTab() {
  const rec = UI.recorder;
  return `
    <div class="card">
      <div class="section-title" style="margin-bottom:4px;">${icon('mic')} تسجيل تسميع</div>
      <div class="muted small">سجّل تلاوتك ثم استمع إليها لتقييم نفسك. تُحفظ التسجيلات باسم السورة والتاريخ.</div>
      <hr class="hr">
      <div class="field">
        <label>السورة</label>
        <select id="record-surah-select">
          ${QURAN_STRUCTURE.surahs.map(s => `<option value="${s.n}">${s.n}. ${s.name}</option>`).join('')}
        </select>
      </div>
      <button class="rec-btn ${rec.recording ? 'recording' : ''}" data-action="toggle-record">${icon(rec.recording ? 'stop' : 'mic')}</button>
      <div class="rec-time">${fmtTime(rec.seconds)}</div>
      <div class="muted small center">${rec.recording ? 'جارٍ التسجيل...' : 'اضغط للبدء'}</div>
    </div>
    ${renderRecordingsList()}
  `;
}

function renderRecordingsList() {
  if (!STATE.recordings.length) return `<div class="empty">${icon('mic')}<div class="t">لا توجد تسجيلات بعد</div></div>`;
  return `
    <div class="section-title mt16">${icon('book')} تسجيلاتي <span class="count">${STATE.recordings.length}</span></div>
    <div class="card" style="padding:6px 10px;">
      ${STATE.recordings.map(r => `
        <div class="list-row" style="cursor:default;">
          <div class="main">
            <div class="title">${r.label}</div>
            <div class="sub">${r.createdAt} · ${fmtTime(r.durationSec)}</div>
          </div>
          <button class="icon-btn" data-action="play-recording" data-id="${r.id}">${icon('play')}</button>
          <button class="icon-btn" data-action="delete-recording" data-id="${r.id}">${icon('trash')}</button>
        </div>`).join('')}
    </div>`;
}

async function toggleRecord() {
  const rec = UI.recorder;
  if (rec.recording) {
    rec.mediaRecorder.stop();
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    rec.stream = stream;
    let mime = 'audio/webm';
    if (window.MediaRecorder && MediaRecorder.isTypeSupported && !MediaRecorder.isTypeSupported(mime)) mime = '';
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    rec.chunks = [];
    mr.ondataavailable = e => { if (e.data.size > 0) rec.chunks.push(e.data); };
    mr.onstop = onRecordingStop;
    mr.start();
    rec.mediaRecorder = mr;
    rec.recording = true;
    rec.seconds = 0;
    rec._timer = setInterval(() => { rec.seconds++; const t = document.querySelector('.rec-time'); if (t) t.textContent = fmtTime(rec.seconds); }, 1000);
    render();
  } catch (e) {
    toast('تعذّر الوصول إلى الميكروفون — تحقّق من الأذونات');
  }
}

function onRecordingStop() {
  const rec = UI.recorder;
  clearInterval(rec._timer);
  const blob = new Blob(rec.chunks, { type: rec.mediaRecorder.mimeType || 'audio/webm' });
  rec.stream.getTracks().forEach(t => t.stop());
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    const surahSel = document.getElementById('record-surah-select');
    const surahNum = surahSel ? Number(surahSel.value) : 1;
    const sizeMB = dataUrl.length / 1024 / 1024;
    const entry = {
      id: 'rec_' + Date.now(), createdAt: todayStr(), surahNum,
      label: SURAH_BY_NUM[surahNum].name + ' — ' + todayStr(),
      durationSec: rec.seconds, mime: rec.mediaRecorder.mimeType || 'audio/webm',
      audioDataUrl: sizeMB < 4.5 ? dataUrl : null,
    };
    if (!entry.audioDataUrl) {
      toast('التسجيل طويل جدًا ليُحفظ تلقائيًا — جرّب تسجيلًا أقصر');
    } else {
      STATE.recordings.unshift(entry);
      scheduleSave();
      toast('تم حفظ التسجيل ✓');
    }
    rec.recording = false; rec.seconds = 0; rec.chunks = [];
    render();
  };
  reader.readAsDataURL(blob);
}

function playRecording(id) {
  const r = STATE.recordings.find(x => x.id === id);
  if (!r || !r.audioDataUrl) return;
  const el = getAudioEl();
  el.pause();
  el.src = r.audioDataUrl;
  el.playbackRate = 1;
  el.play().catch(() => toast('تعذّر تشغيل التسجيل'));
}
function deleteRecording(id) {
  STATE.recordings = STATE.recordings.filter(x => x.id !== id);
  scheduleSave();
  render();
}
