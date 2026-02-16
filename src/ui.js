import { highlightBoundingBox } from './viewer.js'
import { selectChunk } from './chunks.js'
import { getRenderer } from './renderers.js'
import { SCHEMA_PRESETS } from './schemas.js'

let el = {}

export function initUI({ onFileSelected }) {
  el = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    fileInfo: document.getElementById('file-info'),
    fileName: document.getElementById('file-name'),
    fileSize: document.getElementById('file-size'),
    clearFile: document.getElementById('clear-file'),
    parseBtn: document.getElementById('parse-btn'),
    spinner: document.getElementById('spinner'),
    resultsSection: document.getElementById('results-section'),
    errorDisplay: document.getElementById('error-display'),
    metadataStats: document.getElementById('metadata-stats'),
    extractionOutput: document.getElementById('extraction-output'),
    extractionRefsBody: document.getElementById('extraction-refs-body'),
    extractionDataBody: document.getElementById('extraction-data-body'),
    noExtractionMsg: document.getElementById('no-extraction-msg'),
    downloadBar: document.getElementById('download-bar'),
  }

  // Drop zone: click to browse
  el.dropZone.addEventListener('click', () => el.fileInput.click())

  // Drop zone: drag events
  el.dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault()
    el.dropZone.classList.add('dragover')
  })
  el.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault()
    el.dropZone.classList.add('dragover')
  })
  el.dropZone.addEventListener('dragleave', () => {
    el.dropZone.classList.remove('dragover')
  })
  el.dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    el.dropZone.classList.remove('dragover')
    const file = e.dataTransfer.files[0]
    if (file) onFileSelected(file)
  })

  // File input change
  el.fileInput.addEventListener('change', () => {
    const file = el.fileInput.files[0]
    if (file) onFileSelected(file)
  })

  // Clear file button
  el.clearFile.addEventListener('click', (e) => {
    e.stopPropagation()
    clearFileInfo()
    onFileSelected(null)
  })

  // Tab switching
  initTabs()
}

export function showFileInfo(file) {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
  const sizeKB = (file.size / 1024).toFixed(0)
  const sizeText = file.size >= 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`

  el.fileName.textContent = file.name
  el.fileSize.textContent = `(${sizeText})`
  el.fileInfo.hidden = false
  el.parseBtn.disabled = false
}

export function clearFileInfo() {
  el.fileInput.value = ''
  el.fileInfo.hidden = true
  el.fileName.textContent = ''
  el.fileSize.textContent = ''
  el.parseBtn.disabled = true
}

export function showLoading() {
  el.spinner.hidden = false
  el.parseBtn.disabled = true
}

export function hideLoading(hasFile) {
  el.spinner.hidden = true
  el.parseBtn.disabled = !hasFile
}

export function showError(message, detail = null) {
  let html = escapeHtml(message)
  if (detail) {
    html += `<div class="error-detail">${escapeHtml(String(detail))}</div>`
  }
  el.errorDisplay.innerHTML = html
  el.errorDisplay.hidden = false
  el.resultsSection.hidden = false
}

export function renderResults(data, presetId, fileName) {
  clearResults()

  if (data.error || !data.success) {
    showError(data.error || 'The request failed.')
    return
  }

  el.resultsSection.hidden = false

  if (data.parsing) {
    renderMetadata(data.parsing)
  }

  if (data.extraction) {
    renderExtraction(data.extraction, data.parsing?.grounding, presetId)
    el.noExtractionMsg.hidden = true
  } else {
    el.noExtractionMsg.hidden = false
    el.extractionOutput.hidden = true
  }

  renderDownloads(fileName, data.parsing?.markdown, data.extraction?.fields)
}

export function clearResults() {
  el.errorDisplay.hidden = true
  el.errorDisplay.innerHTML = ''
  el.metadataStats.hidden = true
  el.metadataStats.innerHTML = ''
  el.extractionOutput.hidden = true
  if (el.extractionRefsBody) el.extractionRefsBody.innerHTML = ''
  if (el.extractionDataBody) el.extractionDataBody.innerHTML = ''
  el.resultsSection.hidden = true
  if (el.noExtractionMsg) el.noExtractionMsg.hidden = false
  if (el.downloadBar) {
    el.downloadBar.innerHTML = ''
    el.downloadBar.hidden = true
  }
}

function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn')
  const panels = document.querySelectorAll('.tab-panel')

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'))
      panels.forEach((p) => (p.hidden = true))
      btn.classList.add('active')
      document.getElementById(`tab-${btn.dataset.tab}`).hidden = false
    })
  })
}

function renderMetadata(parsing) {
  const stats = []

  if (parsing.duration_ms != null) {
    stats.push({ label: 'Duration', value: `${(parsing.duration_ms / 1000).toFixed(2)}s` })
  }
  if (parsing.total_pages != null) {
    stats.push({ label: 'Pages', value: parsing.total_pages })
  }
  if (parsing.total_chunks != null) {
    stats.push({ label: 'Chunks', value: parsing.total_chunks })
  }
  if (parsing.chunk_summary) {
    const summary = Object.entries(parsing.chunk_summary)
      .map(([type, count]) => `${count} ${type.replace('chunk', '')}`)
      .join(', ')
    stats.push({ label: 'Breakdown', value: summary })
  }

  el.metadataStats.innerHTML = stats
    .map(
      (s) =>
        `<span class="stat-badge"><strong>${escapeHtml(String(s.value))}</strong> ${escapeHtml(s.label)}</span>`
    )
    .join('')
  el.metadataStats.hidden = false
}

function renderDownloads(fileName, markdown, extractionFields) {
  const baseName = (fileName || 'document').replace(/\.[^/.]+$/, '')
  let html = ''

  if (markdown) {
    html += `<button class="download-btn" id="dl-markdown">Download Markdown</button>`
  }
  if (extractionFields) {
    html += `<button class="download-btn" id="dl-json">Download Extraction JSON</button>`
  }

  if (!html) return

  el.downloadBar.innerHTML = html
  el.downloadBar.hidden = false

  const dlMd = document.getElementById('dl-markdown')
  if (dlMd) {
    dlMd.addEventListener('click', () =>
      downloadFile(markdown, `${baseName}.md`, 'text/markdown')
    )
  }

  const dlJson = document.getElementById('dl-json')
  if (dlJson) {
    dlJson.addEventListener('click', () =>
      downloadFile(JSON.stringify(extractionFields, null, 2), `${baseName}_extraction.json`, 'application/json')
    )
  }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function renderExtraction(extraction, grounding, presetId) {
  if (!extraction.fields) return

  const flat = flattenFields(extraction.fields)
  const metadata = extraction.metadata || {}

  // Main panel: rich renderer or generic table
  const preset = SCHEMA_PRESETS.find((p) => p.id === presetId)
  const rendererFn = preset?.renderer ? getRenderer(preset.renderer) : null

  if (rendererFn) {
    el.extractionDataBody.innerHTML = rendererFn(extraction.fields, metadata, grounding)
  } else {
    el.extractionDataBody.innerHTML = renderGenericTable(flat)
  }

  // Collapsible source references below
  let refsHtml = ''
  if (!rendererFn) {
    refsHtml += renderRefsPanel(flat, metadata, grounding)
  }
  refsHtml += renderRawOutput(extraction.fields)
  el.extractionRefsBody.innerHTML = refsHtml
  el.extractionRefsBody.hidden = false

  el.extractionOutput.hidden = false
  if (!rendererFn) {
    attachRefLinkHandlers(el.extractionRefsBody)
  }
  initRefsToggle()
}

function renderRefsPanel(flat, metadata, grounding) {
  return Object.entries(flat)
    .map(([key, value]) => {
      const refs = metadata[key]?.references || []
      const refsHtml =
        refs
          .map((refId) => {
            const g = grounding?.[refId]
            const typeLabel = g ? g.type.replace('chunk', '').replace('table', 'tbl') : ''
            const shortId = refId.length > 8 ? refId.substring(0, 8) : refId
            const title = g ? `Page ${(g.page ?? 0) + 1}, ${g.type}` : refId
            return `<a href="#" class="ref-link" data-chunk-id="${escapeHtml(refId)}" title="${escapeHtml(title)}">${escapeHtml(shortId)}${typeLabel ? ` (${escapeHtml(typeLabel)})` : ''}</a>`
          })
          .join(' ') || '<span class="no-refs">&mdash;</span>'

      return `<div class="ref-row">
        <span class="ref-field">${escapeHtml(key)}</span>
        <span class="ref-value">${escapeHtml(formatValue(value))}</span>
        <div class="ref-chips">${refsHtml}</div>
      </div>`
    })
    .join('')
}

function renderRawOutput(fields) {
  return `<pre class="raw-output">${escapeHtml(toPythonDict(fields))}</pre>`
}

function toPythonDict(obj, indent = 0) {
  if (obj === null || obj === undefined) return 'None'
  if (typeof obj === 'boolean') return obj ? 'True' : 'False'
  if (typeof obj === 'number') return String(obj)
  if (typeof obj === 'string') return `'${obj.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    const items = obj.map((v) => `${pad(indent + 2)}${toPythonDict(v, indent + 2)}`)
    return `[\n${items.join(',\n')}\n${pad(indent)}]`
  }
  const entries = Object.entries(obj)
  if (entries.length === 0) return '{}'
  const rows = entries.map(
    ([k, v]) => `${pad(indent + 2)}'${k}': ${toPythonDict(v, indent + 2)}`
  )
  return `{\n${rows.join(',\n')}\n${pad(indent)}}`
}

function pad(n) {
  return ' '.repeat(n)
}

function initRefsToggle() {
  const toggle = document.getElementById('extraction-refs-toggle')
  if (!toggle) return

  // Remove old listeners by cloning
  const fresh = toggle.cloneNode(true)
  toggle.replaceWith(fresh)

  // Set initial arrow to expanded state
  const arrow = fresh.querySelector('.toggle-arrow')
  if (arrow) arrow.textContent = '\u25BC'

  fresh.addEventListener('click', () => {
    const body = el.extractionRefsBody
    body.hidden = !body.hidden
    if (arrow) arrow.textContent = body.hidden ? '\u25B6' : '\u25BC'
  })
}

function renderGenericTable(flat) {
  const rows = Object.entries(flat)
    .map(
      ([key, value]) => `<tr>
        <td>${escapeHtml(key)}</td>
        <td>${escapeHtml(formatValue(value))}</td>
      </tr>`
    )
    .join('')

  return `<table class="generic-fields-table">
    <thead><tr><th>Field</th><th>Value</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function attachRefLinkHandlers(container) {
  container.querySelectorAll('.ref-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const chunkId = link.dataset.chunkId
      highlightBoundingBox(chunkId)
      selectChunk(chunkId)
      // Switch to Chunks tab
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'))
      document.querySelectorAll('.tab-panel').forEach((p) => (p.hidden = true))
      const chunksBtn = document.querySelector('.tab-btn[data-tab="chunks"]')
      if (chunksBtn) chunksBtn.classList.add('active')
      const chunksPanel = document.getElementById('tab-chunks')
      if (chunksPanel) chunksPanel.hidden = false
    })
  })
}

function flattenFields(fields, prefix = '') {
  const result = {}
  for (const [key, value] of Object.entries(fields)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenFields(value, fullKey))
    } else {
      result[fullKey] = value
    }
  }
  return result
}

function formatValue(value) {
  if (value === null || value === undefined) return '\u2014'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
