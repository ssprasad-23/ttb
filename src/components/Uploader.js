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
    <div class="preview-container" id="preview-container" hidden>
      <img id="preview-img" src="" alt="Uploaded preview" />
      <button class="remove-btn" id="remove-btn">Remove</button>
    </div>
  `

  const dropZone = element.querySelector('#drop-zone')
  const fileInput = element.querySelector('#file-input')
  const previewContainer = element.querySelector('#preview-container')
  const previewImg = element.querySelector('#preview-img')
  const removeBtn = element.querySelector('#remove-btn')

  function showPreview(file) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    previewImg.src = url
    dropZone.hidden = true
    previewContainer.hidden = false
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
    const file = e.dataTransfer.files[0]
    showPreview(file)
  })

  fileInput.addEventListener('change', () => {
    showPreview(fileInput.files[0])
  })

  removeBtn.addEventListener('click', () => {
    URL.revokeObjectURL(previewImg.src)
    previewImg.src = ''
    fileInput.value = ''
    previewContainer.hidden = true
    dropZone.hidden = false
  })
}