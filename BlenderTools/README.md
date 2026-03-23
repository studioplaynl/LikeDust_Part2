`BlenderTools/panel_segmenter.py` — a Blender addon that segments comic pages into individual panel crop planes directly inside Blender.

## What it does

- Assign a source image to the scene.
- Create as many panel planes as you need. All share the same source image.
- Each plane is automatically sized and positioned to match where that panel sits on the page layout.
- A semi-transparent full-page reference plane sits behind everything for context.
- Each plane has its own material with a Mapping node labeled "Crop Region" — drag its Location and Scale values in the Shader Editor to adjust the crop in real time.

## Two ways to adjust crops:

1. **Shader Editor** — select a panel, open the Shader Editor, tweak the "Crop Region" Mapping node.
2. **N-panel sidebar** — the "Panels" tab shows Top-Left and Bottom-Right coordinate sliders that update the crop and plane transform live.

*Changes in either place sync bidirectionally in real time.*

## Workflow

1. Open the N-panel (press `N` in the 3D Viewport) and go to the **Panels** tab.
2. Click **Assign** to pick a source image.
3. Click **Add Panel** to create a new crop plane.
4. Adjust the crop using the Top-Left and Bottom-Right sliders, or via the Shader Editor.
5. Repeat for all panels on the page.
6. (Optional) Click **Export JSON** to save the panel coordinates to a `.panels.json` file.

## How to use it from scripts / MCP:

```python
# Load and register the addon
filepath = '/Users/maarten/Github_may_be_deleted/LikeDust_Part2/BlenderTools/panel_segmenter.py'
with open(filepath) as f:
    exec(f.read())

# Import an existing JSON page
bpy.ops.pseg.import_json('INVOKE_DEFAULT', filepath='/path/to/image-0005.panels.json')
```

To install as a persistent addon: `Edit > Preferences > Add-ons > Install`, pick `BlenderTools/panel_segmenter.py`, then enable it. After that the "Panel Segmenter" tools are always available in the N-panel > Panels tab.
