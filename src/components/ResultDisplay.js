const FIELD_LABELS = {
  brand_name: 'Brand Name',
  abv: 'ABV',
  net_contents: 'Net Contents',
  class_type: 'Class / Type',
  bottler_address: 'Bottler Address',
  government_warning: 'Government Warning',
}

const FIELD_ORDER = ['brand_name', 'abv', 'net_contents', 'class_type', 'bottler_address', 'government_warning']

export function renderResult(container, data) {
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
