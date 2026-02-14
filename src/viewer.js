const CHUNK_TYPE_COLORS = {
  chunkLogo:        { bg: 'rgba(134, 239, 172, 0.3)', border: '#22c55e', label: 'Logo' },
  chunkText:        { bg: 'rgba(74, 222, 128, 0.2)',  border: '#16a34a', label: 'Text' },
  chunkTable:       { bg: 'rgba(96, 165, 250, 0.25)', border: '#3b82f6', label: 'Table' },
  chunkFigure:      { bg: 'rgba(251, 191, 36, 0.25)', border: '#f59e0b', label: 'Figure' },
  chunkMarginalia:  { bg: 'rgba(192, 132, 252, 0.25)', border: '#a855f7', label: 'Marginalia' },
  chunkAttestation: { bg: 'rgba(248, 113, 113, 0.25)', border: '#ef4444', label: 'Attestation' },
  chunkScanCode:    { bg: 'rgba(156, 163, 175, 0.25)', border: '#6b7280', label: 'Scan Code' },
  chunkForm:        { bg: 'rgba(251, 146, 60, 0.25)',  border: '#ea580c', label: 'Form' },
  chunkCard:        { bg: 'rgba(45, 212, 191, 0.25)',  border: '#14b8a6', label: 'Card' },
}

let onChunkSelect = null

export function setChunkSelectHandler(handler) {
  onChunkSelect = handler
}

export function renderDocumentViewer(pageImages, grounding) {
  const container = document.getElementById('viewer-container')
  container.innerHTML = ''

  if (!pageImages || pageImages.length === 0) {
    container.innerHTML = '<p class="viewer-placeholder">No visual preview available for this file type</p>'
    return
  }

  for (const pageData of pageImages) {
    const wrapper = createPageElement(pageData, grounding, pageImages.length > 1)
    container.appendChild(wrapper)
  }

  renderLegend(grounding)
}

export function highlightBoundingBox(chunkId) {
  document.querySelectorAll('.bbox-selected').forEach((el) => el.classList.remove('bbox-selected'))

  const box = document.querySelector(`.bbox[data-chunk-id="${CSS.escape(chunkId)}"]`)
  if (box) {
    box.classList.add('bbox-selected')
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
}

export function filterBoundingBoxes(chunkType) {
  document.querySelectorAll('.bbox').forEach((box) => {
    if (chunkType === 'all') {
      box.classList.remove('bbox-filtered-out')
    } else {
      const matches = box.dataset.chunkType === chunkType
      box.classList.toggle('bbox-filtered-out', !matches)
    }
  })
}

export function clearViewer() {
  const container = document.getElementById('viewer-container')
  container.innerHTML = '<p class="viewer-placeholder">No visual preview available</p>'
  document.getElementById('viewer-legend').innerHTML = ''
}

function createPageElement(pageData, grounding, showLabel) {
  const wrapper = document.createElement('div')
  wrapper.className = 'page-wrapper'

  if (showLabel) {
    const label = document.createElement('div')
    label.className = 'page-label'
    label.textContent = `Page ${pageData.page + 1}`
    wrapper.appendChild(label)
  }

  const mime = pageData.mime_type || 'image/png'
  const img = document.createElement('img')
  img.src = `data:${mime};base64,${pageData.image_base64}`
  img.className = 'page-image'
  img.draggable = false
  img.alt = `Document page ${pageData.page + 1}`

  const overlay = document.createElement('div')
  overlay.className = 'page-overlay'

  if (grounding) {
    for (const [id, g] of Object.entries(grounding)) {
      if (g.page !== pageData.page) continue
      // Only show chunk-level boxes, skip table/tableCell sub-elements
      if (!g.type.startsWith('chunk')) continue

      const box = createBoundingBox(id, g)
      overlay.appendChild(box)
    }
  }

  wrapper.appendChild(img)
  wrapper.appendChild(overlay)
  return wrapper
}

function createBoundingBox(id, grounding) {
  const { box, type } = grounding
  const colors = CHUNK_TYPE_COLORS[type] || { bg: 'rgba(0,0,0,0.1)', border: '#666', label: type }

  const div = document.createElement('div')
  div.className = 'bbox'
  div.dataset.chunkId = id
  div.dataset.chunkType = type

  div.style.top = `${box.top * 100}%`
  div.style.left = `${box.left * 100}%`
  div.style.width = `${(box.right - box.left) * 100}%`
  div.style.height = `${(box.bottom - box.top) * 100}%`
  div.style.backgroundColor = colors.bg
  div.style.borderColor = colors.border

  const tooltip = document.createElement('span')
  tooltip.className = 'bbox-tooltip'
  tooltip.textContent = `${colors.label} — ${id.substring(0, 8)}`
  div.appendChild(tooltip)

  div.addEventListener('click', () => {
    if (onChunkSelect) onChunkSelect(id)
  })

  return div
}

function renderLegend(grounding) {
  const legendEl = document.getElementById('viewer-legend')
  legendEl.innerHTML = ''

  if (!grounding) return

  // Collect types actually present
  const typesPresent = new Set()
  for (const g of Object.values(grounding)) {
    if (g.type.startsWith('chunk')) typesPresent.add(g.type)
  }

  for (const type of typesPresent) {
    const colors = CHUNK_TYPE_COLORS[type]
    if (!colors) continue

    const item = document.createElement('span')
    item.className = 'legend-item'

    const swatch = document.createElement('span')
    swatch.className = 'legend-swatch'
    swatch.style.backgroundColor = colors.bg
    swatch.style.borderColor = colors.border

    item.appendChild(swatch)
    item.appendChild(document.createTextNode(colors.label))
    legendEl.appendChild(item)
  }
}
