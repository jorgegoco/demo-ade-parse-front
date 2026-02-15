const RENDERERS = {}

export function getRenderer(name) {
  return RENDERERS[name] || null
}

// --- SDGE Electric Bill Renderer ---

RENDERERS.sdge_bill = function (fields) {
  const acct = fields.account_summary || {}
  const gas = fields.gas_summary || {}
  const elec = fields.electric_summary || {}

  return `
    <div class="sdge-bill">
      <div class="sdge-header">
        <span class="sdge-logo">SDGE</span>
        <span class="sdge-title">Electric Bill Summary</span>
      </div>

      <div class="sdge-section">
        <h5 class="sdge-section-title">Account Summary</h5>
        <div class="sdge-row">
          <span class="sdge-label">Current Charges</span>
          <span class="sdge-value sdge-currency">${fmtCurrency(acct.current_charges)}</span>
        </div>
        <div class="sdge-row sdge-row-total">
          <span class="sdge-label">Total Amount Due</span>
          <span class="sdge-value sdge-currency">${fmtCurrency(acct.total_amount_due)}</span>
        </div>
      </div>

      <div class="sdge-section">
        <h5 class="sdge-section-title">Gas Summary</h5>
        <div class="sdge-row">
          <span class="sdge-label">Total Therms Used</span>
          <span class="sdge-value">${fmtNum(gas.total_therms_used)} therms</span>
        </div>
        <div class="sdge-row">
          <span class="sdge-label">Gas Charges</span>
          <span class="sdge-value sdge-currency">${fmtCurrency(gas.gas_current_charges)}</span>
        </div>
        <div class="sdge-row">
          <span class="sdge-label">Usage Chart Present</span>
          <span class="sdge-value">${fmtBool(gas.gas_usage_chart)}</span>
        </div>
        <div class="sdge-row">
          <span class="sdge-label">Peak Usage Month</span>
          <span class="sdge-value">${esc(gas.gas_max_month)}</span>
        </div>
      </div>

      <div class="sdge-section">
        <h5 class="sdge-section-title">Electric Summary</h5>
        <div class="sdge-row">
          <span class="sdge-label">Total kWh Used</span>
          <span class="sdge-value">${fmtNum(elec.total_kwh_used)} kWh</span>
        </div>
        <div class="sdge-row">
          <span class="sdge-label">Electric Charges</span>
          <span class="sdge-value sdge-currency">${fmtCurrency(elec.electric_current_charges)}</span>
        </div>
        <div class="sdge-row">
          <span class="sdge-label">Usage Chart Present</span>
          <span class="sdge-value">${fmtBool(elec.electric_usage_chart)}</span>
        </div>
        <div class="sdge-row">
          <span class="sdge-label">Peak Usage Month</span>
          <span class="sdge-value">${esc(elec.electric_max_month)}</span>
        </div>
      </div>
    </div>
  `
}

// --- Helpers ---

function fmtCurrency(value) {
  if (value == null) return '<span class="sdge-na">&mdash;</span>'
  return (
    '$' +
    Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

function fmtNum(value) {
  if (value == null) return '<span class="sdge-na">&mdash;</span>'
  return Number(value).toLocaleString('en-US')
}

function fmtBool(value) {
  if (value === true) return '<span class="sdge-bool-yes">Yes</span>'
  if (value === false) return '<span class="sdge-bool-no">No</span>'
  return '<span class="sdge-na">&mdash;</span>'
}

function esc(str) {
  if (str == null) return '<span class="sdge-na">&mdash;</span>'
  const div = document.createElement('div')
  div.textContent = String(str)
  return div.innerHTML
}
