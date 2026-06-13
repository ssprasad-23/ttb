import checkLabel from './utils/claudecheck.js'
import toBase64 from './utils/toBase64.js'

export function setupUploader(element) {
  element.innerHTML = `
    <div class="drop-zone" id="drop-zone">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <p class="drop-label">Drag &amp; drop an image here</p>
      <p class="drop-sub">or <label class="browse-link" for="file-input">browse to upload</label></p>
      <input type="file" id="file-input" accept="image/*" hidden />
    </div>
    <div class="preview-actions" id="action-bar" hidden>
      <button class="check-btn" id="check-btn">Check Label</button>
      <button class="remove-btn" id="remove-btn">Remove</button>
    </div>
    <div class="preview-container" id="preview-container" hidden>
      <img id="preview-img" src="" alt="Uploaded preview" hidden />
    </div>
    <div id="result-area"></div>
  `

  const dropZone = element.querySelector('#drop-zone')
  const fileInput = element.querySelector('#file-input')
  const previewContainer = element.querySelector('#preview-container')
  const previewImg = element.querySelector('#preview-img')
  const actionBar = element.querySelector('#action-bar')
  const removeBtn = element.querySelector('#remove-btn')
  const checkBtn = element.querySelector('#check-btn')
  const resultArea = element.querySelector('#result-area')

  let currentFile = null

  function showPreview(file) {
    if (!file || !file.type.startsWith('image/')) return
    currentFile = file
    const url = URL.createObjectURL(file)
    previewImg.hidden = true
    previewImg.onload = () => { previewImg.hidden = false }
    previewImg.src = url
    actionBar.hidden = false
    previewContainer.hidden = false
    resultArea.innerHTML = ''
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
    showPreview(e.dataTransfer.files[0])
  })

  fileInput.addEventListener('change', () => {
    showPreview(fileInput.files[0])
  })

  removeBtn.addEventListener('click', () => {
    URL.revokeObjectURL(previewImg.src)
    previewImg.src = ''
    previewImg.hidden = true
    fileInput.value = ''
    currentFile = null
    actionBar.hidden = true
    previewContainer.hidden = true
    resultArea.innerHTML = ''
  })

  checkBtn.addEventListener('click', async () => {
    if (!currentFile) return
    checkBtn.disabled = true
    checkBtn.textContent = 'Checking...'
    resultArea.innerHTML = '<div class="result-loading">Analyzing label…</div>'

    try {
      const base64 = await toBase64(currentFile, { includeDataUrl: false })
      const result = await checkLabel(base64, currentFile.type)
      renderResult(result)
    } catch (err) {
      resultArea.innerHTML = `<div class="result-card result-card--error"><p class="result-error-msg">Error: ${err.message}</p></div>`
    } finally {
      checkBtn.disabled = false
      checkBtn.textContent = 'Check Label'
    }
  })

  const FIELD_LABELS = {
    brand_name: 'Brand Name',
    abv: 'ABV',
    net_contents: 'Net Contents',
    class_type: 'Class / Type',
    bottler_address: 'Bottler Address',
    government_warning: 'Government Warning',
  }

  const FIELD_ORDER = ['brand_name', 'abv', 'net_contents', 'class_type', 'bottler_address', 'government_warning']

  function renderResult(data) {
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

    resultArea.innerHTML = `
      <div class="result-card result-card--${statusClass}">
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
      </div>
    `
  }
}
