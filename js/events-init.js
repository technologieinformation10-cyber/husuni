/* ============================================================
   حصوني — ربط الأحداث + الإقلاع
   ============================================================ */

function afterRenderHooks() {
  // player selects
  const psel = document.getElementById('player-surah-select');
  if (psel) psel.onchange = () => { UI.player.surah = Number(psel.value); playerLoadSurah(); render(); if (UI.player.playing) getAudioEl().play().catch(() => {}); };
  const rsel = document.getElementById('player-reciter-select');
  if (rsel) rsel.onchange = () => { STATE.settings.reciterId = rsel.value; scheduleSave(); playerLoadSurah(); if (UI.player.playing) getAudioEl().play().catch(() => {}); };
  const seek = document.getElementById('seek');
  if (seek) {
    seek.oninput = () => { seek._dragging = true; };
    seek.onchange = () => { getAudioEl().currentTime = Number(seek.value); seek._dragging = false; };
  }
  if (AUDIO) {
    const dur = document.getElementById('dur-time');
    if (dur) dur.textContent = fmtTime(AUDIO.duration);
  }

  // test scope
  const tst = document.getElementById('test-scope-type');
  if (tst) { tst.onchange = testScopeTypeChanged; testScopeTypeChanged(); }

  // import file
  const imp = document.getElementById('import-file-input');
  if (imp) imp.onchange = handleImportFile;

  const recSel = document.getElementById('set-reciter');
  if (recSel) recSel.onchange = setReciterFromSelect;
}

function activateSegButton(btn) {
  const seg = btn.parentElement;
  seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;

  switch (action) {
    case 'add-track-select':
      activateSegButton(t); UI._add.track = t.dataset.val; updateAddPreview();
      break;
    case 'add-unit-select':
      activateSegButton(t); UI._add.unit = t.dataset.val; UI._add.count = 1;
      document.getElementById('add-count-val').textContent = '1'; updateAddPreview();
      break;
    case 'note-type-select':
      activateSegButton(t);
      break;
    case 'toggle-theme':
      STATE.settings.theme = (currentEffectiveTheme() === 'dark') ? 'light' : 'dark';
      applyTheme(); scheduleSave(); render();
      break;
    case 'set-tab': setTab(t.dataset.tab); break;
    case 'goto-loose': gotoLoose(); break;
    case 'mem-unit-view': UI.memUnitView = t.dataset.type; render(); break;
    case 'open-unit': openUnit(t.dataset.type, t.dataset.id); break;
    case 'unit-nav': unitNav(Number(t.dataset.dir)); break;
    case 'set-status': setPageStatus(Number(t.dataset.page), t.dataset.status); break;
    case 'close-sheet':
      // أغلق فقط عند النقر على الخلفية المعتمة نفسها أو زر الإغلاق الصريح،
      // وليس عند النقر داخل محتوى الورقة (التي لم تعد توقف انتشار الحدث يدويًا)
      if (!t.classList.contains('overlay') || e.target === t) closeSheet();
      break;
    case 'open-add-sheet': openAddSheet(); break;
    case 'add-count-step': {
      const nv = Math.max(1, UI._add.count + Number(t.dataset.dir));
      UI._add.count = nv;
      document.getElementById('add-count-val').textContent = nv;
      updateAddPreview();
      break;
    }
    case 'confirm-add': confirmAdd(); break;
    case 'quick-continue': openQuickContinue(t.dataset.track); break;
    case 'continuous-done': continuousDone(); break;
    case 'open-review-page': openReviewPage(Number(t.dataset.page)); break;
    case 'do-review': doReview(Number(t.dataset.page), t.dataset.result); break;
    case 'recite-sub': UI.reciteSub = t.dataset.sub; render(); break;
    case 'player-toggle': playerToggle(); break;
    case 'player-prev': playerPrevNext(-1); break;
    case 'player-next': playerPrevNext(1); break;
    case 'player-loop-a': LOOP.a = getAudioEl().currentTime; render(); break;
    case 'player-loop-b': LOOP.b = getAudioEl().currentTime; render(); break;
    case 'player-loop-toggle': LOOP.active = !LOOP.active; render(); break;
    case 'set-rate': STATE.settings.playbackRate = Number(t.dataset.rate); if (AUDIO) AUDIO.playbackRate = Number(t.dataset.rate); scheduleSave(); render(); break;
    case 'repeat-step': STATE.settings.repeatCount = Math.max(1, STATE.settings.repeatCount + Number(t.dataset.dir)); scheduleSave(); render(); break;
    case 'start-test': startTest(); break;
    case 'end-test': endTest(); break;
    case 'test-reveal': testReveal(); break;
    case 'test-answer': testAnswer(t.dataset.ok === '1'); break;
    case 'toggle-record': toggleRecord(); break;
    case 'play-recording': playRecording(t.dataset.id); break;
    case 'delete-recording': deleteRecording(t.dataset.id); break;
    case 'more-sub': UI.moreSub = t.dataset.sub; render(); break;
    case 'open-note-sheet': openNoteSheet(); break;
    case 'save-note': saveNote(); break;
    case 'delete-note': deleteNote(t.dataset.id); break;
    case 'setting-step': settingStep(t.dataset.field, Number(t.dataset.dir)); break;
    case 'set-theme': setTheme(t.dataset.theme); break;
    case 'export-backup': exportBackup(); break;
    case 'trigger-import': triggerImport(); break;
    case 'reset-all': resetAll(); break;
  }
});

function currentEffectiveTheme() {
  return document.documentElement.getAttribute('data-theme');
}

function openQuickContinue(track) {
  UI._add = { track, unit: 'page', count: STATE.settings.dailyMemCount || 1 };
  openAddSheet();
  // reflect track selection visually
  const seg = document.getElementById('add-track-seg');
  if (seg) {
    seg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.val === track));
  }
  const uSeg = document.getElementById('add-unit-seg');
  if (uSeg) {
    uSeg.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.val === (STATE.settings.dailyMemUnit || 'page')));
    UI._add.unit = STATE.settings.dailyMemUnit || 'page';
  }
  document.getElementById('add-count-val').textContent = UI._add.count;
  updateAddPreview();
}

// settings selects that affect UI._add-independent state (mem unit default) — bound via change on settings tab
document.addEventListener('change', (e) => {
  if (e.target.id === 'set-mem-unit') { STATE.settings.dailyMemUnit = e.target.value; scheduleSave(); }
});

/* ============================================================
   الإقلاع
   ============================================================ */
async function initApp() {
  renderShell();
  await loadState();
  applyTheme();
  render();
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (STATE.settings.theme === 'auto') applyTheme(); });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
