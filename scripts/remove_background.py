import os
from PIL import Image
from collections import deque

def remove_bg_flood_fill(img_path, output_path, tolerance=20):
    print(f"Processing: {img_path} -> {output_path}")
    if not os.path.exists(img_path):
        print(f"Error: File not found {img_path}")
        return
        
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()
    
    # Target color is white
    target_color = (255, 255, 255)
    
    visited = set()
    queue = deque()
    
    # Add all border pixels that match the target color (white)
    for x in range(width):
        for y in [0, height - 1]:
            r, g, b, a = pixels[x, y]
            if abs(r - 255) <= tolerance and abs(g - 255) <= tolerance and abs(b - 255) <= tolerance:
                queue.append((x, y))
                visited.add((x, y))
    for y in range(height):
        for x in [0, width - 1]:
            if (x, y) not in visited:
                r, g, b, a = pixels[x, y]
                if abs(r - 255) <= tolerance and abs(g - 255) <= tolerance and abs(b - 255) <= tolerance:
                    queue.append((x, y))
                    visited.add((x, y))
                    
    # BFS to find and convert all connected background pixels
    count = 0
    while queue:
        cx, cy = queue.popleft()
        # Set background pixel to transparent white
        pixels[cx, cy] = (255, 255, 255, 0)
        count += 1
        
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                r, g, b, a = pixels[nx, ny]
                if abs(r - 255) <= tolerance and abs(g - 255) <= tolerance and abs(b - 255) <= tolerance:
                    queue.append((nx, ny))
                    visited.add((nx, ny))
                    
    img.save(output_path, "PNG")
    print(f"Done! Converted {count} pixels to transparent.")

if __name__ == "__main__":
    # Paths to the logos
    img_utama = "public/images/logoutama.png"
    img_horizontal = "public/images/logohorizontal.png"
    
    remove_bg_flood_fill(img_utama, img_utama)
    remove_bg_flood_fill(img_horizontal, img_horizontal)
