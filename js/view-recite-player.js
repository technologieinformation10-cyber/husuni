/* ============================================================
   حصوني — واجهة «التلاوة»: المشغّل + الاختبار + التسميع
   ============================================================ */

function renderRecite() {
  const subs = [['player', 'الاستماع'], ['test', 'الاختبار'], ['record', 'التسميع']];
  let body = '';
  if (UI.reciteSub === 'player') body = renderPlayer();
  else if (UI.reciteSub === 'test') body = renderTestTab();
  else if (UI.reciteSub === 'record') body = renderRecordTab();
  return `
    <div class="view-title">التلاوة</div>
    <div class="subtabs">${subs.map(([id, l]) => `<button class="${UI.reciteSub === id ? 'active' : ''}" data-action="recite-sub" data-sub="${id}">${l}</button>`).join('')}</div>
    ${body}
  `;
}

/* ---------- المشغّل الصوتي ---------- */
let AUDIO = null;
let LOOP = { a: null, b: null, active: false };

function getAudioEl() {
  if (!AUDIO) {
    AUDIO = new Audio();
    AUDIO.addEventListener('timeupdate', onAudioTimeUpdate);
    AUDIO.addEventListener('ended', onAudioEnded);
    AUDIO.addEventListener('loadedmetadata', () => { const el = document.getElementById('seek'); if (el) el.max = Math.floor(AUDIO.duration || 0); });
  }
  return AUDIO;
}
function onAudioTimeUpdate() {
  const seek = document.getElementById('seek');
  if (seek && !seek._dragging) seek.value = Math.floor(AUDIO.currentTime);
  const cur = document.getElementById('cur-time');
  if (cur) cur.textContent = fmtTime(AUDIO.currentTime);
  if (LOOP.active && LOOP.b != null && AUDIO.currentTime >= LOOP.b) {
    AUDIO.currentTime = LOOP.a || 0;
  }
}
function onAudioEnded() {
  if (UI.player.repeatCount > 1) {
    UI.player.repeatDone = (UI.player.repeatDone || 0) + 1;
    if (UI.player.repeatDone < UI.player.repeatCount) { AUDIO.currentTime = 0; AUDIO.play(); return; }
  }
  UI.player.repeatDone = 0;
  UI.player.playing = false;
  updatePlayButton();
}
function fmtTime(s) {
  s = Math.floor(s || 0);
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

function renderPlayer() {
  const surah = SURAH_BY_NUM[UI.player.surah];
  return `
    <div class="field">
      <label>السورة</label>
      <select id="player-surah-select">
        ${QURAN_STRUCTURE.surahs.map(s => `<option value="${s.n}" ${s.n === UI.player.surah ? 'selected' : ''}>${s.n}. ${s.name}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label>القارئ (رواية ورش عن نافع)</label>
      <select id="player-reciter-select">
        ${WARSH_RECITERS.map(r => `<option value="${r.id}" ${r.id === STATE.settings.reciterId ? 'selected' : ''}>${r.name}</option>`).join('')}
      </select>
    </div>

    <div class="player-card">
      <div class="surah font-amiri">${surah.name}</div>
      <div class="meta">${surah.rev} · ${surah.ayat} آية</div>
      <input type="range" id="seek" class="seekbar" min="0" max="100" value="0">
      <div class="range-row row-between"><span id="cur-time">00:00</span><span id="dur-time">00:00</span></div>
      <div class="player-controls">
        <button data-action="player-loop-a" title="بداية التكرار">A</button>
        <button data-action="player-prev">${icon('prev')}</button>
        <button class="play" data-action="player-toggle" id="play-btn">${icon(UI.player.playing ? 'stop' : 'play')}</button>
        <button data-action="player-next">${icon('next')}</button>
        <button data-action="player-loop-b" title="نهاية التكرار">B</button>
      </div>
      <div class="row-between mt12" style="opacity:.9;">
        <span class="small">${LOOP.a != null ? 'A:' + fmtTime(LOOP.a) : ''} ${LOOP.b != null ? ' B:' + fmtTime(LOOP.b) : ''}</span>
        ${LOOP.a != null && LOOP.b != null ? `<button class="btn btn-sm" style="background:rgba(255,255,255,.18);color:#fff;" data-action="player-loop-toggle">${LOOP.active ? '⟲ إيقاف تكرار المقطع' : '⟲ تكرار المقطع'}</button>` : ''}
      </div>
    </div>

    <div class="card mt16">
      <div class="row-between">
        <span class="settings-row-lbl" style="font-weight:700; font-size:13.5px;">${icon('speed')} سرعة الصوت</span>
        <span style="font-weight:900;">${STATE.settings.playbackRate}×</span>
      </div>
      <div class="seg mt8">
        ${[0.75, 1, 1.25, 1.5, 1.75].map(v => `<button class="${STATE.settings.playbackRate === v ? 'active' : ''}" data-action="set-rate" data-rate="${v}">${v}×</button>`).join('')}
      </div>
      <hr class="hr">
      <div class="row-between">
        <span style="font-weight:700; font-size:13.5px;">${icon('repeat')} تكرار السورة</span>
        <span style="font-weight:900;">${STATE.settings.repeatCount}×</span>
      </div>
      <div class="stepper mt8">
        <button data-action="repeat-step" data-dir="-1">−</button>
        <span class="val">${STATE.settings.repeatCount}</span>
        <button data-action="repeat-step" data-dir="1">+</button>
      </div>
    </div>
    <div class="muted small center mt8">الصوت يُبَث من mp3quran.net عبر الإنترنت — يلزم اتصال بالشبكة</div>
  `;
}

function playerLoadSurah() {
  const el = getAudioEl();
  const wasPlaying = UI.player.playing;
  el.pause();
  el.src = reciterAudioUrl(STATE.settings.reciterId, UI.player.surah);
  el.playbackRate = STATE.settings.playbackRate;
  LOOP = { a: null, b: null, active: false };
  UI.player.repeatDone = 0;
  if (wasPlaying) el.play().catch(() => { toast('تعذّر تشغيل الصوت — تحقق من الاتصال بالإنترنت'); UI.player.playing = false; updatePlayButton(); });
}
function updatePlayButton() {
  const btn = document.getElementById('play-btn');
  if (btn) btn.innerHTML = icon(UI.player.playing ? 'stop' : 'play');
}
function playerToggle() {
  const el = getAudioEl();
  if (!el.src) playerLoadSurah();
  if (UI.player.playing) { el.pause(); UI.player.playing = false; }
  else {
    el.playbackRate = STATE.settings.playbackRate;
    el.play().then(() => { UI.player.playing = true; updatePlayButton(); })
      .catch(() => { toast('تعذّر تشغيل الصوت — تحقق من الاتصال بالإنترنت'); });
  }
  updatePlayButton();
}
function playerPrevNext(dir) {
  UI.player.surah = Math.min(114, Math.max(1, UI.player.surah + dir));
  playerLoadSurah();
  render();
  if (UI.player.playing) getAudioEl().play().catch(() => {});
}
