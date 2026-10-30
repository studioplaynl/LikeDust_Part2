# Blender Panel Segmenter Tool -- Spec

## Context

This is the Blender-native counterpart to the browser-based JS panel segmenter ([spec/segment-pages-to-frames-tool.md](segment-pages-to-frames-tool.md)). Rather than drawing boxes in a browser and importing JSON, you work entirely inside Blender: assign a source image, create as many panel crops as you need, and adjust each crop with precise controls. The result is the same -- positioned, cropped planes ready for the 3D scene -- but the workflow stays inside Blender.

The existing addon at [BlenderTools/panel_segmenter.py](../BlenderTools/panel_segmenter.py) already implements the core mechanics (Mapping-node crops, sidebar UV sliders, add/remove). This spec describes the redesign to make image assignment and manual cropping the primary workflow, rather than JSON import.

## Design Principles

- **No auto-detection.** The user decides how many panels exist and where each crop falls. No OpenCV, no heuristics.
- **Image-first.** The first action is picking an image, not importing a JSON file. JSON import/export remain available but are secondary.
- **Node-editable.** Each panel has a Mapping node labeled "Crop Region" in its material. Tweaking Location/Scale in the Shader Editor updates the crop in real time.
- **Sidebar-editable.** The N-panel sidebar shows number fields for Top-Left (x, y) and Bottom-Right (x, y) in normalized 0-1 coordinates, with 4-decimal precision. Changes sync bidirectionally with the Mapping node.
- **Layout-preserving.** Each crop plane is automatically sized and positioned so the panels reconstruct the original page layout in 3D space.

## Addon Structure

Single file: `BlenderTools/panel_segmenter.py` (rewrite of the existing addon).

### Registration

- `bl_info` with name "Panel Segmenter", category "Object", location "View3D > Sidebar > Panels".
- Registers on `__name__ == "__main__"` for script execution, and as a standard addon via `register()`/`unregister()`.

## Data Model

### Scene-Level Properties (new `PSEGSceneProps` PropertyGroup on `bpy.types.Scene`)

- `source_image`: PointerProperty to `bpy.types.Image` -- the page image shared by all panels.
- `page_width`: IntProperty -- pixel width of the source image (auto-populated on image assignment).
- `page_height`: IntProperty -- pixel height (auto-populated).
- `pixel_scale`: FloatProperty -- conversion factor from pixels to Blender units (default `0.001`, so 1000px = 1 BU).

### Object-Level Properties (existing `PSEGCropProps` PropertyGroup on `bpy.types.Object`)

Per panel crop plane:

- `top_left_x`: FloatProperty -- normalized X of top-left corner (0.0-1.0, precision 4). Replaces `u0`.
- `top_left_y`: FloatProperty -- normalized Y of top-left corner (0.0-1.0, precision 4). Replaces the old `v1` (because screen top-left maps to UV top).
- `bottom_right_x`: FloatProperty -- normalized X of bottom-right corner. Replaces `u1`.
- `bottom_right_y`: FloatProperty -- normalized Y of bottom-right corner. Replaces the old `v0`.
- Internal `update` callback on every field calls `sync_panel_to_crop(obj)` to push values to the Mapping node and plane transform.

**Coordinate convention:** Top-left origin (matching how you visually see the image), values 0-1. Internally converted to Blender UV space (bottom-left origin) when writing to the Mapping node:

```
u0 = top_left_x
u1 = bottom_right_x
v0 = 1.0 - bottom_right_y   (screen bottom-right Y -> UV bottom)
v1 = 1.0 - top_left_y       (screen top-left Y -> UV top)
```

## Operators

### `PSEG_OT_assign_image` -- "Assign Page Image"

- Opens a file browser filtered to image types.
- Loads the selected image into `bpy.data.images`.
- Sets `scene.pseg.source_image`, auto-fills `page_width`/`page_height` from `image.size`.
- Creates (or updates) the semi-transparent reference plane behind everything.

### `PSEG_OT_add_panel` -- "Add Panel"

- Requires `scene.pseg.source_image` to be set (poll check).
- Creates a new plane with its own material containing the standard node chain:
  `Texture Coordinate (UV) -> Mapping ("Crop Region") -> Image Texture (source image) -> Principled BSDF -> Output`
- Default crop: full image (top-left 0,0 / bottom-right 1,1).
- Auto-names sequentially: `Panel_01`, `Panel_02`, etc.
- Places in a "Panel Crops" collection.
- Selects the new panel so the sidebar immediately shows its crop fields.

### `PSEG_OT_remove_panel` -- "Remove Panel"

- Deletes the active panel crop object and its material/mesh if orphaned.
- Poll: active object must have `is_panel_crop` custom property.

### `PSEG_OT_export_json` -- "Export Panels JSON"

- Collects all objects with `is_panel_crop`, converts their crop values to the existing JSON format (with `u0/v0/u1/v1` in Blender UV space and `px` in pixel coords).
- Opens a file-save dialog for `.panels.json`.
- Maintains compatibility with the JS tool's import format.

### `PSEG_OT_import_json` -- "Import Panels JSON" (kept from current addon)

- Reads a `.panels.json` file, assigns the source image, creates panel planes.
- Now also sets `scene.pseg.source_image` so subsequent "Add Panel" works.

## Sidebar Panel (N-panel, "Panels" tab)

```
+----------------------------------+
|  PANEL SEGMENTER                 |
|                                  |
|  Source Image: [image-0007.png]  |  <- image selector / assign button
|  3541 x 5016 px                  |  <- auto-displayed dimensions
|                                  |
|  [+ Add Panel]                   |
|                                  |
|  --- Selected: Panel_03 ---      |
|  ┌──────────────────────────┐    |
|  │ Top Left                 │    |
|  │   X: [0.1510]            │    |
|  │   Y: [0.1322]            │    |
|  │ Bottom Right              │    |
|  │   X: [0.8485]            │    |
|  │   Y: [0.5483]            │    |
|  │                          │    |
|  │ [Remove Panel]           │    |
|  └──────────────────────────┘    |
|                                  |
|  --- All Panels ---              |
|  [Panel_01] [Panel_02]          |  <- click to select
|  [Panel_03] [Panel_04]          |
|  [Panel_05]                     |
|                                  |
|  [Export JSON]  [Import JSON]    |
+----------------------------------+
```

- **Source Image** section: shows current image (or "None"), with an assign button.  
- **Selected panel** section: only visible when a panel crop is active. Shows top-left/bottom-right fields.  
- **All panels list**: clickable list of all crop objects for quick selection.
- **Export/Import**: at the bottom, secondary actions.

## Material / Node Setup

Each panel crop plane gets a material with this node chain:

```
[Texture Coordinate] -> [Mapping "Crop Region"] -> [Image Texture "Page Image"] -> [Principled BSDF] -> [Material Output]
     UV output              Location = (u0, v0, 0)        source image               Specular=0
                            Scale = (du, dv, 1)                                       Roughness=1
```

The Mapping node is labeled **"Crop Region"** and is the primary interactive control in the Shader Editor. Its Location and Scale inputs map directly to the crop rectangle:

- `Location.x` = u0 (left edge in UV space)
- `Location.y` = v0 (bottom edge in UV space)
- `Scale.x` = u1 - u0 (width in UV space)
- `Scale.y` = v1 - v0 (height in UV space)

### Sync Direction

- **Sidebar -> Nodes**: changing the sidebar number fields writes to the Mapping node inputs and updates plane transform.
- **Nodes -> Sidebar**: a depsgraph handler (`on_depsgraph_update`) checks whether any Mapping node's values changed and writes back to the sidebar properties (to keep them in sync if the user drags values in the Shader Editor instead).

This bidirectional sync is the main improvement over the current addon, which only syncs sidebar -> nodes.

## Transform / Positioning Logic

When crop values change, `sync_panel_to_crop(obj)` runs:

```python
du = bottom_right_x - top_left_x
dv = bottom_right_y - top_left_y
pw, ph = scene.pseg.page_width, scene.pseg.page_height
ps = scene.pseg.pixel_scale

obj.scale.x = du * pw * ps / 2
obj.scale.y = dv * ph * ps / 2

obj.location.x = ((top_left_x + bottom_right_x) / 2 - 0.5) * pw * ps
obj.location.y = ((2 - top_left_y - bottom_right_y) / 2 - 0.5) * ph * ps  # Y flipped
```

The plane is always centered on its crop region within the page layout. Moving the crop slides the plane to match.

## Reference Plane

A semi-transparent full-page plane ("Page_Reference") sits at z=-0.002 behind all panel crops. It shows the full source image at 25% opacity so you can see the page context while adjusting crops. Created automatically when a source image is assigned.

## Key Differences from Current Addon

- **Image-first workflow**: assign image directly instead of importing JSON.
- **Top-left / bottom-right fields**: more intuitive than U Min/V Min/U Max/V Max (which mix UV conventions and screen conventions confusingly).
- **Bidirectional node sync**: editing the Mapping node in the Shader Editor updates the sidebar, and vice versa.
- **All-panels list**: quick-select any panel from the sidebar without hunting in the outliner.
- **Scene-level image storage**: the source image is a scene property, so "Add Panel" always knows which image to use.
- **Export remains compatible**: output JSON matches the existing `.panels.json` format consumed by the JS tool.
