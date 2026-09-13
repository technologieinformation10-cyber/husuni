/* ============================================================
   حصوني — واجهة «المراجعة» (الحصون الخمسة)
   ============================================================ */

const CATEGORY_META = {
  new: { label: 'الحصن الأول: المحفوظ الجديد', cls: 'new', desc: 'مراجعة مكثفة لما حفظته حديثًا' },
  consolidation: { label: 'الحصن الثاني: التثبيت', cls: 'loose', desc: 'صفحات تحتاج عناية إضافية بعد ضعف أو خطأ' },
  near: { label: 'الحصن الثالث: المراجعة القريبة', cls: 'stable', desc: 'ما حفظته خلال الأسابيع الأخيرة' },
  far: { label: 'الحصن الرابع: المراجعة البعيدة', cls: 'weak', desc: 'مراجعة منهجية للمحفوظ القديم' },
};

function renderReview() {
  const q = computeReviewQueue();
  const total = q.new.length + q.consolidation.length + q.near.length + q.far.length;

  if (total === 0) {
    return `
      <div class="view-title">المراجعة</div>
      <div class="card empty">
        ${icon('shield')}
        <div class="t">لا توجد مراجعات مستحقة</div>
        <div class="small">بارك الله فيك، أنت على رأس مراجعتك اليوم.</div>
      </div>
      ${renderContinuousCard()}
    `;
  }

  let html = `<div class="view-title">المراجعة</div><div class="view-sub">${total} صفحة مستحقة اليوم — رتّبناها حسب الأولوية</div>`;
  ['consolidation', 'new', 'near', 'far'].forEach(catKey => {
    const pages = q[catKey];
    if (!pages.length) return;
    const meta = CATEGORY_META[catKey];
    html += `
      <div class="section-title">${meta.label} <span class="count">${pages.length}</span></div>
      <div class="view-sub" style="margin-top:-8px;">${meta.desc}</div>
      <div class="card" style="padding:6px 10px;">
        ${pages.map(p => {
          const d = pageDisplayName(p);
          return `
          <div class="list-row" data-action="open-review-page" data-page="${p}">
            <span class="status-dot" style="background:var(--${meta.cls});"></span>
            <div class="main">
              <div class="title">صفحة ${p} <span class="muted small">— ${d.surahName}</span></div>
              <div class="sub">جزء ${d.juz} · حزب ${d.hizb}</div>
            </div>
            ${icon('chevronL')}
          </div>`;
        }).join('')}
      </div>`;
  });
  html += renderContinuousCard();
  return html;
}

function renderContinuousCard() {
  const batch = computeContinuousBatch();
  if (!batch.length) return '';
  return `
    <div class="section-title">${icon('target')} الحصن الخامس: القراءة المستمرة</div>
    <div class="view-sub" style="margin-top:-8px;">قراءة دورية لكل المحفوظ دون تسميع، لتقوية الربط العام</div>
    <div class="card">
      <div class="btn-row">${batch.map(p => `<span class="chip">صفحة ${p} <span class="muted">(${pageDisplayName(p).surahName})</span></span>`).join('')}</div>
      <button class="btn btn-outline btn-block mt12" data-action="continuous-done">${icon('check')} تمت قراءتها</button>
    </div>`;
}

/* ---------- ورقة مراجعة صفحة: إتقان أو خطأ ---------- */
function openReviewPage(pageNum) {
  const r = getPageRec(pageNum);
  const d = pageDisplayName(pageNum);
  const imgHtml = mushafImageHtml(pageNum);
  const html = `
    <div class="overlay" data-action="close-sheet">
      <div class="sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">مراجعة صفحة ${pageNum} ${iconBtnClose()}</div>
        <div class="muted small mt8" style="margin-top:-6px; margin-bottom:12px;">${d.surahName} · جزء ${d.juz} · حزب ${d.hizb} · الحالة الحالية: ${statusLabel(r.status)}</div>
        ${imgHtml}
        <div class="btn-row mt16">
          <button class="btn btn-maroon" style="flex:1;" data-action="do-review" data-page="${pageNum}" data-result="mistake">${icon('x')} فيه خطأ</button>
          <button class="btn btn-primary" style="flex:1;" data-action="do-review" data-page="${pageNum}" data-result="good">${icon('check')} متقنة</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modal-root').innerHTML = html;
}

function statusLabel(s) {
  return { new: 'جديد', stable: 'ثابت', weak: 'ضعيف', loose: 'متفلت' }[s] || '—';
}

function doReview(pageNum, result) {
  reviewPage(pageNum, result);
  closeSheet();
  toast(result === 'good' ? 'أحسنت! تم تحديث حالة الصفحة ✓' : 'سجّلنا الخطأ، ستُضاف الصفحة لقائمة التثبيت');
  render();
}

function continuousDone() {
  advanceContinuousCursor();
  toast('بارك الله فيك ✓');
  render();
}
