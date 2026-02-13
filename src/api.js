const API_URL = 'https://miagentuca-demos-ade-parse.ud2cay.easypanel.host/parse'

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export async function parseDocument(file, schema = null) {
  const formData = new FormData()
  formData.append('file', file)
  if (schema) {
    formData.append('schema', schema)
  }

  let response
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new ApiError('Could not connect to the server. Please check your connection.', 0, null)
  }

  if (!response.ok) {
    const errorMessages = {
      400: 'Unsupported file type.',
      413: 'File exceeds the 5 MB size limit.',
      429: 'Rate limit exceeded. Please wait before trying again.',
    }
    const message = errorMessages[response.status] || `Server error (${response.status}).`

    let detail = null
    try {
      const body = await response.json()
      detail = body.detail || body.error || null
    } catch {
      // response body not parseable
    }

    throw new ApiError(message, response.status, detail)
  }

  return response.json()
}
