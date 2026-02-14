import './style.css'
import { initUI, showFileInfo, clearFileInfo, showLoading, hideLoading, showError, renderResults, clearResults } from './ui.js'
import { parseDocument } from './api.js'
import { validateFile, validateSchema } from './validation.js'
import { initSchemaSelector, getSelectedSchema } from './schemas.js'
import { renderDocumentViewer, setChunkSelectHandler, clearViewer } from './viewer.js'
import { renderChunkExplorer, scrollToChunk, clearChunkExplorer } from './chunks.js'

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
    renderResults(result)

    // Render bounding box viewer if page images are available
    if (result.parsing?.page_images?.length) {
      renderDocumentViewer(result.parsing.page_images, result.parsing.grounding)
    }

    // Render chunk explorer if chunks are available
    if (result.parsing?.chunks?.length) {
      renderChunkExplorer(
        result.parsing.chunks,
        result.parsing.grounding,
        result.parsing.chunk_summary
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
  setChunkSelectHandler(scrollToChunk)
  document.getElementById('parse-btn').addEventListener('click', handleParse)
}

init()
