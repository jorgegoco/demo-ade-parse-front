const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'jpeg', 'jpg', 'png', 'apng', 'bmp', 'dcx', 'dds', 'dib', 'gd',
  'gif', 'icns', 'jp2', 'pcx', 'ppm', 'psd', 'tga', 'tif', 'tiff', 'webp',
  'doc', 'docx', 'odt',
  'odp', 'ppt', 'pptx',
  'csv', 'xlsx',
])

const MAX_FILE_SIZE = 5 * 1024 * 1024

export function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' }
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `Unsupported file type ".${ext}". Allowed: PDF, images, Word, PowerPoint, Excel, CSV.`,
    }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File is too large (${sizeMB} MB). Maximum size is 5 MB.`,
    }
  }

  return { valid: true, error: null }
}

export function validateSchema(schemaString) {
  if (!schemaString || !schemaString.trim()) {
    return { valid: true, error: null }
  }

  let parsed
  try {
    parsed = JSON.parse(schemaString)
  } catch (e) {
    return { valid: false, error: `Invalid JSON schema: ${e.message}` }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, error: 'Schema must be a JSON object.' }
  }

  return { valid: true, error: null }
}
