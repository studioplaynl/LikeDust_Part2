# Segment Pages to Frames — Tool Spec

## Context

The project "We All Breathe The Same Air" is a graphic novel whose pages have been exported from PDF as individual JPG images (e.g. `images/Images from PDF/4.jpg`). Each page contains a **grid of comic panels** separated by white gutters and bounded by black border lines.

The goal is to **recreate the panel layout in Blender** — each panel as a separate textured plane, parented under a page-level Empty — so the 3D scene mirrors the storyboard structure.

To get there we need **accurate rectangle coordinates** for every panel on every page.

## Decision Summary

| Question | Decision |
|----------|----------|
| Where to define panel rects? | Browser-based HTML/JS tool with auto-detect + manual correction |
| Detection engine | OpenCV.js — contour detection on the black panel borders |
| What edge to detect? | The **inside** edge of the black frame lines (not the outer edge, not the gutter) |
| Coordinate system for export | Normalized UV (0–1), origin bottom-left, matching Blender UV space |
| Non-rectangular panels (e.g. hand breaking frame) | Keep rectangles for now; fix manually in the tool |
| Output format | JSON per page (or batch), consumed by Blender Python via MCP |

## Tool Overview

A single-file HTML application that:

1. Loads a page image (drag-drop or file picker).
2. Runs OpenCV.js contour detection to **propose** panel rectangles.
3. Renders the image with **SVG rectangle overlays** for inspection and editing.
4. Provides **zoom + pan** so the user can inspect borders at pixel precision.
5. Allows **per-handle correction** (drag corners/edges), adding new rects, and deleting false positives.
6. Exports a **JSON file** with normalized coordinates ready for Blender's UV/coordinate system.

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   ┌──────────────────────────────────┐  ┌────────┐  │
│   │                                  │  │ PANELS │  │
│   │                                  │  │        │  │
│   │     Image + SVG Overlay          │  │ [1] ■  │  │
│   │     (zoomable / pannable)        │  │ [2] ■  │  │
│   │                                  │  │ [3] ■  │  │
│   │     Rects drawn over image       │  │ [4] ■  │  │
│   │     Corner handles on selected   │  │ [5] ■  │  │
│   │                                  │  │        │  │
│   │                                  │  │ [+ New]│  │
│   │                                  │  │[Detect]│  │
│   │                                  │  │[Export]│  │
│   └──────────────────────────────────┘  └────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Floating Panel List (right side, `position: fixed`)

- List of detected/manually created rectangles, labeled by index.
- Click a list item to **select** that rect (highlights it, shows corner handles).
- Each item has a **delete** button (×).
- **[+ New]** button: enters "draw mode" — click-drag on the image to create a new rect.
- **[Auto Detect]** button: runs OpenCV.js pipeline, replaces current rects with proposals.
- **[Export JSON]** button: converts all rects to Blender-compatible normalized UV coordinates and downloads a `.json` file.

### Viewport

- The image is rendered at **native resolution** inside a wrapper div.
- An SVG element sits on top of the image, with identical dimensions (`viewBox` = image pixel size).
- Zoom and pan are applied to the wrapper via CSS `transform` (using a library like `panzoom` or `d3-zoom`).
- SVG rects use `vector-effect: non-scaling-stroke` so border widths stay constant regardless of zoom level.
- Corner handle radii are divided by the current zoom scale to remain a fixed screen size.

## Detection Pipeline (OpenCV.js)

### Input

The loaded image, read into an OpenCV `Mat` via `cv.imread()` from a hidden `<canvas>`.

### Steps

1. **Grayscale**: `cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)`
2. **Gaussian Blur**: `cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)` — reduces JPEG noise.
3. **Binary Threshold (inverted)**: `cv.threshold(blurred, binary, 40, 255, cv.THRESH_BINARY_INV)` — black borders become white (active), everything else black. The threshold value (~40) may need a slider for tuning across different pages.
4. **Morphological Close**: `cv.morphologyEx(binary, closed, cv.MORPH_CLOSE, kernel)` — bridges small gaps in border lines (e.g. where artwork breaks the frame). Kernel size ~5–7px.
5. **Find Contours**: `cv.findContours(closed, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE)` — `RETR_TREE` gives full parent/child hierarchy so we can distinguish inner vs outer edges of the black border stroke.
6. **Filter Contours**:
   - Approximate each contour with `cv.approxPolyDP` (epsilon ~2% of arc length).
   - Keep only contours that approximate to **4 vertices** (quadrilaterals).
   - Compute `cv.boundingRect` for each.
   - **Area filter**: discard rects smaller than ~1% of total image area (noise, text) and larger than ~90% (the full page border).
   - **Hierarchy filter**: prefer contours whose **parent** is the outer page border (hierarchy depth), to grab the inner edge of each panel's black frame.
7. **Sort**: Order rects top-to-bottom, then left-to-right (by `y` first, then `x`, with a tolerance band for rows).

### Output

An array of `{ id, x, y, w, h }` in **image pixel coordinates** (origin top-left), which the UI renders as SVG rects.

## Coordinate Export (Blender UV Space)

### Coordinate systems

| System | Origin | Y direction | Range |
|--------|--------|-------------|-------|
| Browser / SVG | Top-left | Down | 0 … imageWidth/Height (pixels) |
| Blender UV | Bottom-left | Up | 0.0 … 1.0 (normalized) |

### Conversion

```
u0 = rect.x / imageWidth
u1 = (rect.x + rect.w) / imageWidth
v0 = 1.0 - ((rect.y + rect.h) / imageHeight)   // browser bottom → Blender bottom
v1 = 1.0 - (rect.y / imageHeight)               // browser top → Blender top
```

### Export JSON shape

```json
{
  "source_image": "images/Images from PDF/4.jpg",
  "image_width": 2480,
  "image_height": 3508,
  "panels": [
    {
      "id": 1,
      "u0": 0.0712,
      "v0": 0.8234,
      "u1": 0.9288,
      "v1": 0.9543,
      "px": { "x": 177, "y": 160, "w": 2126, "h": 459 }
    }
  ]
}
```

The `px` field preserves original pixel coordinates for debugging and re-import. The `u0/v0/u1/v1` fields are what the Blender Python script consumes directly.

## Implementation Outline

### File Structure

```
tools/
  panel-segmenter.html    ← single-file tool (HTML + CSS + JS)
```

### Dependencies (loaded via CDN)

- **OpenCV.js** (`https://docs.opencv.org/4.x/opencv.js`) — contour detection.
- **panzoom** (`https://unpkg.com/panzoom`) — viewport zoom/pan on the wrapper div.
- No build step. No npm. One HTML file opened in a browser.

### Code Structure (inside `panel-segmenter.html`)

```
<style>
  /* Viewport container: overflow hidden, full screen */
  /* Floating panel: position fixed, right side, z-index 100 */
  /* SVG rect styling: stroke, fill with low opacity, non-scaling-stroke */
  /* Handle circles: fixed visual size (radius / zoom) */
  /* Selected rect: different stroke color, visible handles */
</style>

<body>
  <div id="viewport">
    <div id="canvas-wrapper">
      <img id="source-image" />
      <svg id="overlay"></svg>
    </div>
  </div>

  <div id="panel-ui">
    <!-- File input, layer list, buttons -->
  </div>

  <canvas id="cv-canvas" style="display:none"></canvas>
</body>

<script src="opencv.js" async onload="onOpenCvReady()"></script>
<script src="panzoom.js"></script>

<script>
  // ── State ──────────────────────────────────────
  // let rects = []           // { id, x, y, w, h }
  // let selectedId = null
  // let mode = 'select'      // 'select' | 'draw'
  // let zoomInstance = null
  // let imgWidth, imgHeight

  // ── Image Loading ──────────────────────────────
  // handleFileInput(file):
  //   Read file as data URL → set img.src
  //   On img.onload:
  //     Set imgWidth, imgHeight from naturalWidth/Height
  //     Set SVG viewBox to "0 0 imgWidth imgHeight"
  //     Size canvas-wrapper to match
  //     Initialize panzoom on canvas-wrapper
  //     Store zoom scale reference for handle sizing

  // ── OpenCV Detection ───────────────────────────
  // detectPanels():
  //   Draw img to hidden canvas at full resolution
  //   cv.imread(canvas) → src Mat
  //   Grayscale → Blur → Threshold (inverted) → Morph Close
  //   findContours with RETR_TREE
  //   For each contour:
  //     approxPolyDP → if 4 vertices:
  //       boundingRect → { x, y, w, h }
  //       Check area bounds (1%–90% of image area)
  //       Check hierarchy: prefer inner contours
  //   Sort results top→bottom, left→right
  //   Assign sequential IDs
  //   Set rects = results
  //   render()

  // ── SVG Rendering ──────────────────────────────
  // render():
  //   Clear SVG children
  //   For each rect in rects:
  //     Create <rect> with x, y, width, height
  //     Style: semi-transparent fill, colored stroke
  //     If rect.id === selectedId:
  //       Highlight stroke
  //       Render 4 corner <circle> handles
  //         radius = HANDLE_RADIUS / currentZoomScale
  //     Attach click listener → select this rect
  //   Update panel list UI

  // ── Handle Dragging ────────────────────────────
  // On handle mousedown:
  //   Record which corner (TL, TR, BL, BR)
  //   On mousemove (converted to image-space coords):
  //     Update rect x/y/w/h based on which corner moves
  //     Clamp to image bounds
  //     Re-render SVG (or just update attributes)
  //   On mouseup: stop dragging

  // ── Mouse → Image Coordinate Conversion ───────
  // screenToImage(clientX, clientY):
  //   Get canvas-wrapper's current transform (from panzoom)
  //   Invert the transform matrix
  //   Apply to (clientX, clientY) relative to viewport
  //   Return (imageX, imageY) in pixel coords

  // ── Draw Mode (new rect) ──────────────────────
  // On SVG mousedown when mode === 'draw':
  //   Record start point (image coords)
  //   On mousemove: render a preview rect from start to current
  //   On mouseup: push new rect to rects[], assign ID, select it
  //   Switch mode back to 'select'

  // ── Zoom Scale Tracking ────────────────────────
  // Listen to panzoom 'transform' event:
  //   Extract current scale
  //   Update handle radii (HANDLE_RADIUS / scale)
  //   Update SVG stroke-width if not using non-scaling-stroke

  // ── Panel List UI ──────────────────────────────
  // renderPanelList():
  //   For each rect: <li> with "Panel {id}" + delete button
  //   Click li → selectedId = rect.id, render()
  //   Click delete → remove from rects[], render()

  // ── Export ─────────────────────────────────────
  // exportJSON():
  //   Map rects to Blender UV coords:
  //     u0 = x / imgWidth
  //     u1 = (x + w) / imgWidth
  //     v0 = 1 - ((y + h) / imgHeight)
  //     v1 = 1 - (y / imgHeight)
  //   Build JSON object with source_image, dimensions, panels
  //   Create Blob, trigger download as .json file
</script>
```

### Key Implementation Details

**Screen-to-image coordinate conversion** is the trickiest part. The `panzoom` library applies a CSS transform (`matrix(scale, 0, 0, scale, tx, ty)`) to the wrapper. To convert a mouse event's `clientX/clientY` to image pixel coordinates:

```javascript
function screenToImage(clientX, clientY) {
  const wrapperRect = wrapper.getBoundingClientRect();
  const transform = zoomInstance.getTransform();
  const x = (clientX - wrapperRect.left - transform.x) / transform.scale;
  const y = (clientY - wrapperRect.top - transform.y) / transform.scale;
  return { x, y };
}
```

**Handle sizing** — corner handles must stay a fixed size on screen:

```javascript
const HANDLE_SCREEN_RADIUS = 6; // pixels on screen, always
const svgRadius = HANDLE_SCREEN_RADIUS / currentZoomScale;
```

**Threshold tuning** — the binary threshold value (default ~40) works well for clean black-on-white borders but may need adjustment for pages with heavy dark artwork. Exposing this as a slider in the UI lets the user tune it per page without touching code.

## Downstream: Blender Ingestion & Grid Recreation

The exported JSON is consumed by a Blender Python script, executed via the Blender MCP's `execute_blender_code` tool. This section describes the full Blender-side pipeline so both tools can be developed against a shared contract.

### Goal

Reconstruct the comic page as a set of **flat textured planes** in 3D space, laid out with gutters between them, all parented under one Empty per page. The result should look like the original page but with each panel as an independent, selectable object.

### Scene Hierarchy

```
Scene Collection
 └─ Page_04  (Empty, at origin or offset per page)
     ├─ Panel_04_01  (Mesh — plane)
     ├─ Panel_04_02  (Mesh — plane)
     ├─ Panel_04_03  (Mesh — plane)
     ├─ Panel_04_04  (Mesh — plane)
     └─ Panel_04_05  (Mesh — plane)
 └─ Page_05  (Empty, offset along X or Z)
     ├─ Panel_05_01
     └─ ...
```

Moving, rotating, or scaling a page Empty transforms all its child panels together.

### Step-by-Step Blender Script Logic

#### 1. Load the source image

```python
img = bpy.data.images.load(abs_path_to_image)
img_w, img_h = img.size  # e.g. 2480, 3508
```

Load once per page. All panels on that page share this single image data block.

#### 2. Create a shared material

One material per page image, with an **Emission** or **Principled BSDF** shader driven by an **Image Texture** node. The UV mapping on each plane determines which region of the image is shown.

```python
mat = bpy.data.materials.new(name=f"Mat_Page_04")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links

nodes.clear()
output = nodes.new('ShaderNodeOutputMaterial')
bsdf = nodes.new('ShaderNodeBsdfPrincipled')
tex = nodes.new('ShaderNodeTexImage')
tex.image = img

links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
```

Using Emission instead of Principled BSDF is useful if the panels should look "flat" without lighting.

#### 3. Create the page Empty

```python
page_empty = bpy.data.objects.new(f"Page_04", None)
bpy.context.collection.objects.link(page_empty)
```

#### 4. For each panel: create plane, set UVs, position, parent

For every panel entry in the JSON (`u0, v0, u1, v1` in Blender UV space):

**a. Determine world-space dimensions**

The panel's aspect ratio comes from the UV rect and the image's pixel aspect:

```python
panel_w_uv = u1 - u0           # e.g. 0.857
panel_h_uv = v1 - v0           # e.g. 0.131
aspect = (panel_w_uv * img_w) / (panel_h_uv * img_h)

WORLD_SCALE = 10.0              # page height in Blender units
plane_h = panel_h_uv * WORLD_SCALE
plane_w = plane_h * aspect
```

**b. Create a plane mesh**

```python
bpy.ops.mesh.primitive_plane_add(size=1)
obj = bpy.context.active_object
obj.name = f"Panel_04_{panel_id:02d}"
obj.scale = (plane_w, plane_h, 1)
bpy.ops.object.transform_apply(scale=True)
```

Or build the mesh from scratch with `bpy.data.meshes.new()` + `bmesh` for cleaner control.

**c. Set UVs to sample the correct sub-region**

The plane has 4 vertices with UV coordinates that map to the panel's portion of the full-page image:

```python
uv_layer = obj.data.uv_layers.active
# Plane verts are in order: BL, BR, TR, TL (may vary — check face loop)
# Map them to the panel's UV rect:
uv_coords = [
    (u0, v0),   # bottom-left
    (u1, v0),   # bottom-right
    (u1, v1),   # top-right
    (u0, v1),   # top-left
]
for i, loop in enumerate(obj.data.loops):
    uv_layer.data[loop.index].uv = uv_coords[i]
```

**d. Assign the shared material**

```python
obj.data.materials.append(mat)
```

**e. Position in world space**

Place panels so they reconstruct the page layout with gutters. The simplest approach uses the original UV coordinates to derive position, keeping the page centered:

```python
# Center of this panel in UV space
cx_uv = (u0 + u1) / 2.0
cy_uv = (v0 + v1) / 2.0

# Convert to world position (centered on page)
obj.location.x = (cx_uv - 0.5) * PAGE_WIDTH_WORLD
obj.location.y = (cy_uv - 0.5) * PAGE_HEIGHT_WORLD
obj.location.z = 0
```

Where `PAGE_WIDTH_WORLD = WORLD_SCALE * (img_w / img_h)` and `PAGE_HEIGHT_WORLD = WORLD_SCALE`.

**f. Parent to page Empty**

```python
obj.parent = page_empty
obj.matrix_parent_inverse = page_empty.matrix_world.inverted()
```

Using `matrix_parent_inverse` preserves the panel's current world-space position when parenting.

### Gutter Handling

The gutters (white space between panels) emerge naturally from the UV coordinates. If `u1` of panel A is `0.49` and `u0` of panel B is `0.51`, the gap in world space is `0.02 * PAGE_WIDTH_WORLD`. No explicit gutter parameter is needed — the segmenter tool captures the gutters implicitly by tracing the inside of each black frame.

If you want to add **extra spacing** between panels (e.g. to create a 3D "exploded" view), apply a uniform scale factor to the offset from center:

```python
SPREAD = 1.2  # 1.0 = pixel-accurate layout, >1 = wider gaps
obj.location.x = (cx_uv - 0.5) * PAGE_WIDTH_WORLD * SPREAD
obj.location.y = (cy_uv - 0.5) * PAGE_HEIGHT_WORLD * SPREAD
```

### Multi-Page Layout

When processing multiple pages, offset each page Empty along the X axis:

```python
PAGE_SPACING = PAGE_WIDTH_WORLD * 1.2
page_empty.location.x = page_index * PAGE_SPACING
```

This lays pages out side by side like a filmstrip. Alternatively, use a grid (rows and columns) for many pages.

### Execution via Blender MCP

The script is run in chunks via `execute_blender_code`:

1. **Chunk 1**: Load image, create material, create page Empty.
2. **Chunk 2–N**: One chunk per panel (or batch a few) — create plane, set UVs, position, parent.
3. **Final chunk**: `get_viewport_screenshot` to visually verify the layout.

Breaking into chunks keeps each MCP call small and debuggable. If a panel's UVs look wrong in the screenshot, re-run just that chunk with corrected values.

### Summary of the Data Contract

The segmenter tool and the Blender script share one interface — the JSON file:

```
Segmenter HTML Tool                    Blender Python Script
─────────────────                      ────────────────────
Image + OpenCV + manual correction     Reads JSON
        │                                     │
        ▼                                     ▼
  JSON file                             Planes with UVs
  { source_image,                       parented under
    image_width, image_height,          page Empty
    panels: [{ id, u0, v0, u1, v1 }] }
```

Both sides are independently testable. The JSON is human-readable and version-controllable.
