import cv2
import numpy as np
import json
import os

def detect_panels(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"Could not read {image_path}")
        return

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Threshold to find the black borders
    # The panels have black borders, surrounded by white gutters
    _, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY_INV)
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    panels = []
    h_img, w_img = img.shape[:2]
    
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        
        # Filter out small noise
        if w > 200 and h > 200 and w < w_img * 0.95 and h < h_img * 0.95:
            # refine the bounding box to be inside the black border
            # We can scan inwards from the bounding box to find the inner edge of the black border
            
            # Extract the ROI
            roi = gray[y:y+h, x:x+w]
            
            # Find the inner edge by looking for the transition from black to white (or non-black)
            # Actually, the user wants the line "very precisly on the inside of the black edge of the panel."
            # So we need to find the inner boundary of the black border.
            
            # Let's just use the bounding box of the black border, but shrink it by the border thickness.
            # To find border thickness, we can check the distance from the outer edge to the inner edge.
            
            # For now, let's just save the outer bounding box and we can refine it.
            panels.append({
                "x": x, "y": y, "w": w, "h": h
            })
            
    # Sort panels top-to-bottom, then left-to-right
    panels.sort(key=lambda p: (p['y'] // 100, p['x']))
    
    # Format for JSON
    json_panels = []
    for i, p in enumerate(panels):
        x, y, w, h = p['x'], p['y'], p['w'], p['h']
        
        # Refine: shrink by a few pixels to get inside the border
        # Let's do a more precise refinement
        # We can look at the row/col sums to find the exact border
        
        # ...
        
        # For now, let's just output the basic ones to see
        u0 = x / w_img
        v0 = 1.0 - ((y + h) / h_img)
        u1 = (x + w) / w_img
        v1 = 1.0 - (y / h_img)
        
        json_panels.append({
            "id": i + 1,
            "u0": round(u0, 6),
            "v0": round(v0, 6),
            "u1": round(u1, 6),
            "v1": round(v1, 6),
            "px": {
                "x": x,
                "y": y,
                "w": w,
                "h": h
            }
        })
        
    output = {
        "source_image": os.path.basename(image_path),
        "image_width": w_img,
        "image_height": h_img,
        "panels": json_panels
    }
    
    out_path = image_path.replace('.png', '.panels.json')
    with open(out_path, 'w') as f:
        json.dump(output, f, indent=2)
        
    print(f"Saved {len(panels)} panels to {out_path}")

detect_panels('../images/Images from PDF - large/image-0013.png')
