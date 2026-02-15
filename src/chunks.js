import { marked } from 'marked'
import { CHUNK_TYPE_COLORS, highlightBoundingBox, filterBoundingBoxes } from './viewer.js'

let activeFilter = 'all'
let selectedChunkId = null
let chunksData = null
let groundingData = null
let chunkOrderMapData = null
let onChunkSelectedFromList = null

export function setChunkListSelectHandler(handler) {
  onChunkSelectedFromList = handler
}

export function renderChunkExplorer(chunks, grounding, chunkSummary, chunkOrderMap) {
  chunksData = chunks
  groundingData = grounding
  chunkOrderMapData = chunkOrderMap
  selectedChunkId = null

  renderFilters(chunkSummary, chunks)
  renderCompactList(chunks, grounding, chunkOrderMap)
  initChunkDetailTabs()
  hideChunkDetail()
}

export function selectChunk(chunkId) {
  selectedChunkId = chunkId

  // Highlight the list item
  document.querySelectorAll('.chunk-list-item').forEach((el) => {
    el.classList.toggle('chunk-list-item-selected', el.dataset.chunkId === chunkId)
  })

  // Scroll the selected item into view
  const selectedItem = document.querySelector(`.chunk-list-item[data-chunk-id="${CSS.escape(chunkId)}"]`)
  if (selectedItem) {
    selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  showChunkDetail(chunkId)
}

export function clearChunkExplorer() {
  document.getElementById('chunk-filters').innerHTML = ''
  document.getElementById('chunk-list').innerHTML =
    '<p class="panel-placeholder">Parse a document to see chunks</p>'
  hideChunkDetail()
  activeFilter = 'all'
  selectedChunkId = null
  chunksData = null
  groundingData = null
  chunkOrderMapData = null
}

// --- Filters ---

function renderFilters(chunkSummary, chunks) {
  const container = document.getElementById('chunk-filters')
  container.innerHTML = ''

  const total = chunks.length

  const allBtn = createFilterButton('all', `All (${total})`)
  allBtn.classList.add('filter-active')
  container.appendChild(allBtn)

  if (!chunkSummary) return

  for (const [type, count] of Object.entries(chunkSummary)) {
    const label = type.replace('chunk', '')
    const btn = createFilterButton(type, `${label} (${count})`)
    container.appendChild(btn)
  }
}

function createFilterButton(type, label) {
  const btn = document.createElement('button')
  btn.className = 'filter-btn'
  btn.textContent = label
  btn.dataset.filterType = type

  btn.addEventListener('click', () => {
    activeFilter = type
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('filter-active'))
    btn.classList.add('filter-active')
    applyFilter(type)
  })

  return btn
}

function applyFilter(type) {
  document.querySelectorAll('.chunk-list-item').forEach((item) => {
    if (type === 'all') {
      item.hidden = false
    } else {
      item.hidden = item.dataset.chunkType !== type
    }
  })

  filterBoundingBoxes(type === 'all' ? 'all' : type)

  // If selected chunk is now filtered out, deselect
  if (selectedChunkId) {
    const selectedItem = document.querySelector(`.chunk-list-item[data-chunk-id="${CSS.escape(selectedChunkId)}"]`)
    if (selectedItem && selectedItem.hidden) {
      selectedChunkId = null
      hideChunkDetail()
      document.querySelectorAll('.bbox-selected').forEach((el) => el.classList.remove('bbox-selected'))
    }
  }
}

// --- Compact list ---

function renderCompactList(chunks, grounding, chunkOrderMap) {
  const container = document.getElementById('chunk-list')
  container.innerHTML = ''

  if (!chunks || chunks.length === 0) {
    container.innerHTML = '<p class="panel-placeholder">No chunks found</p>'
    return
  }

  for (const chunk of chunks) {
    const item = createCompactListItem(chunk, grounding, chunkOrderMap)
    container.appendChild(item)
  }
}

function createCompactListItem(chunk, grounding, chunkOrderMap) {
  const item = document.createElement('div')
  item.className = 'chunk-list-item'
  item.dataset.chunkId = chunk.id
  // Store the grounding type key for filtering (e.g. "chunkText")
  const g = grounding?.[chunk.id]
  const typeKey = g?.type || ('chunk' + capitalize(chunk.type))
  item.dataset.chunkType = typeKey

  const order = chunkOrderMap?.[chunk.id] ?? '?'
  const colors = CHUNK_TYPE_COLORS[typeKey] || { bg: '#f1f5f9', border: '#94a3b8', label: chunk.type }
  const page = g?.page ?? 0

  // Order number
  const orderSpan = document.createElement('span')
  orderSpan.className = 'chunk-list-order'
  orderSpan.textContent = order
  orderSpan.style.backgroundColor = colors.border

  // Type badge
  const badge = document.createElement('span')
  badge.className = 'chunk-type-badge'
  badge.style.background = colors.bg
  badge.style.borderColor = colors.border
  badge.textContent = colors.label || chunk.type

  // Truncated ID
  const idSpan = document.createElement('span')
  idSpan.className = 'chunk-id'
  idSpan.textContent = chunk.id.length > 8 ? chunk.id.substring(0, 8) : chunk.id

  // Page number
  const pageSpan = document.createElement('span')
  pageSpan.className = 'chunk-page'
  pageSpan.textContent = `p.${page + 1}`

  item.appendChild(orderSpan)
  item.appendChild(badge)
  item.appendChild(idSpan)
  item.appendChild(pageSpan)

  item.addEventListener('click', () => {
    selectChunk(chunk.id)
    if (onChunkSelectedFromList) onChunkSelectedFromList(chunk.id)
  })

  return item
}

// --- Detail panel ---

function initChunkDetailTabs() {
  const buttons = document.querySelectorAll('.chunk-tab-btn')
  const panels = document.querySelectorAll('.chunk-tab-panel')

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'))
      panels.forEach((p) => (p.hidden = true))
      btn.classList.add('active')
      document.getElementById(`chunk-tab-${btn.dataset.chunkTab}`).hidden = false
    })
  })
}

function showChunkDetail(chunkId) {
  const detailPanel = document.getElementById('chunk-detail')
  detailPanel.hidden = false

  const chunk = chunksData?.find((c) => c.id === chunkId)
  if (!chunk) return

  const g = groundingData?.[chunkId]
  const order = chunkOrderMapData?.[chunkId] ?? '?'
  const typeKey = g?.type || ('chunk' + capitalize(chunk.type))
  const colors = CHUNK_TYPE_COLORS[typeKey] || { bg: '#f1f5f9', border: '#94a3b8', label: chunk.type }

  // Order tab
  const orderPanel = document.getElementById('chunk-tab-order')
  orderPanel.innerHTML = `
    <div class="detail-order-number" style="color: ${colors.border}">#${order}</div>
    <dl class="detail-meta">
      <dt>Chunk ID</dt><dd class="mono">${escapeHtml(chunkId)}</dd>
      <dt>Page</dt><dd>${g ? g.page + 1 : 'N/A'}</dd>
      ${g ? `<dt>Bounding Box</dt><dd class="mono">top: ${g.box.top.toFixed(3)}, left: ${g.box.left.toFixed(3)}, right: ${g.box.right.toFixed(3)}, bottom: ${g.box.bottom.toFixed(3)}</dd>` : ''}
    </dl>
  `

  // Markdown tab
  const mdPanel = document.getElementById('chunk-tab-markdown')
  mdPanel.innerHTML = `<div class="chunk-markdown-content">${marked.parse(chunk.markdown || '')}</div>`

  // Type tab
  const typePanel = document.getElementById('chunk-tab-type')
  typePanel.innerHTML = `
    <div class="detail-type-header">
      <span class="detail-type-swatch" style="background: ${colors.bg}; border-color: ${colors.border}"></span>
      <span class="detail-type-name">${escapeHtml(colors.label || chunk.type)}</span>
    </div>
    <p class="detail-type-key">API type: <code>${escapeHtml(typeKey)}</code></p>
  `
}

function hideChunkDetail() {
  const detailPanel = document.getElementById('chunk-detail')
  if (detailPanel) detailPanel.hidden = true
}

// --- Helpers ---

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
