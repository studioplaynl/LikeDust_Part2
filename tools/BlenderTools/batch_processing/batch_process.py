import bpy
import os
import glob
import sys
import argparse

def process_folder(folder_path):
    """Process all images in a folder that have corresponding JSON files."""
    if not os.path.exists(folder_path):
        print(f"Error: Folder not found: {folder_path}")
        return

    # Find all PNGs in the folder
    image_files = glob.glob(os.path.join(folder_path, "*.png"))
    
    if not image_files:
        print(f"No PNG files found in {folder_path}")
        return
        
    print(f"Found {len(image_files)} PNG files. Checking for JSONs...")
    
    processed_count = 0
    
    for img_path in image_files:
        json_path = img_path.replace(".png", ".panels.json")
        
        # Only process if the JSON exists
        if not os.path.exists(json_path):
            print(f"Skipping {os.path.basename(img_path)} - no .panels.json found")
            continue
            
        print(f"\nProcessing: {os.path.basename(img_path)}")
        
        # 1. Start with a clean slate (delete all objects)
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete()
        
        # Clean up orphaned data to keep file size small
        bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
        
        try:
            # 2. Use the addon's operator to assign the image
            # This automatically finds the JSON and creates the panels
            bpy.ops.pseg.assign_image(filepath=img_path)
            
            # 3. Use the addon's operator to save the scene
            # This automatically formats the name (e.g., Panel012-segmented with addon.blend)
            bpy.ops.pseg.save_scene()
            
            processed_count += 1
            print(f"Successfully processed {os.path.basename(img_path)}")
            
        except Exception as e:
            print(f"Error processing {os.path.basename(img_path)}: {str(e)}")
            
    print(f"\nBatch processing complete! Successfully generated {processed_count} .blend files.")


if __name__ == "__main__":
    # If running from command line, parse arguments
    if "--" in sys.argv:
        argv = sys.argv[sys.argv.index("--") + 1:]
        parser = argparse.ArgumentParser()
        parser.add_argument("-f", "--folder", dest="folder", help="Folder containing images and JSONs", required=True)
        args = parser.parse_args(argv)
        
        process_folder(args.folder)
    else:
        # If running from inside Blender's text editor, you can hardcode the path here
        # Change this path to the folder you want to process
        DEFAULT_FOLDER = r"C:\Users\maart\Github_may_be_deleted_sync_first\LikeDust_Part2\images\Images from PDF - large"
        process_folder(DEFAULT_FOLDER)