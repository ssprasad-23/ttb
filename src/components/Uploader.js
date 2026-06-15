/**
 * Uploader.js
 * Main UI component for the TTB Label AI Verification tool.
 *
 * Responsibilities:
 *  - Renders the drop zone, file list, action bar, timing bar, and result area
 *  - Manages the in-memory file queue (add, remove, clear)
 *  - On "Check Labels": encodes files to base64 in parallel, calls the Claude API
 *    for each, and renders pass/fail results as they arrive
 *  - Tracks four timing milestones (Start, Base64, Claude response, Display result)
 *    and updates the timing bar live every 50ms
 */

import checkLabel from '../utils/claudeCheck.js'
import toBase64 from '../utils/toBase64.js'
import { renderResult } from './ResultDisplay.js'

// File types accepted for upload — passed to both the input[accept] attribute and runtime validation
const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff', 'application/pdf'
])

/** Formats milliseconds as SS:mmm (e.g. 02:450) */
function formatTime(ms) {
  if (ms < 0) ms = 0
  const s = Math.floor(ms / 1000)
  const millis = ms % 1000
  return `${String(s).padStart(2, '0')}:${String(millis).padStart(3, '0')}`
}

/**
 * Mounts the full uploader UI into the given element and wires up all interactions.
 *
 * @param {HTMLElement} element - The container element to render into (e.g. #uploader)
 */
export function setupUploader(element) {
  element.innerHTML = `
    <h1 class="app-title">TTB Label AI Verification</h1>
    <div class="timing-bar">
      <div class="timing-stages">
        <div class="timing-progress-line">
          <div class="timing-progress-fill" id="track-fill"></div>
        </div>
        <div class="timing-item">
          <span class="timing-dot" id="dot-0"></span>
          <span class="timing-label">Start</span>
          <span class="timing-value" id="t-start">00:000</span>
        </div>
        <div class="timing-item">
          <span class="timing-dot" id="dot-1"></span>
          <span class="timing-label">Base64 encoding</span>
          <span class="timing-value" id="t-b64">00:000</span>
        </div>
        <div class="timing-item">
          <span class="timing-dot" id="dot-2"></span>
          <span class="timing-label">Claude response</span>
          <span class="timing-value" id="t-claude">00:000</span>
        </div>
        <div class="timing-item">
          <span class="timing-dot" id="dot-3"></span>
          <span class="timing-label">Display result</span>
          <span class="timing-value" id="t-display">00:000</span>
        </div>
      </div>
    </div>
    <div class="drop-zone" id="drop-zone">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p class="drop-label">Drag &amp; drop files here</p>
      <p class="drop-sub">or <label class="browse-link" for="file-input">browse to upload</label></p>
      <p class="drop-formats">JPG · PNG · WEBP · GIF · TIFF · PDF</p>
      <input type="file" id="file-input" accept="image/jpeg,image/png,image/webp,image/gif,image/tiff,application/pdf" multiple hidden />
    </div>
    <div class="file-list" id="file-list"></div>
    <div class="preview-actions" id="action-bar" hidden>
      <span class="file-count" id="file-count"></span>
      <button class="check-btn" id="check-btn">Check Labels</button>
      <button class="remove-btn" id="remove-btn">Clear</button>
    </div>
    <div id="result-area"></div>
  `

  // --- DOM refs ---
  const dropZone    = element.querySelector('#drop-zone')
  const fileInput   = element.querySelector('#file-input')
  const fileListEl  = element.querySelector('#file-list')
  const actionBar   = element.querySelector('#action-bar')
  const removeBtn   = element.querySelector('#remove-btn')
  const checkBtn    = element.querySelector('#check-btn')
  const fileCountEl = element.querySelector('#file-count')
  const resultArea  = element.querySelector('#result-area')

  // Timing bar display elements
  const tStartEl   = element.querySelector('#t-start')
  const tB64El     = element.querySelector('#t-b64')
  const tClaudeEl  = element.querySelector('#t-claude')
  const tDisplayEl = element.querySelector('#t-display')
  const trackFill  = element.querySelector('#track-fill')
  const dots       = [0,1,2,3].map(i => element.querySelector(`#dot-${i}`))

  // --- Timing state ---
  // All 4 timers share the same startTime; each freezes independently at its milestone:
  //   startTime → b64Done (all files encoded)
  //             → firstClaudeDone (first API response received)
  //             → firstDisplayDone (first result rendered)
  //             → allDone (all results rendered; Start timer freezes here)
  let timing = {
    startTime: null, b64Done: null,
    firstClaudeDone: null, firstDisplayDone: null,
    allDone: null, interval: null
  }

  function setDotState(index, state) {
    dots[index].className = `timing-dot${state ? ` timing-dot--${state}` : ''}`
  }

  /** Clears the interval and resets all timing state and display to 00:000 */
  function resetTimers() {
    clearInterval(timing.interval)
    timing = {
      startTime: null, b64Done: null,
      firstClaudeDone: null, firstDisplayDone: null,
      allDone: null, interval: null
    }
    tStartEl.textContent = tB64El.textContent = tClaudeEl.textContent = tDisplayEl.textContent = '00:000'
    ;[tStartEl, tB64El, tClaudeEl, tDisplayEl].forEach(el => el.className = 'timing-value')
    dots.forEach(d => { d.className = 'timing-dot' })
    trackFill.style.width = '0%'
  }

  /** Called every 50ms — updates each display value and freezes it once its milestone is set */
  function updateTimingDisplay() {
    const now = Date.now()
    const { startTime, b64Done, firstClaudeDone, firstDisplayDone, allDone } = timing
    if (!startTime) return

    tStartEl.textContent   = formatTime((firstDisplayDone  ?? now) - startTime)
    tB64El.textContent     = formatTime((b64Done           ?? now) - startTime)
    tClaudeEl.textContent  = formatTime((firstClaudeDone   ?? now) - startTime)
    tDisplayEl.textContent = formatTime((firstDisplayDone  ?? now) - startTime)

    // Active values pulse; completed values are styled normally
    tStartEl.classList.toggle('timing-value--active',   !firstDisplayDone)
    tB64El.classList.toggle('timing-value--active',     !b64Done)
    tClaudeEl.classList.toggle('timing-value--active',  !firstClaudeDone)
    tDisplayEl.classList.toggle('timing-value--active', !firstDisplayDone)

    // Dots glow while running, turn green when frozen
    setDotState(0, firstDisplayDone ? 'done' : 'active')
    setDotState(1, b64Done          ? 'done' : 'active')
    setDotState(2, firstClaudeDone  ? 'done' : 'active')
    setDotState(3, firstDisplayDone ? 'done' : 'active')

    // Progress bar advances 33% per completed milestone
    const pct = firstDisplayDone ? 100 : firstClaudeDone ? 66 : b64Done ? 33 : 0
    trackFill.style.width = `${pct}%`

    if (allDone) clearInterval(timing.interval)
  }

  // --- File queue ---
  let files = []  // Array of { file: File, id: number, objectUrl: string|null }
  let nextId = 0  // Monotonically increasing ID for stable file identification

  /**
   * Validates and adds incoming files to the queue.
   * Unsupported file types are silently skipped.
   * Object URLs are created for images (for thumbnails); PDFs get null.
   */
  function addFiles(incoming) {
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.has(file.type)) continue
      files.push({ file, id: nextId++, objectUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null })
    }
    renderFileList()
    actionBar.hidden = files.length === 0
    resultArea.innerHTML = ''
    resetTimers()
  }

  /** Removes a single file by ID and revokes its object URL to free memory */
  function removeFile(id) {
    const idx = files.findIndex(f => f.id === id)
    if (idx === -1) return
    const entry = files[idx]
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
    files.splice(idx, 1)
    renderFileList()
    actionBar.hidden = files.length === 0
    if (files.length === 0) { resultArea.innerHTML = ''; resetTimers() }
  }

  /** Re-renders the file chip list and updates the file count label */
  function renderFileList() {
    fileListEl.innerHTML = ''
    fileCountEl.textContent = `${files.length} file${files.length === 1 ? '' : 's'} selected`
    for (const { file, id } of files) {
      const card = document.createElement('div')
      card.className = 'file-chip'
      card.innerHTML = `
        <span class="file-chip__name">${file.name}</span>
        <button class="file-chip__remove" aria-label="Remove" data-id="${id}">×</button>
      `
      fileListEl.appendChild(card)
    }
    fileListEl.querySelectorAll('.file-chip__remove').forEach(btn => {
      btn.addEventListener('click', () => removeFile(Number(btn.dataset.id)))
    })
  }

  // --- Drop zone events ---
  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragging') })
  dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('dragging'))
  dropZone.addEventListener('drop',      (e) => { e.preventDefault(); dropZone.classList.remove('dragging'); addFiles(Array.from(e.dataTransfer.files)) })
  fileInput.addEventListener('change',   ()  => { addFiles(Array.from(fileInput.files)); fileInput.value = '' })

  // Clear all files, results, and timing state
  removeBtn.addEventListener('click', () => {
    files.forEach(({ objectUrl }) => { if (objectUrl) URL.revokeObjectURL(objectUrl) })
    files = []
    fileListEl.innerHTML = ''
    fileCountEl.textContent = ''
    actionBar.hidden = true
    resultArea.innerHTML = ''
    resetTimers()
  })

  // --- Check Labels ---
  checkBtn.addEventListener('click', async () => {
    if (files.length === 0) return
    checkBtn.disabled = true
    checkBtn.textContent = 'Checking...'

    resetTimers()
    timing.startTime = Date.now()
    timing.interval = setInterval(updateTimingDisplay, 50)

    // Pre-build a result group for each file so results appear in upload order
    resultArea.innerHTML = ''
    const containers = {}
    for (const { file, id, objectUrl } of files) {
      const group = document.createElement('div')
      group.className = 'result-group'

      // Images get a thumbnail; PDFs get a generic icon
      const thumbHTML = objectUrl
        ? `<img class="result-group__img" src="${objectUrl}" alt="${file.name}" />`
        : `<div class="result-group__pdf">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
              <line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
            <span class="file-card__pdf-label">PDF</span>
          </div>`

      group.innerHTML = `
        <div class="result-group__side">${thumbHTML}</div>
        <div class="result-group__main">
          <div class="result-loading">Analyzing label…</div>
        </div>
      `
      resultArea.appendChild(group)
      containers[id] = group.querySelector('.result-group__main')
    }

    const totalFiles = files.length
    let b64DoneCount = 0

    // Process all files in parallel; Promise.allSettled ensures one failure doesn't block others
    await Promise.allSettled(files.map(async ({ file, id }) => {
      const container = containers[id]
      try {
        const base64 = await toBase64(file, { includeDataUrl: false })

        // Freeze b64 timer once every file has finished encoding
        b64DoneCount++
        if (b64DoneCount === totalFiles && !timing.b64Done) {
          timing.b64Done = Date.now()
        }

        const result = await checkLabel(base64, file.type)

        // Freeze Claude timer on the first response received
        if (!timing.firstClaudeDone) timing.firstClaudeDone = Date.now()

        container.querySelector('.result-loading')?.remove()
        renderResult(container, result)

        // Freeze display timer on the first result rendered
        if (!timing.firstDisplayDone) timing.firstDisplayDone = Date.now()

      } catch (err) {
        // On error, advance all unfrozen milestones so the timing bar doesn't hang
        b64DoneCount++
        if (b64DoneCount === totalFiles && !timing.b64Done)   timing.b64Done = Date.now()
        if (!timing.firstClaudeDone)  timing.firstClaudeDone  = Date.now()
        if (!timing.firstDisplayDone) timing.firstDisplayDone = Date.now()

        container.querySelector('.result-loading')?.remove()
        const errDiv = document.createElement('div')
        errDiv.className = 'result-card result-card--error'
        errDiv.innerHTML = `<p class="result-error-msg">Error: ${err.message}</p>`
        container.appendChild(errDiv)
      }
    }))

    timing.allDone = Date.now()
    updateTimingDisplay()

    checkBtn.disabled = false
    checkBtn.textContent = 'Check Labels'
  })
}
