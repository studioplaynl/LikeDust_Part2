# Panel Segmenter Batch Processing

This script automates the creation of Blender scene files (`.blend`) for an entire folder of comic pages. 

For every `.png` image that has a matching `.panels.json` file, it will:
1. Load the image
2. Automatically import the JSON and generate the panel meshes
3. Set up the top-down camera view
4. Save the file automatically (e.g., `Panel012-segmented with addon.blend`) in the same folder.

## Prerequisites

1. You must have the **Panel Segmenter** addon (`panel_segmenter.py`) installed and enabled in your Blender.
2. Your images and JSON files must be in the same folder and follow the naming convention:
   - `image-0012.png`
   - `image-0012.panels.json`

## How to use

You have two options for running this script:

### Option A: From inside Blender (Interactive)

This is the easiest method if you just want to run it quickly.

1. Open Blender.
2. Go to the **Scripting** workspace (tab at the top).
3. Open the `batch_process.py` file in the text editor.
4. Scroll to the bottom of the script and change the `DEFAULT_FOLDER` variable to point to your folder:
   ```python
   DEFAULT_FOLDER = r"C:\path\to\your\images\folder"
   ```
5. Click the **Run Script** button (the Play icon ▶) at the top of the text editor.
6. Check the Window > Toggle System Console to see the progress.

### Option B: From the Command Line (Headless/Background)

This method is faster because it doesn't load the Blender UI. It's great for processing hundreds of images.

1. Open a Command Prompt or PowerShell.
2. Run Blender in background mode, passing the script and the folder path:

```cmd
"C:\Program Files\Blender Foundation\Blender 4.x\blender.exe" --background --python "C:\path\to\batch_process.py" -- --folder "C:\path\to\your\images\folder"
```

*(Note: You will need to adjust the path to your `blender.exe` depending on where you installed it and what version you are using).*

The `--` separates Blender's arguments from the script's arguments. Everything after `--` is passed to the Python script.