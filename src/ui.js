import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

let el = {}

export function initUI({ onFileSelected }) {
  el = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    fileInfo: document.getElementById('file-info'),
    fileName: document.getElementById('file-name'),
    fileSize: document.getElementById('file-size'),
    clearFile: document.getElementById('clear-file'),
    schemaInput: document.getElementById('schema-input'),
    parseBtn: document.getElementById('parse-btn'),
    spinner: document.getElementById('spinner'),
    resultsSection: document.getElementById('results-section'),
    errorDisplay: document.getElementById('error-display'),
    metadataStats: document.getElementById('metadata-stats'),
    markdownOutput: document.getElementById('markdown-output'),
    markdownRender: document.getElementById('markdown-render'),
    extractionOutput: document.getElementById('extraction-output'),
    fieldsTableBody: document.querySelector('#fields-table tbody'),
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

export function renderResults(data) {
  clearResults()

  if (data.error || !data.success) {
    showError(data.error || 'The request failed.')
    return
  }

  el.resultsSection.hidden = false

  if (data.parsing) {
    renderMetadata(data.parsing)
    // Markdown content rendered as HTML (content from server-side parser, not raw user input)
    el.markdownRender.innerHTML = marked.parse(data.parsing.markdown || '')
    el.markdownOutput.hidden = false
  }

  if (data.extraction) {
    renderExtraction(data.extraction)
  }
}

export function clearResults() {
  el.errorDisplay.hidden = true
  el.errorDisplay.innerHTML = ''
  el.metadataStats.hidden = true
  el.metadataStats.innerHTML = ''
  el.markdownOutput.hidden = true
  el.markdownRender.innerHTML = ''
  el.extractionOutput.hidden = true
  el.fieldsTableBody.innerHTML = ''
  el.resultsSection.hidden = true
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
    .map((s) => `<span class="stat-badge"><strong>${escapeHtml(String(s.value))}</strong> ${escapeHtml(s.label)}</span>`)
    .join('')
  el.metadataStats.hidden = false
}

function renderExtraction(extraction) {
  if (!extraction.fields) return

  const rows = Object.entries(extraction.fields).map(([key, value]) => {
    const refs = extraction.metadata?.[key]?.references || []
    const refsText = refs.join(', ')
    return `<tr>
      <td>${escapeHtml(key)}</td>
      <td>${escapeHtml(formatValue(value))}</td>
      <td>${escapeHtml(refsText)}</td>
    </tr>`
  })

  el.fieldsTableBody.innerHTML = rows.join('')
  el.extractionOutput.hidden = false
}

function formatValue(value) {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
