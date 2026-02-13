# demo-ade-parse-front

A lightweight frontend for the **demo-ade-parse** API — a document parser and field extractor service. Built for demo and experimentation purposes.

## Features

- **File upload** via drag-and-drop or file picker
- **Document parsing** — renders the parsed document as formatted Markdown (tables, headings, code blocks, etc.)
- **Structured field extraction** — provide a JSON schema and the API extracts matching fields from the document
- **Client-side validation** — checks file type and size before uploading
- **Metadata display** — pages, chunks, chunk breakdown, and processing duration

## Supported file types

| Category       | Extensions                                                                                           |
|----------------|------------------------------------------------------------------------------------------------------|
| PDF            | `.pdf`                                                                                               |
| Images         | `.jpeg` `.jpg` `.png` `.apng` `.bmp` `.dcx` `.dds` `.dib` `.gd` `.gif` `.icns` `.jp2` `.pcx` `.ppm` `.psd` `.tga` `.tif` `.tiff` `.webp` |
| Text documents | `.doc` `.docx` `.odt`                                                                                |
| Presentations  | `.odp` `.ppt` `.pptx`                                                                                |
| Spreadsheets   | `.csv` `.xlsx`                                                                                       |

Maximum file size: **5 MB**

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173).

## Usage

1. **Upload a document** — drag a file onto the drop zone or click to browse.
2. **(Optional) Add a JSON schema** — expand the schema section and enter a JSON schema to extract specific fields. Example:
   ```json
   {
     "type": "object",
     "properties": {
       "invoice_number": {
         "type": "string",
         "description": "Invoice or document number"
       },
       "total_amount": {
         "type": "number",
         "description": "Total amount including tax"
       }
     },
     "required": ["invoice_number", "total_amount"]
   }
   ```
   Write detailed `description` values — they directly influence extraction accuracy.
3. **Click "Parse Document"** — the parsed Markdown and any extracted fields will appear in the results section.

## API

This frontend connects to the demo-ade-parse API:

- **Base URL:** `https://miagentuca-demos-ade-parse.ud2cay.easypanel.host`
- **POST /parse** — multipart/form-data with `file` (required) and `schema` (optional)
- **GET /health** — health check

## Tech stack

- [Vite](https://vite.dev/) — dev server and bundler
- [marked](https://marked.js.org/) — Markdown rendering (GFM tables)
- Vanilla JS — no framework
