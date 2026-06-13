import checkLabel from '../utils/claudecheck.js'
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

export function setupUploader(element) {
  element.innerHTML = `
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

  const dropZone = element.querySelector('#drop-zone')
  const fileInput = element.querySelector('#file-input')
  const fileListEl = element.querySelector('#file-list')
  const actionBar = element.querySelector('#action-bar')
  const removeBtn = element.querySelector('#remove-btn')
  const checkBtn = element.querySelector('#check-btn')
  const resultArea = element.querySelector('#result-area')

  let files = []
  let nextId = 0

  function addFiles(incoming) {
    for (const file of incoming) {
      if (!ACCEPTED_TYPES.has(file.type)) continue
      const id = nextId++
      const objectUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      files.push({ file, id, objectUrl })
    }
    renderFileList()
    actionBar.hidden = files.length === 0
    resultArea.innerHTML = ''
  }

  function removeFile(id) {
    const idx = files.findIndex(f => f.id === id)
    if (idx === -1) return
    const entry = files[idx]
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
    files.splice(idx, 1)
    renderFileList()
    actionBar.hidden = files.length === 0
    if (files.length === 0) resultArea.innerHTML = ''
  }

  function renderFileList() {
    fileListEl.innerHTML = ''
    for (const { file, id, objectUrl } of files) {
      const card = document.createElement('div')
      card.className = 'file-card'

      if (objectUrl) {
        card.innerHTML = `
          <img class="file-card__thumb" src="${objectUrl}" alt="${file.name}" />
          <button class="file-card__remove" aria-label="Remove" data-id="${id}">×</button>
          <p class="file-card__name" title="${file.name}">${file.name}</p>
        `
      } else {
        card.innerHTML = `
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
      }

      fileListEl.appendChild(card)
    }

    fileListEl.querySelectorAll('.file-card__remove').forEach(btn => {
      btn.addEventListener('click', () => removeFile(Number(btn.dataset.id)))
    })
  }

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    dropZone.classList.add('dragging')
  })

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragging')
  })

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('dragging')
    addFiles(Array.from(e.dataTransfer.files))
  })

  fileInput.addEventListener('change', () => {
    addFiles(Array.from(fileInput.files))
    fileInput.value = ''
  })

  removeBtn.addEventListener('click', () => {
    for (const { objectUrl } of files) {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
    files = []
    fileListEl.innerHTML = ''
    actionBar.hidden = true
    resultArea.innerHTML = ''
  })

  checkBtn.addEventListener('click', async () => {
    if (files.length === 0) return
    checkBtn.disabled = true
    checkBtn.textContent = 'Checking...'

    resultArea.innerHTML = ''
    const containers = {}
    for (const { file, id } of files) {
      const group = document.createElement('div')
      group.className = 'result-group'
      group.innerHTML = `
        <div class="result-group__header">${file.name}</div>
        <div class="result-loading">Analyzing label…</div>
      `
      resultArea.appendChild(group)
      containers[id] = group
    }

    await Promise.allSettled(files.map(async ({ file, id }) => {
      const container = containers[id]
      try {
        const base64 = await toBase64(file, { includeDataUrl: false })
        const result = await checkLabel(base64, file.type)
        container.querySelector('.result-loading')?.remove()
        renderResult(container, result)
      } catch (err) {
        container.querySelector('.result-loading')?.remove()
        const errDiv = document.createElement('div')
        errDiv.className = 'result-card result-card--error'
        errDiv.innerHTML = `<p class="result-error-msg">Error: ${err.message}</p>`
        container.appendChild(errDiv)
      }
    }))

    checkBtn.disabled = false
    checkBtn.textContent = 'Check Labels'
  })

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
