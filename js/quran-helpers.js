/* ============================================================
   حصوني — البيانات الأساسية (هيكل المصحف، السور، القراء)
   ============================================================ */

const TOTAL_PAGES = QURAN_STRUCTURE.totalPages; // 604

// فهارس سريعة
const SURAH_BY_NUM = {};
QURAN_STRUCTURE.surahs.forEach(s => { SURAH_BY_NUM[s.n] = s; });

function pageToSurahs(pageNum) {
  // page can contain the tail of one surah + start of next (rare) -> return array
  return QURAN_STRUCTURE.surahs.filter(s => pageNum >= s.p1 && pageNum <= s.p2);
}
function pageMainSurah(pageNum) {
  const arr = pageToSurahs(pageNum);
  return arr.length ? arr[arr.length - 1] : null; // the surah "governing" this page (last one that starts on/before it and covers it)
}
function juzOfPage(pageNum) {
  return QURAN_STRUCTURE.juz.find(j => pageNum >= j.p1 && pageNum <= j.p2) || null;
}
function hizbOfPage(pageNum) {
  return QURAN_STRUCTURE.hizb.find(h => pageNum >= h.p1 && pageNum <= h.p2) || null;
}
function rubOfPage(pageNum) {
  return QURAN_STRUCTURE.rub.find(r => pageNum >= r.p1 && pageNum <= r.p2) || null;
}
function thumnOfPage(pageNum) {
  return QURAN_STRUCTURE.thumn.find(t => pageNum >= t.p1 && pageNum <= t.p2) || null;
}

// تحويل وحدة (سورة/جزء/حزب/ربع/ثمن) إلى مدى صفحات
function unitPageRange(unitType, unitId) {
  let item = null;
  if (unitType === 'surah') item = SURAH_BY_NUM[unitId];
  else if (unitType === 'juz') item = QURAN_STRUCTURE.juz.find(x => x.j === unitId);
  else if (unitType === 'hizb') item = QURAN_STRUCTURE.hizb.find(x => x.h === unitId);
  else if (unitType === 'rub') item = QURAN_STRUCTURE.rub.find(x => x.r === unitId);
  else if (unitType === 'thumn') item = QURAN_STRUCTURE.thumn.find(x => x.t === unitId);
  if (!item) return null;
  return [item.p1, item.p2];
}

function unitLabel(unitType) {
  return { surah: 'سورة', page: 'صفحة', thumn: 'ثمن', rub: 'ربع', hizb: 'حزب', juz: 'جزء' }[unitType] || unitType;
}

// اسم عرض لصفحة: السورة (الأجزاء/الأحزاب)
function pageDisplayName(pageNum) {
  const s = pageMainSurah(pageNum);
  const j = juzOfPage(pageNum);
  const h = hizbOfPage(pageNum);
  return {
    surahName: s ? s.name : '',
    surahNum: s ? s.n : null,
    juz: j ? j.j : null,
    hizb: h ? h.h : null,
  };
}

/* ============================================================
   قائمة القراء برواية ورش عن نافع (مصدر: mp3quran.net API عام)
   نمط الرابط: {server}{surah:3 digits}.mp3
   ============================================================ */
const WARSH_RECITERS = [
  { id: 'yassin', name: 'ياسين الجزائري', server: 'https://server11.mp3quran.net/qari/' },
  { id: 'hussary', name: 'محمود خليل الحصري', server: 'https://server13.mp3quran.net/husr/Rewayat-Warsh-A-n-Nafi/' },
  { id: 'dosari', name: 'إبراهيم الدوسري', server: 'https://server10.mp3quran.net/ibrahim_dosri/Rewayat-Warsh-A-n-Nafi/' },
  { id: 'koshi', name: 'العيون الكوشي', server: 'https://server11.mp3quran.net/koshi/' },
  { id: 'benkirane', name: 'عبد المجيب بنكيران', server: 'https://server16.mp3quran.net/A-Benkirane/Rewayat-Warsh-A-n-Nafi/' },
];
function reciterAudioUrl(reciterId, surahNum) {
  const r = WARSH_RECITERS.find(x => x.id === reciterId) || WARSH_RECITERS[0];
  const nnn = String(surahNum).padStart(3, '0');
  return r.server + nnn + '.mp3';
}

/* ============================================================
   نظام الحصون الخمسة — إعدادات الخوارزمية
   ============================================================ */
const BOX_INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 9, 5: 20 }; // أيام قبل المراجعة التالية
const STABLE_NEAR_DAYS = 45; // أقل من هذا العمر (منذ الحفظ) = مراجعة قريبة، أكثر = بعيدة

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00'), db = new Date(b + 'T00:00:00');
  return Math.round((db - da) / 86400000);
}
