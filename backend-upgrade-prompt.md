# Backend Upgrade Task: Enrich /parse API Response

## Context

The frontend for the ADE document parser has been upgraded to display bounding box overlays, individual chunk content, and detailed extraction metadata. The backend currently strips this data from the ADE API response. You need to update the backend to return the full data the frontend now expects.

The backend is a FastAPI service using LandingAI's ADE SDK (`landingai_ade`). The two key files are:
- `execution/ade_client.py` — wraps the ADE API calls
- `orchestation/parse_endpoint.py` — the `/parse` POST endpoint

## What the Frontend Now Expects

The `/parse` endpoint must return this enriched response:

```json
{
  "success": true,
  "parsing": {
    "markdown": "...",
    "total_pages": 1,
    "total_chunks": 23,
    "chunk_summary": {"chunkText": 14, "chunkTable": 2, "chunkFigure": 3, ...},
    "duration_ms": 50375,
    "chunks": [
      {
        "id": "9841f6b3-f033-419f-a234-887b82d5b5d9",
        "type": "logo",
        "markdown": "<a id='...'></a>\n\n...",
        "grounding": {
          "page": 0,
          "box": {"top": 0.013, "bottom": 0.067, "left": 0.050, "right": 0.272}
        }
      }
    ],
    "grounding": {
      "9841f6b3-...": {"page": 0, "type": "chunkLogo", "box": {"top": 0.013, "bottom": 0.067, "left": 0.050, "right": 0.272}},
      "0-a": {"page": 0, "type": "tableCell", "box": {"top": 0.386, "bottom": 0.386, "left": 0.034, "right": 0.172}}
    },
    "page_images": [
      {"page": 0, "image_base64": "iVBOR...", "mime_type": "image/png"}
    ]
  },
  "extraction": {
    "fields": {"account_summary": {"current_charges": 155.15, ...}},
    "metadata": {"account_summary.current_charges": {"references": ["0-d"]}}
  },
  "error": null
}
```

### New fields explained:

1. **`parsing.chunks`** — Array of chunk objects from `parse_result.chunks`. Each has `id`, `type`, `markdown`, and `grounding` (with `page` and `box` containing normalized 0-1 coordinates: `top`, `bottom`, `left`, `right`).

2. **`parsing.grounding`** — The full grounding map from `parse_result.grounding`. This is a dict mapping chunk/cell IDs to their location. Keys include both UUID chunk IDs (prefixed types like `chunkText`) and short table cell IDs like `"0-a"` (type `tableCell`). Each value has `page`, `type`, and `box`.

3. **`parsing.page_images`** — Base64-encoded PNG images of each document page. For PDFs, render each page using pymupdf at 150 DPI. For image files (PNG, JPG, etc.), read the raw file and encode. Each entry has `page` (0-indexed), `image_base64`, and `mime_type`.

## Changes to Make

### 1. `execution/ade_client.py` — `parse_document()` function

After calling `client.parse()`, serialize the additional data:

```python
# After existing chunk_summary logic, add:

chunks_data = []
for chunk in parse_result.chunks:
    chunk_dict = {
        "id": chunk.id,
        "type": chunk.type,
        "markdown": chunk.markdown,
        "grounding": {
            "page": chunk.grounding.page,
            "box": {
                "top": chunk.grounding.box.top,
                "bottom": chunk.grounding.box.bottom,
                "left": chunk.grounding.box.left,
                "right": chunk.grounding.box.right,
            }
        }
    }
    chunks_data.append(chunk_dict)

grounding_data = {}
for gid, g in parse_result.grounding.items():
    grounding_data[gid] = {
        "page": g.page,
        "type": g.type,
        "box": {
            "top": g.box.top,
            "bottom": g.box.bottom,
            "left": g.box.left,
            "right": g.box.right,
        }
    }
```

Add these to the return dict alongside the existing fields:
```python
return {
    # ... existing fields ...
    "chunks": chunks_data,
    "grounding": grounding_data,
}
```

### 2. `execution/ade_client.py` — New `render_page_images()` function

```python
import base64
import fitz  # pymupdf — already available in the project

def render_page_images(file_path: str, dpi: int = 150) -> list:
    """Render document pages as base64 PNG images."""
    from pathlib import Path
    path = Path(file_path)
    ext = path.suffix.lower()

    image_exts = {'.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tiff', '.tif', '.webp'}

    if ext == '.pdf':
        doc = fitz.open(str(path))
        pages = []
        for i, page in enumerate(doc):
            mat = fitz.Matrix(dpi / 72, dpi / 72)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            pages.append({
                "page": i,
                "image_base64": base64.b64encode(img_bytes).decode(),
                "mime_type": "image/png",
            })
        doc.close()
        return pages
    elif ext in image_exts:
        mime_map = {
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.bmp': 'image/bmp', '.gif': 'image/gif', '.webp': 'image/webp',
            '.tiff': 'image/tiff', '.tif': 'image/tiff',
        }
        with open(str(path), "rb") as f:
            img_bytes = f.read()
        return [{
            "page": 0,
            "image_base64": base64.b64encode(img_bytes).decode(),
            "mime_type": mime_map.get(ext, "image/png"),
        }]
    else:
        return []  # DOCX, PPTX, CSV, etc. — no visual preview
```

### 3. `orchestation/parse_endpoint.py`

In the `/parse` endpoint handler, after calling `parse_document()` and before deleting the temp file:

```python
page_images = render_page_images(temp_file_path)
```

Then include the new fields in the response:

```python
parsing_data = {
    "markdown": parse_result["markdown"],
    "total_pages": parse_result["total_pages"],
    "total_chunks": parse_result["total_chunks"],
    "chunk_summary": parse_result["chunk_summary"],
    "duration_ms": parse_result["duration_ms"],
    "chunks": parse_result["chunks"],
    "grounding": parse_result["grounding"],
    "page_images": page_images,
}
```

Make sure `render_page_images` is imported from `ade_client.py`.

**Critical**: Call `render_page_images()` BEFORE deleting the temporary file.

## Reference

A complete example of the raw ADE parse response (with chunks, grounding, etc.) is available at:
`images/utility_example/ade_results/parse_results.json` in the frontend repo.

The `grounding` map attribute names use the actual SDK attribute access pattern — check what your version of `landingai_ade` exposes. The `ParseResponse` object likely has `.grounding` as a dict-like attribute. You may need to use `parse_result.model_dump()` to serialize it, or iterate manually as shown above.

## Testing

After deploying:
1. `curl -X POST https://your-api-url/parse -F "file=@utility_bill.pdf"` — verify chunks, grounding, and page_images are in the response
2. The frontend at localhost:5173 should show colored bounding boxes over the document image, chunk explorer in the sidebar, and clickable extraction references
