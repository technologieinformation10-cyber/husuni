/* ============================================================
   حصوني — واجهة «المزيد»: إحصائيات + ملاحظات + إعدادات
   ============================================================ */

function renderMore() {
  const subs = [['stats', 'الإحصائيات'], ['notes', 'الملاحظات'], ['settings', 'الإعدادات']];
  let body = '';
  if (UI.moreSub === 'stats') body = renderStatsTab();
  else if (UI.moreSub === 'notes') body = renderNotesTab();
  else if (UI.moreSub === 'settings') body = renderSettingsTab();
  return `
    <div class="view-title">المزيد</div>
    <div class="subtabs">${subs.map(([id, l]) => `<button class="${UI.moreSub === id ? 'active' : ''}" data-action="more-sub" data-sub="${id}">${l}</button>`).join('')}</div>
    ${body}
  `;
}

/* ---------- الإحصائيات ---------- */
function renderStatsTab() {
  const s = computeStats();
  return `
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${s.totalMem}</div><div class="lbl">إجمالي المحفوظ (صفحة)</div></div>
      <div class="stat-box"><div class="num">%${s.percent}</div><div class="lbl">نسبة التقدم</div></div>
      <div class="stat-box"><div class="num">${s.fromStart}</div><div class="lbl">محفوظ من البداية</div></div>
      <div class="stat-box"><div class="num">${s.fromEnd}</div><div class="lbl">محفوظ من النهاية</div></div>
      <div class="stat-box"><div class="num" style="color:var(--stable)">${s.stable}</div><div class="lbl">صفحات ثابتة</div></div>
      <div class="stat-box"><div class="num" style="color:var(--loose)">${s.loose}</div><div class="lbl">صفحات متفلتة</div></div>
      <div class="stat-box"><div class="num" style="color:var(--weak)">${s.weak}</div><div class="lbl">صفحات ضعيفة</div></div>
      <div class="stat-box"><div class="num" style="color:var(--new)">${s.todayCount}</div><div class="lbl">مراجعة اليوم</div></div>
    </div>

    <div class="section-title mt16">${icon('chart')} توزيع الحالة</div>
    <div class="card">
      ${statBar('ثابت', s.stable, s.totalMem, 'stable')}
      ${statBar('جديد', s.nw, s.totalMem, 'new')}
      ${statBar('ضعيف', s.weak, s.totalMem, 'weak')}
      ${statBar('متفلت', s.loose, s.totalMem, 'loose')}
    </div>

    <div class="section-title mt16">${icon('target')} التقدّم نحو ختم المصحف</div>
    <div class="card">
      <div class="progress-row"><span>من البداية</span><span>${s.fromStart} / ${TOTAL_PAGES}</span></div>
      <div class="progress"><div style="width:${(s.fromStart / TOTAL_PAGES * 100)}%; background:var(--primary);"></div></div>
      <div class="progress-row mt12"><span>من النهاية</span><span>${s.fromEnd} / ${TOTAL_PAGES}</span></div>
      <div class="progress"><div style="width:${(s.fromEnd / TOTAL_PAGES * 100)}%; background:var(--gold);"></div></div>
    </div>
  `;
}
function statBar(label, count, total, cls) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return `
    <div class="mt8" style="margin-top:10px;">
      <div class="progress-row"><span class="chip ${cls}">${label}</span><span>${count} صفحة (%${pct})</span></div>
      <div class="progress"><div style="width:${pct}%; background:var(--${cls});"></div></div>
    </div>`;
}

/* ---------- الملاحظات والمتشابهات ---------- */
const NOTE_TYPES = { mutashabih: 'متشابهات', khata: 'خطأ متكرر', note: 'ملاحظة' };
function renderNotesTab() {
  return `
    <button class="btn btn-primary btn-block" data-action="open-note-sheet">${icon('plus')} إضافة ملاحظة</button>
    ${!STATE.notes.length ? `<div class="empty mt16">${icon('note')}<div class="t">لا توجد ملاحظات بعد</div><div class="small">سجّل هنا الآيات المتشابهة وأخطاءك المتكررة لتُراجعها بعناية</div></div>` : `
    <div class="card mt16" style="padding:6px 10px;">
      ${STATE.notes.map(n => `
        <div class="list-row" style="cursor:default; align-items:flex-start;">
          <span class="chip ${n.type === 'khata' ? 'loose' : n.type === 'mutashabih' ? 'weak' : 'new'}" style="margin-top:2px;">${NOTE_TYPES[n.type]}</span>
          <div class="main">
            <div class="title">${n.ref || ''}</div>
            <div class="sub" style="white-space:pre-wrap;">${escapeHtml(n.text)}</div>
            <div class="sub muted">${n.createdAt}</div>
          </div>
          <button class="icon-btn" data-action="delete-note" data-id="${n.id}">${icon('trash')}</button>
        </div>`).join('')}
    </div>`}
  `;
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

function openNoteSheet() {
  document.getElementById('modal-root').innerHTML = `
    <div class="overlay" data-action="close-sheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">إضافة ملاحظة ${iconBtnClose()}</div>
        <div class="field">
          <label>النوع</label>
          <div class="seg" id="note-type-seg">
            <button class="active" data-action="note-type-select" data-val="mutashabih">متشابهات</button>
            <button data-action="note-type-select" data-val="khata">خطأ متكرر</button>
            <button data-action="note-type-select" data-val="note">ملاحظة</button>
          </div>
        </div>
        <div class="field">
          <label>الموضع (اختياري)</label>
          <input type="text" id="note-ref" placeholder="مثال: البقرة ٢٥ / صفحة ٤">
        </div>
        <div class="field">
          <label>التفاصيل</label>
          <textarea id="note-text" placeholder="اكتب ملاحظتك هنا..."></textarea>
        </div>
        <button class="btn btn-primary btn-block" data-action="save-note">${icon('check')} حفظ</button>
      </div>
    </div>`;
}
function saveNote() {
  const type = document.querySelector('#note-type-seg .active').dataset.val;
  const ref = document.getElementById('note-ref').value.trim();
  const text = document.getElementById('note-text').value.trim();
  if (!text) { toast('اكتب نص الملاحظة'); return; }
  STATE.notes.unshift({ id: 'note_' + Date.now(), createdAt: todayStr(), type, ref, text });
  scheduleSave();
  closeSheet();
  render();
  toast('تم الحفظ ✓');
}
function deleteNote(id) { STATE.notes = STATE.notes.filter(n => n.id !== id); scheduleSave(); render(); }

/* ---------- الإعدادات ---------- */
function renderSettingsTab() {
  const st = STATE.settings;
  return `
    <div class="section-title">${icon('target')} أهداف يومية</div>
    <div class="card">
      <div class="field">
        <label>مقدار الحفظ اليومي</label>
        <div class="row-between">
          <select id="set-mem-unit" style="flex:1;">
            ${['page', 'thumn', 'rub', 'hizb', 'juz', 'surah'].map(u => `<option value="${u}" ${st.dailyMemUnit === u ? 'selected' : ''}>${unitLabel(u)}</option>`).join('')}
          </select>
          <div class="stepper" style="margin-inline-start:10px;">
            <button data-action="setting-step" data-field="dailyMemCount" data-dir="-1">−</button>
            <span class="val">${st.dailyMemCount}</span>
            <button data-action="setting-step" data-field="dailyMemCount" data-dir="1">+</button>
          </div>
        </div>
      </div>
      <div class="field">
        <label>عدد صفحات المراجعة المستمرة يوميًا</label>
        <div class="stepper">
          <button data-action="setting-step" data-field="continuousDailyPages" data-dir="-1">−</button>
          <span class="val">${st.continuousDailyPages}</span>
          <button data-action="setting-step" data-field="continuousDailyPages" data-dir="1">+</button>
        </div>
      </div>
    </div>

    <div class="section-title mt16">${icon('moon')} المظهر</div>
    <div class="card">
      <div class="seg">
        <button class="${st.theme === 'light' ? 'active' : ''}" data-action="set-theme" data-theme="light">${icon('sun')} فاتح</button>
        <button class="${st.theme === 'dark' ? 'active' : ''}" data-action="set-theme" data-theme="dark">${icon('moon')} داكن</button>
        <button class="${st.theme === 'auto' ? 'active' : ''}" data-action="set-theme" data-theme="auto">تلقائي</button>
      </div>
    </div>

    <div class="section-title mt16">${icon('play')} القارئ الافتراضي</div>
    <div class="card">
      <select id="set-reciter">
        ${WARSH_RECITERS.map(r => `<option value="${r.id}" ${r.id === st.reciterId ? 'selected' : ''}>${r.name}</option>`).join('')}
      </select>
    </div>

    <div class="section-title mt16">${icon('book')} حالة بيانات المصحف</div>
    <div class="card">
      <div class="muted small" style="line-height:1.9;">
        نص المصحف المستخدم هنا هو صور حقيقية من نسخة مصحف برواية <b>ورش عن نافع</b> رفعتَها بنفسك (604 صفحة). لعرض الصور داخل التطبيق على أي جهاز، نزّل حزمة الصور وضعها في مجلد باسم <code>husuni_pages</code> بجانب ملف <code>index.html</code>. الصفحات المضمّنة مسبقًا (الفاتحة وجزء عمّ) تعمل بدون تنزيل أي شيء.
      </div>
    </div>

    <div class="section-title mt16">${icon('download')} نسخ احتياطي</div>
    <div class="card">
      <div class="btn-row">
        <button class="btn btn-primary" style="flex:1;" data-action="export-backup">${icon('download')} تصدير نسخة</button>
        <button class="btn btn-outline" style="flex:1;" data-action="trigger-import">${icon('upload')} استيراد نسخة</button>
      </div>
      <input type="file" id="import-file-input" accept="application/json" style="display:none;">
      <div class="muted small mt8">يُنصح بتصدير نسخة احتياطية بشكل دوري. الاستيراد يستبدل جميع البيانات الحالية.</div>
    </div>

    <div class="section-title mt16">${icon('alert')} منطقة الخطر</div>
    <div class="card">
      <button class="btn btn-maroon btn-block" data-action="reset-all">${icon('trash')} حذف جميع البيانات والبدء من جديد</button>
    </div>
  `;
}

function settingStep(field, dir) {
  const min = 1;
  STATE.settings[field] = Math.max(min, (STATE.settings[field] || 1) + dir);
  scheduleSave();
  render();
}
function setTheme(t) {
  STATE.settings.theme = t;
  applyTheme();
  scheduleSave();
  render();
}
function setReciterFromSelect() {
  const sel = document.getElementById('set-reciter');
  if (sel) { STATE.settings.reciterId = sel.value; scheduleSave(); }
}

/* ---------- نسخ احتياطي ---------- */
function exportBackup() {
  try {
    const dataStr = JSON.stringify(STATE, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'husuni-backup-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('تم تنزيل النسخة الاحتياطية ✓');
  } catch (e) {
    console.error('export failed', e);
    toast('تعذّر تصدير النسخة الاحتياطية في هذا المتصفح');
  }
}
function triggerImport() { document.getElementById('import-file-input').click(); }
function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== 'object' || !parsed.pages) throw new Error('bad format');
      STATE = Object.assign(defaultState(), parsed);
      STATE.settings = Object.assign(defaultState().settings, parsed.settings || {});
      STATE.tracks = Object.assign(defaultState().tracks, parsed.tracks || {});
      scheduleSave();
      applyTheme();
      render();
      toast('تم استيراد النسخة الاحتياطية ✓');
    } catch (err) {
      toast('الملف غير صالح لاستيراد نسخة حصوني');
    }
  };
  reader.readAsText(file);
}
function resetAll() {
  if (!confirm('سيتم حذف جميع بياناتك نهائيًا (الحفظ، المراجعات، التسجيلات، الملاحظات). هل أنت متأكد؟')) return;
  STATE = defaultState();
  scheduleSave();
  render();
  toast('تم حذف جميع البيانات');
}
