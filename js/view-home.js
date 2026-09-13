/* ============================================================
   حصوني — واجهة الرئيسية (لوحة اليوم)
   ============================================================ */

function hijriApprox() {
  try {
    const fmt = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
    return fmt.format(new Date());
  } catch (e) { return ''; }
}
function gregorianStr() {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const d = new Date();
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function renderHome() {
  const stats = computeStats();
  const queue = computeReviewQueue();
  const queueTotal = queue.new.length + queue.consolidation.length + queue.near.length + queue.far.length;
  const contBatch = computeContinuousBatch();
  const fwd = STATE.tracks.forward.lastPage;
  const bwd = STATE.tracks.backward.lastPage;
  const fwdNext = fwd + 1;
  const bwdNext = bwd - 1;
  const hijri = hijriApprox();

  return `
    <div class="row-between mt8" style="margin-bottom:4px;">
      <div>
        <div class="view-title" style="margin-bottom:2px;">السلام عليكم 👋</div>
        <div class="muted small">${gregorianStr()}${hijri ? ' — ' + hijri : ''}</div>
      </div>
    </div>
    <div class="ornament"></div>

    <div class="card" style="background:linear-gradient(160deg,var(--primary),var(--primary-dark)); color:#fff; border:none;">
      <div class="row-between">
        <div>
          <div style="font-size:13px; opacity:.85;">التقدّم الإجمالي</div>
          <div style="font-size:30px; font-weight:900; font-family:'Amiri';">%${stats.percent}</div>
        </div>
        <div style="text-align:left;">
          <div style="font-size:13px; opacity:.85;">محفوظ</div>
          <div style="font-size:20px; font-weight:900;">${stats.totalMem} <span style="font-size:12px; opacity:.8;">من ${TOTAL_PAGES} صفحة</span></div>
        </div>
      </div>
      <div class="progress mt12" style="background:rgba(255,255,255,.22);">
        <div style="width:${stats.percent}%; background:#fff;"></div>
      </div>
    </div>

    <div class="section-title">${icon('refresh')} مطلوب اليوم <span class="count">${queueTotal}</span></div>
    ${queueTotal === 0 ? `
      <div class="card empty" style="padding:20px;">
        <div class="t">لا توجد مراجعات مستحقة الآن</div>
        <div class="small">أحسنت! ابدأ بحفظ جديد أو استمتع بالقراءة المستمرة.</div>
      </div>` : `
      <div class="card">
        ${reviewRowMini('الحفظ الجديد', queue.new.length, 'new')}
        ${reviewRowMini('التثبيت', queue.consolidation.length, 'loose')}
        ${reviewRowMini('المراجعة القريبة', queue.near.length, 'stable')}
        ${reviewRowMini('المراجعة البعيدة', queue.far.length, 'weak')}
        <button class="btn btn-primary btn-block mt12" data-action="set-tab" data-tab="review">${icon('refresh')} ابدأ المراجعة</button>
      </div>`}

    <div class="section-title">${icon('book')} متابعة الحفظ</div>
    <div class="card">
      <div class="row-between">
        <div>
          <div style="font-weight:800; font-size:14px;">من البداية</div>
          <div class="muted small">${fwd > 0 ? `آخر موضع: صفحة ${fwd}` : 'لم يبدأ بعد'}</div>
        </div>
        <button class="btn btn-soft btn-sm" data-action="quick-continue" data-track="forward">
          ${fwd > 0 ? 'صفحة ' + fwdNext : 'ابدأ'} ${icon('chevronL')}
        </button>
      </div>
      <hr class="hr">
      <div class="row-between">
        <div>
          <div style="font-weight:800; font-size:14px;">من النهاية</div>
          <div class="muted small">${bwd <= TOTAL_PAGES ? `آخر موضع: صفحة ${bwd}` : 'لم يبدأ بعد'}</div>
        </div>
        <button class="btn btn-soft btn-sm" data-action="quick-continue" data-track="backward">
          ${bwd <= TOTAL_PAGES ? 'صفحة ' + bwdNext : 'ابدأ'} ${icon('chevronR')}
        </button>
      </div>
    </div>

    ${contBatch.length ? `
    <div class="section-title">${icon('target')} القراءة المستمرة اليوم</div>
    <div class="card">
      <div class="muted small mt8" style="margin-top:0;">دورة يومية خفيفة على كل المحفوظ لتثبيت الربط العام</div>
      <div class="btn-row mt8">
        ${contBatch.map(p => `<span class="chip">صفحة ${p}</span>`).join('')}
      </div>
      <button class="btn btn-outline btn-block mt12" data-action="continuous-done">${icon('check')} تم قراءتها اليوم</button>
    </div>` : ''}

    <div class="section-title">${icon('shield')} لمحة سريعة</div>
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${stats.stable}</div><div class="lbl">صفحات ثابتة</div></div>
      <div class="stat-box"><div class="num">${stats.loose + stats.weak}</div><div class="lbl">تحتاج تثبيتًا</div></div>
    </div>
  `;
}

function reviewRowMini(label, count, cls) {
  return `
    <div class="row-between" style="padding:7px 0;">
      <div style="display:flex; align-items:center; gap:9px;">
        <span class="chip ${cls}">${label}</span>
      </div>
      <span style="font-weight:900; font-size:15px;">${count}</span>
    </div>`;
}
