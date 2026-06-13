function formatTime(ms) {
  if (ms < 0) ms = 0
  const s = Math.floor(ms / 1000)
  const millis = ms % 1000
  return `${String(s).padStart(2, '0')}:${String(millis).padStart(3, '0')}`
}

export const TIMER_HTML = `
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
  </div>`

export function setupTimer(element) {
  const tStartEl  = element.querySelector('#t-start')
  const tB64El    = element.querySelector('#t-b64')
  const tClaudeEl = element.querySelector('#t-claude')
  const tDisplayEl = element.querySelector('#t-display')
  const trackFill = element.querySelector('#track-fill')
  const dots      = [0, 1, 2, 3].map(i => element.querySelector(`#dot-${i}`))

  let timing = {
    startTime: null, b64Done: null,
    firstClaudeDone: null, firstDisplayDone: null,
    allDone: null, interval: null
  }

  function setDotState(index, state) {
    dots[index].className = `timing-dot${state ? ` timing-dot--${state}` : ''}`
  }

  function updateDisplay() {
    const now = Date.now()
    const { startTime, b64Done, firstClaudeDone, firstDisplayDone, allDone } = timing
    if (!startTime) return

    tStartEl.textContent   = formatTime((allDone          ?? now) - startTime)
    tB64El.textContent     = formatTime((b64Done          ?? now) - startTime)
    tClaudeEl.textContent  = formatTime((firstClaudeDone  ?? now) - startTime)
    tDisplayEl.textContent = formatTime((firstDisplayDone ?? now) - startTime)

    tStartEl.classList.toggle('timing-value--active',   !allDone)
    tB64El.classList.toggle('timing-value--active',     !b64Done)
    tClaudeEl.classList.toggle('timing-value--active',  !firstClaudeDone)
    tDisplayEl.classList.toggle('timing-value--active', !firstDisplayDone)

    setDotState(0, allDone          ? 'done' : 'active')
    setDotState(1, b64Done          ? 'done' : 'active')
    setDotState(2, firstClaudeDone  ? 'done' : 'active')
    setDotState(3, firstDisplayDone ? 'done' : 'active')

    const pct = firstDisplayDone ? 100 : firstClaudeDone ? 66 : b64Done ? 33 : 0
    trackFill.style.width = `${pct}%`

    if (allDone) clearInterval(timing.interval)
  }

  return {
    reset() {
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
    },

    start() {
      timing.startTime = Date.now()
      timing.interval = setInterval(updateDisplay, 50)
    },

    markB64Done() {
      if (!timing.b64Done) timing.b64Done = Date.now()
    },

    markClaudeDone() {
      if (!timing.firstClaudeDone) timing.firstClaudeDone = Date.now()
    },

    markDisplayDone() {
      if (!timing.firstDisplayDone) timing.firstDisplayDone = Date.now()
    },

    markAllDone() {
      timing.allDone = Date.now()
      updateDisplay()
    },
  }
}
