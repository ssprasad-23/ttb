import checkLabel from '../utils/claudeCheck.js'
import toBase64 from '../utils/toBase64.js'

const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff', 'application/pdf'
])

const FIELD_LABELS = {
  brand_name: 'Brand Name',
  abv: 'ABV',
  net_contents: 'Net Contents',
  class_type: 'Class / Type',
  bottler_address: 'Bottler Address',
  government_warning: 'Government Warning',
}

const FIELD_ORDER = ['brand_name', 'abv', 'net_contents', 'class_type', 'bottler_address', 'government_warning']

function formatTime(ms) {
  if (ms < 0) ms = 0
  const s = Math.floor(ms / 1000)
  const millis = ms % 1000
  return `${String(s).padStart(2, '0')}:${String(millis).padStart(3, '0')}`
}

export function setupUploader(element) {
  element.innerHTML = `
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
      <button class="check-btn" id="check-btn">Check Labels</button>
      <button class="remove-btn" id="remove-btn">Remove All</button>
    </div>
    <div id="result-area"></div>
  `

  const dropZone   = element.querySelector('#drop-zone')
  const fileInput  = element.querySelector('#file-input')
  const fileListEl = element.querySelector('#file-list')
  const actionBar  = element.querySelector('#action-bar')
  const removeBtn  = element.querySelector('#remove-btn')
  const checkBtn   = element.querySelector('#check-btn')
  const resultArea = element.querySelector('#result-area')

  const tStartEl   = element.querySelector('#t-start')
  const tB64El     = element.querySelector('#t-b64')
  const tClaudeEl  = element.querySelector('#t-claude')
  const tDisplayEl = element.querySelector('#t-display')
  const trackFill  = element.querySelector('#track-fill')
  const dots       = [0,1,2,3].map(i => element.querySelector(`#dot-${i}`))

  // --- Timing ---
  // All 4 timers start together; each freezes independently at its own milestone.
  // startTime  → b64Done (all b64 done)
  //           → firstClaudeDone (first API response)
  //           → firstDisplayDone (first result rendered)
  //           → allDone (all renders complete; Start freezes here)
  let timing = {
    startTime: null, b64Done: null,
    firstClaudeDone: null, firstDisplayDone: null,
    allDone: null, interval: null
  }

  function setDotState(index, state) {
    dots[index].className = `timing-dot${state ? ` timing-dot--${state}` : ''}`
  }

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

  function updateTimingDisplay() {
    const now = Date.now()
    const { startTime, b64Done, firstClaudeDone, firstDisplayDone, allDone } = timing
    if (!startTime) return

    // All timers count elapsed from the same startTime, each frozen at its milestone
    tStartEl.textContent   = formatTime((allDone           ?? now) - startTime)
    tB64El.textContent     = formatTime((b64Done           ?? now) - startTime)
    tClaudeEl.textContent  = formatTime((firstClaudeDone   ?? now) - startTime)
    tDisplayEl.textContent = formatTime((firstDisplayDone  ?? now) - startTime)

    // Highlight the still-running ones
    tStartEl.classList.toggle('timing-value--active',   !allDone)
    tB64El.classList.toggle('timing-value--active',     !b64Done)
    tClaudeEl.classList.toggle('timing-value--active',  !firstClaudeDone)
    tDisplayEl.classList.toggle('timing-value--active', !firstDisplayDone)

    // Dot glow → freeze green
    setDotState(0, allDone          ? 'done' : 'active')
    setDotState(1, b64Done          ? 'done' : 'active')
    setDotState(2, firstClaudeDone  ? 'done' : 'active')
    setDotState(3, firstDisplayDone ? 'done' : 'active')

    // Progress fill moves right as each non-Start milestone completes
    const pct = firstDisplayDone ? 100 : firstClaudeDone ? 66 : b64Done ? 33 : 0
    trackFill.style.width = `${pct}%`

    if (allDone) clearInterval(timing.interval)
  }

  // --- File management ---
  let files = []
  let nextId = 0

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

  function renderFileList() {
    fileListEl.innerHTML = ''
    for (const { file, id, objectUrl } of files) {
      const card = document.createElement('div')
      card.className = 'file-card'
      card.innerHTML = objectUrl ? `
        <img class="file-card__thumb" src="${objectUrl}" alt="${file.name}" />
        <button class="file-card__remove" aria-label="Remove" data-id="${id}">×</button>
        <p class="file-card__name" title="${file.name}">${file.name}</p>
      ` : `
        <div class="file-card__pdf-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
            <line x1="9" y1="11" x2="15" y2="11"/>
          </svg>
          <span class="file-card__pdf-label">PDF</span>
        </div>
        <button class="file-card__remove" aria-label="Remove" data-id="${id}">×</button>
        <p class="file-card__name" title="${file.name}">${file.name}</p>
      `
      fileListEl.appendChild(card)
    }
    fileListEl.querySelectorAll('.file-card__remove').forEach(btn => {
      btn.addEventListener('click', () => removeFile(Number(btn.dataset.id)))
    })
  }

  // --- Drop zone ---
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragging') })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragging'))
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragging'); addFiles(Array.from(e.dataTransfer.files)) })
  fileInput.addEventListener('change', () => { addFiles(Array.from(fileInput.files)); fileInput.value = '' })

  removeBtn.addEventListener('click', () => {
    files.forEach(({ objectUrl }) => { if (objectUrl) URL.revokeObjectURL(objectUrl) })
    files = []
    fileListEl.innerHTML = ''
    actionBar.hidden = true
    resultArea.innerHTML = ''
    resetTimers()
  })

  // --- Check ---
  checkBtn.addEventListener('click', async () => {
    if (files.length === 0) return
    checkBtn.disabled = true
    checkBtn.textContent = 'Checking...'

    resetTimers()
    timing.startTime = Date.now()
    timing.interval = setInterval(updateTimingDisplay, 50)

    resultArea.innerHTML = ''
    const containers = {}
    for (const { file, id } of files) {
      const group = document.createElement('div')
      group.className = 'result-group'
      group.innerHTML = `<div class="result-group__header">${file.name}</div><div class="result-loading">Analyzing label…</div>`
      resultArea.appendChild(group)
      containers[id] = group
    }

    const totalFiles = files.length
    let b64DoneCount = 0

    await Promise.allSettled(files.map(async ({ file, id }) => {
      const container = containers[id]
      try {
        const base64 = await toBase64(file, { includeDataUrl: false })

        b64DoneCount++
        if (b64DoneCount === totalFiles && !timing.b64Done) {
          timing.b64Done = Date.now()
        }

        const result = await checkLabel(base64, file.type)

        if (!timing.firstClaudeDone) timing.firstClaudeDone = Date.now()

        container.querySelector('.result-loading')?.remove()
        renderResult(container, result)

        if (!timing.firstDisplayDone) timing.firstDisplayDone = Date.now()

      } catch (err) {
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

  // --- Render ---
  function renderResult(container, data) {
    const passed = typeof data.result === 'string' && data.result.toUpperCase() === 'PASS'
    const statusClass = data.result ? (passed ? 'pass' : 'fail') : 'unknown'
    const statusLabel = data.result ? data.result.toUpperCase() : 'RESULT'
    const fields = data.fields || {}

    const rows = FIELD_ORDER.map(key => {
      const f = fields[key]
      if (!f) return ''
      const isPass = typeof f.status === 'string' && f.status.toUpperCase() === 'PASS'
      const chipClass = isPass ? 'pass' : 'fail'
      const chipLabel = isPass ? 'PASS' : 'FAIL'
      const label = FIELD_LABELS[key] || key
      const found = f.found ? `<span class="result-found">${f.found}</span>` : ''
      const reason = !isPass && f.reason ? `<div class="result-reason">${f.reason}</div>` : ''
      return `<tr>
        <td class="result-key">${label}</td>
        <td class="result-chip-cell"><span class="result-badge result-badge--${chipClass}">${chipLabel}</span></td>
        <td class="result-val">${found}${reason}</td>
      </tr>`
    }).join('')

    const card = document.createElement('div')
    card.className = `result-card result-card--${statusClass}`
    card.innerHTML = `
      <div class="result-card__header">
        <span class="result-badge result-badge--${statusClass}">${statusLabel}</span>
        <span class="result-title">TTB Label Check</span>
      </div>
      ${data.summary ? `<div class="result-summary">${data.summary}</div>` : ''}
      ${rows ? `
      <div class="result-card__details">
        <table class="result-table">
          <thead><tr><th>Field</th><th>Status</th><th>Details</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : ''}
    `
    container.appendChild(card)
  }
}
