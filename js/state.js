/* ============================================================
   حصوني — التخزين، الحالة، وخوارزمية المراجعة (الحصون الخمسة)
   ============================================================ */

const STORAGE_KEY = 'husuni_state_v1';
const HAS_ARTIFACT_STORAGE = (typeof window !== 'undefined' && !!window.storage);

async function storageGet(key) {
  try {
    if (HAS_ARTIFACT_STORAGE) {
      const r = await window.storage.get(key, false);
      return r ? r.value : null;
    } else {
      return window.localStorage.getItem(key);
    }
  } catch (e) { return null; }
}
async function storageSet(key, valueStr) {
  try {
    if (HAS_ARTIFACT_STORAGE) {
      await window.storage.set(key, valueStr, false);
    } else {
      window.localStorage.setItem(key, valueStr);
    }
    return true;
  } catch (e) { console.error('storage set failed', e); return false; }
}

function defaultState() {
  return {
    version: 1,
    settings: {
      theme: 'auto',
      dailyMemUnit: 'page', dailyMemCount: 1,
      dailyRevUnit: 'page', dailyRevCount: 5,
      continuousDailyPages: 5,
      reciterId: 'yassin',
      playbackRate: 1.0,
      repeatCount: 1,
    },
    tracks: {
      forward: { lastPage: 0, startedAt: null },
      backward: { lastPage: TOTAL_PAGES + 1, startedAt: null },
    },
    pages: {},        // pageNum(str) -> {status,box,track,dateMemorized,lastReview,nextReview,reviewCount,mistakeCount,history:[]}
    notes: [],         // {id,createdAt,type,ref,text}
    recordings: [],    // {id,createdAt,surahNum,label,durationSec,audioDataUrl,mime}
    testHistory: [],   // {id,date,scope,total,correct}
    dailyLog: {},       // 'YYYY-MM-DD' -> {reviewedPages:[...], newPages:[...], continuousPages:[...]}
    continuousCursor: 1, // آخر صفحة وصلت إليها القراءة المستمرة (تدور على المحفوظ كله)
  };
}

let STATE = defaultState();
let SAVE_TIMER = null;

function scheduleSave() {
  if (SAVE_TIMER) clearTimeout(SAVE_TIMER);
  SAVE_TIMER = setTimeout(saveState, 350);
}
async function saveState() {
  await storageSet(STORAGE_KEY, JSON.stringify(STATE));
  const el = document.getElementById('save-indicator');
  if (el) {
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 900);
  }
}
async function loadState() {
  const raw = await storageGet(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      STATE = Object.assign(defaultState(), parsed);
      STATE.settings = Object.assign(defaultState().settings, parsed.settings || {});
      STATE.tracks = Object.assign(defaultState().tracks, parsed.tracks || {});
    } catch (e) { console.error('parse failed, using default', e); STATE = defaultState(); }
  }
}

/* ---------- منطق الصفحات وحالتها ---------- */

function getPageRec(pageNum) {
  return STATE.pages[String(pageNum)] || null;
}
function ensurePageRec(pageNum) {
  const k = String(pageNum);
  if (!STATE.pages[k]) {
    STATE.pages[k] = { status: null, box: 0, track: null, dateMemorized: null, lastReview: null, nextReview: null, reviewCount: 0, mistakeCount: 0, history: [] };
  }
  return STATE.pages[k];
}

// تحديد صفحات وحدة معيّنة (سورة/جزء/حزب...) كمحفوظة حديثًا ضمن مسار معيّن
function memorizeUnit(unitType, unitId, track) {
  const range = unitPageRange(unitType, unitId);
  if (!range) return [];
  const [p1, p2] = range;
  const affected = [];
  for (let p = p1; p <= p2; p++) {
    const rec = ensurePageRec(p);
    if (!rec.status) {
      rec.status = 'new';
      rec.box = 1;
      rec.track = track;
      rec.dateMemorized = todayStr();
      rec.lastReview = null;
      rec.nextReview = addDays(todayStr(), 1);
      rec.reviewCount = 0;
      rec.mistakeCount = 0;
      rec.history = [{ date: todayStr(), action: 'حفظ' }];
      affected.push(p);
    }
  }
  // تحديث مؤشر المسار (أبعد نقطة وصلت إليها)
  if (track === 'forward') {
    STATE.tracks.forward.lastPage = Math.max(STATE.tracks.forward.lastPage, p2);
    if (!STATE.tracks.forward.startedAt) STATE.tracks.forward.startedAt = todayStr();
  } else if (track === 'backward') {
    STATE.tracks.backward.lastPage = Math.min(STATE.tracks.backward.lastPage, p1);
    if (!STATE.tracks.backward.startedAt) STATE.tracks.backward.startedAt = todayStr();
  }
  logDaily('newPages', affected);
  scheduleSave();
  return affected;
}

function logDaily(field, pages) {
  if (!pages || !pages.length) return;
  const t = todayStr();
  if (!STATE.dailyLog[t]) STATE.dailyLog[t] = { reviewedPages: [], newPages: [], continuousPages: [] };
  STATE.dailyLog[t][field] = (STATE.dailyLog[t][field] || []).concat(pages);
}

// نتيجة مراجعة صفحة: 'good' أو 'mistake'
function reviewPage(pageNum, result) {
  const rec = ensurePageRec(pageNum);
  const t = todayStr();
  rec.lastReview = t;
  rec.reviewCount = (rec.reviewCount || 0) + 1;

  if (result === 'mistake') {
    rec.mistakeCount = (rec.mistakeCount || 0) + 1;
    rec.status = 'loose';
    rec.box = 1;
    rec.nextReview = addDays(t, 1);
    rec.history.push({ date: t, action: 'خطأ' });
  } else {
    const prevStatus = rec.status;
    rec.box = Math.min((rec.box || 1) + 1, 5);
    if (prevStatus === 'loose') {
      rec.status = rec.box >= 2 ? 'weak' : 'loose';
    } else if (prevStatus === 'weak') {
      rec.status = rec.box >= 4 ? 'stable' : 'weak';
    } else if (prevStatus === 'new') {
      rec.status = rec.box >= 3 ? 'stable' : 'new';
    } else { // stable already
      rec.status = 'stable';
    }
    rec.nextReview = addDays(t, BOX_INTERVALS[rec.box] || 20);
    rec.history.push({ date: t, action: 'إتقان' });
  }
  logDaily('reviewedPages', [pageNum]);
  scheduleSave();
  return rec;
}

// جميع الصفحات المحفوظة (لها status)
function allMemorizedPages() {
  return Object.keys(STATE.pages).map(Number).filter(p => STATE.pages[p].status).sort((a, b) => a - b);
}

function pagesByStatus(status) {
  return allMemorizedPages().filter(p => getPageRec(p).status === status);
}

// حساب قائمة المراجعة المطلوبة اليوم، مصنّفة إلى الفئات الخمس
function computeReviewQueue() {
  const t = todayStr();
  const due = allMemorizedPages().filter(p => {
    const r = getPageRec(p);
    return r.nextReview && r.nextReview <= t;
  });
  const cats = { new: [], consolidation: [], near: [], far: [] };
  due.forEach(p => {
    const r = getPageRec(p);
    if (r.status === 'new') cats.new.push(p);
    else if (r.status === 'weak' || r.status === 'loose') cats.consolidation.push(p);
    else { // stable
      const age = r.dateMemorized ? daysBetween(r.dateMemorized, t) : 999;
      if (age < STABLE_NEAR_DAYS) cats.near.push(p);
      else cats.far.push(p);
    }
  });
  return cats;
}

// القراءة المستمرة: دفعة يومية تدور على كل المحفوظ (مسارين معًا) للربط والتثبيت العام
function computeContinuousBatch() {
  const mem = allMemorizedPages();
  if (!mem.length) return [];
  const n = Math.max(1, STATE.settings.continuousDailyPages || 5);
  let idx = mem.indexOf(STATE.continuousCursor);
  if (idx === -1) idx = 0;
  const batch = [];
  for (let i = 0; i < n && i < mem.length; i++) {
    batch.push(mem[(idx + i) % mem.length]);
  }
  return batch;
}
function advanceContinuousCursor() {
  const mem = allMemorizedPages();
  if (!mem.length) return;
  const batch = computeContinuousBatch();
  logDaily('continuousPages', batch);
  const lastIdx = mem.indexOf(batch[batch.length - 1]);
  STATE.continuousCursor = mem[(lastIdx + 1) % mem.length];
  scheduleSave();
}

/* ---------- إحصائيات ---------- */
function computeStats() {
  const mem = allMemorizedPages();
  const totalMem = mem.length;
  const fwd = STATE.tracks.forward.lastPage;
  const bwd = STATE.tracks.backward.lastPage;
  const fromStart = fwd; // عدد الصفحات من البداية
  const fromEnd = (bwd <= TOTAL_PAGES) ? (TOTAL_PAGES - bwd + 1) : 0;
  const stable = pagesByStatus('stable').length;
  const weak = pagesByStatus('weak').length;
  const loose = pagesByStatus('loose').length;
  const nw = pagesByStatus('new').length;
  const queue = computeReviewQueue();
  const todayCount = queue.new.length + queue.consolidation.length + queue.near.length + queue.far.length;
  return {
    totalMem, fromStart, fromEnd, stable, weak, loose, nw, todayCount,
    percent: Math.round((totalMem / TOTAL_PAGES) * 1000) / 10,
  };
}
