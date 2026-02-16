import './style.css'
import { initUI, showFileInfo, clearFileInfo, showLoading, hideLoading, showError, renderResults, clearResults } from './ui.js'
import { parseDocument } from './api.js'
import { validateFile, validateSchema } from './validation.js'
import { initSchemaSelector, getSelectedSchema, getSelectedPresetId } from './schemas.js'
import { renderDocumentViewer, setChunkSelectHandler, highlightBoundingBox, clearViewer } from './viewer.js'
import { renderChunkExplorer, selectChunk, clearChunkExplorer, setChunkListSelectHandler } from './chunks.js'

let selectedFile = null

function handleFileSelect(file) {
  if (!file) {
    selectedFile = null
    clearFileInfo()
    return
  }

  const result = validateFile(file)
  if (!result.valid) {
    selectedFile = null
    clearFileInfo()
    clearResults()
    clearViewer()
    clearChunkExplorer()
    showError(result.error)
    return
  }

  selectedFile = file
  showFileInfo(file)
  clearResults()
  clearViewer()
  clearChunkExplorer()
}

async function handleParse() {
  if (!selectedFile) return

  const schemaInput = getSelectedSchema()
  const presetId = getSelectedPresetId()
  if (schemaInput) {
    const schemaResult = validateSchema(schemaInput)
    if (!schemaResult.valid) {
      showError(schemaResult.error)
      return
    }
  }

  showLoading()
  clearResults()
  clearViewer()
  clearChunkExplorer()

  try {
    const result = await parseDocument(selectedFile, schemaInput || null)
    console.log('[DEBUG] extraction fields:', result?.extraction?.fields)
    renderResults(result, presetId)

    // Build chunk order map (chunk ID -> 1-based index)
    const chunkOrderMap = {}
    if (result.parsing?.chunks) {
      result.parsing.chunks.forEach((chunk, i) => {
        chunkOrderMap[chunk.id] = i + 1
      })
    }

    // Render bounding box viewer if page images are available
    if (result.parsing?.page_images?.length) {
      renderDocumentViewer(result.parsing.page_images, result.parsing.grounding, chunkOrderMap)
    }

    // Render chunk explorer if chunks are available
    if (result.parsing?.chunks?.length) {
      renderChunkExplorer(
        result.parsing.chunks,
        result.parsing.grounding,
        result.parsing.chunk_summary,
        chunkOrderMap
      )
    }
  } catch (err) {
    if (err.name === 'ApiError') {
      showError(err.message, err.detail)
    } else {
      showError('An unexpected error occurred. Please try again.')
    }
  } finally {
    hideLoading(!!selectedFile)
  }
}

function init() {
  initUI({ onFileSelected: handleFileSelect })
  initSchemaSelector()

  // Bbox click -> select chunk in panel
  setChunkSelectHandler(selectChunk)

  // List click -> highlight bbox in viewer
  setChunkListSelectHandler(highlightBoundingBox)

  document.getElementById('parse-btn').addEventListener('click', handleParse)
}

init()
