import { marked } from 'marked'
import { highlightBoundingBox, filterBoundingBoxes } from './viewer.js'

const CHUNK_TYPE_COLORS = {
  logo:        { bg: 'rgba(134, 239, 172, 0.3)', border: '#22c55e' },
  text:        { bg: 'rgba(74, 222, 128, 0.2)',  border: '#16a34a' },
  table:       { bg: 'rgba(96, 165, 250, 0.25)', border: '#3b82f6' },
  figure:      { bg: 'rgba(251, 191, 36, 0.25)', border: '#f59e0b' },
  marginalia:  { bg: 'rgba(192, 132, 252, 0.25)', border: '#a855f7' },
  attestation: { bg: 'rgba(248, 113, 113, 0.25)', border: '#ef4444' },
  scanCode:    { bg: 'rgba(156, 163, 175, 0.25)', border: '#6b7280' },
  form:        { bg: 'rgba(251, 146, 60, 0.25)',  border: '#ea580c' },
  card:        { bg: 'rgba(45, 212, 191, 0.25)',  border: '#14b8a6' },
}

let activeFilter = 'all'

export function renderChunkExplorer(chunks, grounding, chunkSummary) {
  renderFilters(chunkSummary, chunks)
  renderChunkList(chunks, grounding)
}

export function scrollToChunk(chunkId) {
  const card = document.querySelector(`.chunk-card[data-chunk-id="${CSS.escape(chunkId)}"]`)
  if (!card) return

  // Expand it
  const content = card.querySelector('.chunk-card-content')
  if (content.hidden) {
    content.hidden = false
    card.classList.add('chunk-card-highlight')
  }

  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  // Briefly highlight
  card.classList.add('chunk-card-highlight')
  setTimeout(() => card.classList.remove('chunk-card-highlight'), 1500)
}

export function clearChunkExplorer() {
  document.getElementById('chunk-filters').innerHTML = ''
  document.getElementById('chunk-list').innerHTML =
    '<p class="panel-placeholder">Parse a document to see chunks</p>'
  activeFilter = 'all'
}

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
  // Filter chunk cards
  document.querySelectorAll('.chunk-card').forEach((card) => {
    if (type === 'all') {
      card.hidden = false
    } else {
      // chunk_summary keys are like "chunkText", chunk type on cards is bare "text"
      const bareType = type.replace('chunk', '').toLowerCase()
      card.hidden = card.dataset.chunkType.toLowerCase() !== bareType
    }
  })

  // Filter bounding boxes in viewer
  filterBoundingBoxes(type === 'all' ? 'all' : type)
}

function renderChunkList(chunks, grounding) {
  const container = document.getElementById('chunk-list')
  container.innerHTML = ''

  if (!chunks || chunks.length === 0) {
    container.innerHTML = '<p class="panel-placeholder">No chunks found</p>'
    return
  }

  for (const chunk of chunks) {
    const card = createChunkCard(chunk, grounding)
    container.appendChild(card)
  }
}

function createChunkCard(chunk, grounding) {
  const card = document.createElement('div')
  card.className = 'chunk-card'
  card.dataset.chunkId = chunk.id
  card.dataset.chunkType = chunk.type

  const g = grounding?.[chunk.id] || chunk.grounding
  const colors = CHUNK_TYPE_COLORS[chunk.type] || { bg: '#f1f5f9', border: '#94a3b8' }
  const page = g?.page ?? 0

  // Header
  const header = document.createElement('div')
  header.className = 'chunk-card-header'

  const badge = document.createElement('span')
  badge.className = 'chunk-type-badge'
  badge.style.background = colors.bg
  badge.style.borderColor = colors.border
  badge.textContent = chunk.type

  const idSpan = document.createElement('span')
  idSpan.className = 'chunk-id'
  idSpan.textContent = chunk.id.length > 8 ? chunk.id.substring(0, 8) + '...' : chunk.id

  const pageSpan = document.createElement('span')
  pageSpan.className = 'chunk-page'
  pageSpan.textContent = `p.${page + 1}`

  header.appendChild(badge)
  header.appendChild(idSpan)
  header.appendChild(pageSpan)

  // Content (collapsed by default)
  const content = document.createElement('div')
  content.className = 'chunk-card-content'
  content.hidden = true
  // Render markdown (content is from the ADE parser, not raw user input)
  content.innerHTML = marked.parse(chunk.markdown || '')

  // Toggle content and highlight bbox on header click
  header.addEventListener('click', () => {
    content.hidden = !content.hidden
    highlightBoundingBox(chunk.id)
  })

  card.appendChild(header)
  card.appendChild(content)
  return card
}
