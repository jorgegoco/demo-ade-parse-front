import './style.css'
import { initUI, showFileInfo, clearFileInfo, showLoading, hideLoading, showError, renderResults, clearResults } from './ui.js'
import { parseDocument } from './api.js'
import { validateFile, validateSchema } from './validation.js'

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
    showError(result.error)
    return
  }

  selectedFile = file
  showFileInfo(file)
  clearResults()
}

async function handleParse() {
  if (!selectedFile) return

  const schemaInput = document.getElementById('schema-input').value.trim()
  if (schemaInput) {
    const schemaResult = validateSchema(schemaInput)
    if (!schemaResult.valid) {
      showError(schemaResult.error)
      return
    }
  }

  showLoading()
  clearResults()

  try {
    const result = await parseDocument(selectedFile, schemaInput || null)
    renderResults(result)
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
  document.getElementById('parse-btn').addEventListener('click', handleParse)
}

init()
