/**
 * Timer.js
 * Timing bar component that tracks and displays four processing milestones
 * for a label check: Start, Base64 encoding, Claude API response, and Display result.
 *
 * Each timer counts elapsed milliseconds from a shared startTime and freezes
 * independently when its milestone is reached. A progress bar fills left-to-right
 * as milestones complete, and dots glow while active then turn green when done.
 *
 * Exports:
 *  - TIMER_HTML  : the markup to inject into the page
 *  - setupTimer() : wires up the DOM and returns control methods
 */

/**
 * The HTML markup for the timing bar.
 * Inject this into the page before calling setupTimer().
 */
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

/**
 * Wires up the timing bar DOM and returns a controller object.
 * Call this after TIMER_HTML has been injected into the page.
 *
 * @param {HTMLElement} element - The container element that holds TIMER_HTML
 * @returns {{
 *   reset: () => void,
 *   start: () => void,
 *   markB64Done: () => void,
 *   markClaudeDone: () => void,
 *   markDisplayDone: () => void,
 *   markAllDone: () => void
 * }}
 */
export function setupTimer(element) {
  const tStartEl   = element.querySelector('#t-start')
  const tB64El     = element.querySelector('#t-b64')
  const tClaudeEl  = element.querySelector('#t-claude')
  const tDisplayEl = element.querySelector('#t-display')
  const trackFill  = element.querySelector('#track-fill')
  const dots       = [0, 1, 2, 3].map(i => element.querySelector(`#dot-${i}`))

  // Shared timing state — all timestamps are absolute Date.now() values
  let timing = {
    startTime: null, b64Done: null,
    firstClaudeDone: null, firstDisplayDone: null,
    allDone: null, interval: null
  }

  function setDotState(index, state) {
    dots[index].className = `timing-dot${state ? ` timing-dot--${state}` : ''}`
  }

  // Runs every 50ms while active; each display value freezes once its milestone is set
  function updateDisplay() {
    const now = Date.now()
    const { startTime, b64Done, firstClaudeDone, firstDisplayDone, allDone } = timing
    if (!startTime) return

    tStartEl.textContent   = formatTime((allDone          ?? now) - startTime)
    tB64El.textContent     = formatTime((b64Done          ?? now) - startTime)
    tClaudeEl.textContent  = formatTime((firstClaudeDone  ?? now) - startTime)
    tDisplayEl.textContent = formatTime((firstDisplayDone ?? now) - startTime)

    // Active values pulse; frozen values are styled normally
    tStartEl.classList.toggle('timing-value--active',   !allDone)
    tB64El.classList.toggle('timing-value--active',     !b64Done)
    tClaudeEl.classList.toggle('timing-value--active',  !firstClaudeDone)
    tDisplayEl.classList.toggle('timing-value--active', !firstDisplayDone)

    // Dots: glowing while active, green once frozen
    setDotState(0, allDone          ? 'done' : 'active')
    setDotState(1, b64Done          ? 'done' : 'active')
    setDotState(2, firstClaudeDone  ? 'done' : 'active')
    setDotState(3, firstDisplayDone ? 'done' : 'active')

    // Progress fill: advances 33% per completed milestone (b64 → claude → display)
    const pct = firstDisplayDone ? 100 : firstClaudeDone ? 66 : b64Done ? 33 : 0
    trackFill.style.width = `${pct}%`

    if (allDone) clearInterval(timing.interval)
  }

  return {
    /** Clears all timing state and resets the UI to 00:000 */
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

    /** Records startTime and begins the 50ms display interval */
    start() {
      timing.startTime = Date.now()
      timing.interval = setInterval(updateDisplay, 50)
    },

    /** Freezes the Base64 encoding timer (call once all files are encoded) */
    markB64Done() {
      if (!timing.b64Done) timing.b64Done = Date.now()
    },

    /** Freezes the Claude response timer (call on first API response received) */
    markClaudeDone() {
      if (!timing.firstClaudeDone) timing.firstClaudeDone = Date.now()
    },

    /** Freezes the Display result timer (call once first result is rendered) */
    markDisplayDone() {
      if (!timing.firstDisplayDone) timing.firstDisplayDone = Date.now()
    },

    /** Freezes the Start timer and stops the interval (call when all results are rendered) */
    markAllDone() {
      timing.allDone = Date.now()
      updateDisplay()
    },
  }
}

/** Formats milliseconds as SS:mmm (e.g. 02:450) */
function formatTime(ms) {
  if (ms < 0) ms = 0
  const s = Math.floor(ms / 1000)
  const millis = ms % 1000
  return `${String(s).padStart(2, '0')}:${String(millis).padStart(3, '0')}`
}
