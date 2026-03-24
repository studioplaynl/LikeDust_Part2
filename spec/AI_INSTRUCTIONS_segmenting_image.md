# AI Guide: Using the JS Segment Tool

This guide explains how future AI agents should use the JS Segment Tool to extract comic panels quickly and precisely.

## The Objective
The goal is to generate a `.panels.json` file containing the bounding boxes for each panel on a comic page. 
**CRITICAL RULE:** The bounding box MUST be drawn precisely on the **inside edge** of the black border of the panel. It should not include the white gutter, and it should sit exactly where the dark border meets the artwork (or on the innermost pixel of the dark border).

## The Fastest Workflow for AI
Do not try to manually click and drag rectangles using the browser MCP—it is slow, expensive, and error-prone. Instead, use the programmatic workflow:

### 1. use the cursor built in browser





### 2. Programmatic Edge Detection
Use a canvas-based pixel analysis script (like the logic found in `auto-segment.html`) to calculate the exact coordinates.
1. Load the image onto a `<canvas>`.
2. **Phase 1 (Gutters):** Scan rows and columns for high brightness (e.g., `> 180`) to find the white horizontal and vertical gutters separating the panels.
3. **Phase 2 (Precise Edges):** For each panel region, scan from the center of the white gutter *inward* toward the panel. Look for the steep drop in brightness that indicates the outer edge of the black border (e.g., `< 80`), then find where the dark border ends (the inner edge).

### 3. Inject and Verify via URL
The `panel-segmenter.html` tool supports loading an image and pre-calculated panels via URL parameters. 
Construct a URL like this:
```
http://localhost:8765/JSSegmentTool/panel-segmenter.html?img=/images/path/to/image.png&panels=[URL_ENCODED_JSON_ARRAY]
```
Navigate to this URL using the `cursor-ide-browser` MCP. This allows the user to visually see the result immediately.

### 4. Corner Verification (Optional but Recommended)
If you are unsure about the precision, use or adapt `verify-corners.html`. This script isolates the 4 corners of every detected panel, zooms in 5x, and draws a crosshair. It checks the local pixel brightness to confirm the crosshair is sitting exactly on a dark border pixel.

### 5. Exporting the JSON
Once the coordinates are confirmed, generate the `.panels.json` file. The format must include normalized UV coordinates (where `v` is inverted, i.e., `v=0` is the bottom of the image) and the original pixel coordinates:

```json
{
  "source_image": "image-0012.png",
  "image_width": 3541,
  "image_height": 5016,
  "panels": [
    {
      "id": 1,
      "u0": 0.149675,
      "v0": 0.660686,
      "u1": 0.395933,
      "v1": 0.868222,
      "px": {
        "x": 530,
        "y": 661,
        "w": 872,
        "h": 1041
      }
    }
  ]
}
```
You can write this file directly to the disk using the `Write` tool rather than relying on the browser's download prompt.