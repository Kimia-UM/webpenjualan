import os
from PIL import Image

def generate_icons():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = os.path.join(base_dir, 'public', 'icons')
    source_path = os.path.join(icons_dir, 'icon-512x512.png')
    
    if not os.path.exists(source_path):
        print(f"Error: Source icon not found at {source_path}")
        return
        
    img = Image.open(source_path)
    
    # 1. Generate standard resized icons
    sizes = [72, 96, 128, 144, 152, 192, 256, 384]
    for size in sizes:
        dest_path = os.path.join(icons_dir, f'icon-{size}x{size}.png')
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(dest_path, 'PNG')
        print(f"Generated: {dest_path}")
        
    # 2. Generate maskable icon (512x512 with a safe padding)
    # Maskable icons need a safe zone where the logo is in the center
    # safe zone is a circle with diameter 80% of the image size
    # We will resize the source icon to 384x384 (75%) and place it on #0B0E1A background
    maskable_size = 512
    logo_size = int(maskable_size * 0.75) # 384
    
    # Create background
    bg_color = (11, 14, 26) # #0B0E1A
    maskable_img = Image.new('RGBA', (maskable_size, maskable_size), bg_color)
    
    # Resize original logo to 384x384
    resized_logo = img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Center logo on background
    offset = (maskable_size - logo_size) // 2
    
    # Paste logo using alpha channel as mask if transparent
    if resized_logo.mode == 'RGBA':
        maskable_img.paste(resized_logo, (offset, offset), resized_logo)
    else:
        maskable_img.paste(resized_logo, (offset, offset))
        
    maskable_path = os.path.join(icons_dir, 'icon-maskable-512x512.png')
    # Save as PNG
    maskable_img.convert('RGB').save(maskable_path, 'PNG')
    print(f"Generated Maskable Icon: {maskable_path}")
    
    # 3. Save copy for apple-touch-icon.png
    apple_path = os.path.join(base_dir, 'public', 'apple-touch-icon.png')
    resized_apple = img.resize((192, 192), Image.Resampling.LANCZOS)
    resized_apple.save(apple_path, 'PNG')
    print(f"Generated Apple Touch Icon: {apple_path}")

if __name__ == '__main__':
    generate_icons()
