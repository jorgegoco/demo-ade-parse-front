# Document Parser & Extractor

A lightweight frontend for LandingAI's **Agentic Document Extraction (ADE)** API. Upload any document, get structured markdown with visual grounding, and optionally extract key-value pairs using JSON schemas.

Built for demo and experimentation purposes. Based on the [Document Understanding with ADE](https://www.deeplearning.ai/) course by DeepLearning.AI.

## Features

**Parsing**
- Drag-and-drop or click-to-browse file upload
- Full document parsing into structured markdown with semantic chunks
- Page image viewer with color-coded bounding boxes for each chunk
- Chunk explorer with type filters (text, table, figure, logo, marginalia)
- Chunk detail panel with Order, Markdown (raw source), HTML (rendered), and Type tabs

**Extraction**
- Preset schema support (SDGE Electric Bill with a custom-rendered card)
- Custom JSON schema input for extracting arbitrary fields from any document
- Source References section showing the raw extraction output in Python-dict format
- Clickable ref-links (custom schemas) that highlight the source chunk in the viewer

**Output**
- Metadata stats: duration, pages, chunk count, type breakdown
- Download parsed markdown as `.md`
- Download extraction result as `.json`

## Supported file types

| Category       | Extensions                                                                                           |
|----------------|------------------------------------------------------------------------------------------------------|
| PDF            | `.pdf`                                                                                               |
| Images         | `.jpeg` `.jpg` `.png` `.apng` `.bmp` `.dcx` `.dds` `.dib` `.gd` `.gif` `.icns` `.jp2` `.pcx` `.ppm` `.psd` `.tga` `.tif` `.tiff` `.webp` |
| Text documents | `.doc` `.docx` `.odt`                                                                                |
| Presentations  | `.odp` `.ppt` `.pptx`                                                                                |
| Spreadsheets   | `.csv` `.xlsx`                                                                                       |

Maximum file size: **5 MB**

> **Tip:** Some documents contain no text — only illustrations or diagrams. For these, the backend uses the `dpt-1-latest` model, which provides more detailed figure descriptions compared to the default `dpt-2-latest`.

## Getting started

```bash
cp .env.example .env   # then set VITE_API_URL to your backend
npm install
npm run dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173).

## Usage

1. **Upload a document** — drag a file onto the drop zone or click to browse.
2. **Choose a schema** — select a preset (e.g. SDGE Electric Bill), enter a custom JSON schema, or leave it as "No schema" for parse-only mode.
3. **Click "Parse Document"** — results appear in a two-panel layout:
   - **Left:** page images with bounding boxes around detected chunks
   - **Right:** Chunks tab (filterable list with detail view) and Extraction tab (rendered fields + raw output)
4. **Download results** — use the download buttons to save the parsed markdown or extraction JSON locally.

### Custom JSON schema example

```json
{
  "type": "object",
  "properties": {
    "invoice_number": {
      "type": "string",
      "description": "Invoice or document reference number"
    },
    "total_amount": {
      "type": "number",
      "description": "Total amount due including tax"
    }
  }
}
```

Write detailed `description` values — they directly influence extraction accuracy.

## Architecture

```
src/
  main.js         Entry point, orchestrates all modules
  api.js          API client (POST /parse)
  validation.js   File type/size and schema validation
  schemas.js      Schema presets and selector UI
  renderers.js    Custom renderers for preset schemas (SDGE bill)
  ui.js           DOM manipulation, rendering, and downloads
  chunks.js       Chunk explorer (filters, list, detail tabs)
  viewer.js       Page image viewer with bounding box overlays
  style.css       All styles
```

## API

The backend URL is configured via the `VITE_API_URL` environment variable (see `.env.example`).

- **POST /parse** — multipart/form-data with `file` (required) and `schema` (optional JSON string)
- **GET /health** — health check

The backend wraps LandingAI's ADE SDK, calling the Parse API (`dpt-2-latest`) to convert documents into structured markdown with chunks and bounding boxes, and the Extract API (`extract-latest`) to pull key-value pairs matching the provided schema.

## Tech stack

- [Vite](https://vite.dev/) — dev server and bundler
- Vanilla JS — no framework
- Plain CSS
