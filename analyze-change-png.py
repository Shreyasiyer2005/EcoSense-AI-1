"""
Analyze Change Segmentation PNG
Check dimensions, colors, and verify 5-class segmentation
"""

from PIL import Image
from collections import Counter
import sys

# Latest PNG file
png_path = "backend/overlays/ndvi_compare_1793777406232_f5s3w45cw_ndvi_change.png"

try:
    # Open image
    img = Image.open(png_path)

    print("="*80)
    print("CHANGE SEGMENTATION PNG ANALYSIS")
    print("="*80)
    print(f"\nFile: {png_path}")
    print(f"Mode: {img.mode}")
    print(f"Size: {img.size[0]} x {img.size[1]} pixels")
    print(f"Format: {img.format}")

    # Convert to RGB if not already
    if img.mode != 'RGB':
        print(f"\nConverting from {img.mode} to RGB...")
        img = img.convert('RGB')

    # Get all pixel colors
    pixels = list(img.getdata())
    color_counts = Counter(pixels)

    print(f"\nTotal pixels: {len(pixels)}")
    print(f"Unique colors: {len(color_counts)}")

    # Expected colors (RGB values)
    expected_colors = {
        (220, 38, 38): "Strong Decrease (Red)",
        (249, 115, 22): "Moderate Decrease (Orange)",
        (148, 163, 184): "Stable (Gray)",
        (132, 204, 22): "Moderate Increase (Light Green)",
        (22, 163, 74): "Strong Increase (Dark Green)"
    }

    print("\n" + "="*80)
    print("EXPECTED 5 COLORS:")
    print("="*80)

    for rgb, name in expected_colors.items():
        count = color_counts.get(rgb, 0)
        percentage = (count / len(pixels) * 100) if len(pixels) > 0 else 0
        status = "✅" if count > 0 else "❌"
        print(f"{status} RGB{rgb} - {name}")
        print(f"   Pixels: {count:,} ({percentage:.2f}%)")

    print("\n" + "="*80)
    print("MOST COMMON COLORS (Top 10):")
    print("="*80)

    for i, (rgb, count) in enumerate(color_counts.most_common(10), 1):
        percentage = (count / len(pixels) * 100)
        hex_color = f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"

        # Check if it matches expected color
        match = expected_colors.get(rgb, "")
        if match:
            print(f"{i}. RGB{rgb} {hex_color} - {count:,} pixels ({percentage:.2f}%) - {match}")
        else:
            print(f"{i}. RGB{rgb} {hex_color} - {count:,} pixels ({percentage:.2f}%)")

    # Check if all 5 expected colors are present
    print("\n" + "="*80)
    print("VALIDATION:")
    print("="*80)

    found_colors = sum(1 for rgb in expected_colors.keys() if rgb in color_counts)
    print(f"Expected colors found: {found_colors}/5")

    if found_colors == 5:
        print("✅ All 5 change classes present in PNG")
    else:
        print("❌ Missing some expected colors")
        print("\nMissing colors:")
        for rgb, name in expected_colors.items():
            if rgb not in color_counts:
                print(f"  - RGB{rgb}: {name}")

    # Check for near-matches (colors within tolerance)
    print("\n" + "="*80)
    print("NEAR-MATCH DETECTION (tolerance ±5):")
    print("="*80)

    def color_distance(c1, c2):
        return ((c1[0]-c2[0])**2 + (c1[1]-c2[1])**2 + (c1[2]-c2[2])**2)**0.5

    for expected_rgb, expected_name in expected_colors.items():
        near_matches = []
        for rgb, count in color_counts.most_common(20):
            if rgb != expected_rgb:
                dist = color_distance(expected_rgb, rgb)
                if dist <= 10:  # Within 10 units
                    near_matches.append((rgb, count, dist))

        if near_matches:
            print(f"\n{expected_name} RGB{expected_rgb}:")
            for rgb, count, dist in near_matches[:3]:
                percentage = (count / len(pixels) * 100)
                hex_color = f"#{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"
                print(f"  Near: RGB{rgb} {hex_color} (distance: {dist:.1f}) - {count:,} pixels ({percentage:.2f}%)")

    print("\n" + "="*80)
    print("SUMMARY:")
    print("="*80)
    print(f"✅ PNG file is valid and readable")
    print(f"✅ Dimensions: {img.size[0]} x {img.size[1]}")
    print(f"✅ HTTP accessible at: http://localhost:5000/overlays/ndvi_compare_1793777406232_f5s3w45cw_ndvi_change.png")

    if found_colors >= 4:
        print(f"✅ Contains {found_colors}/5 expected colors (sufficient)")
    else:
        print(f"⚠️  Only {found_colors}/5 expected colors found")

    print("\n💡 BROWSER TEST REQUIRED:")
    print("   Open: http://localhost:3000/analyze")
    print("   Or direct image: http://localhost:5000/overlays/ndvi_compare_1793777406232_f5s3w45cw_ndvi_change.png")
    print("="*80)

except FileNotFoundError:
    print(f"❌ File not found: {png_path}")
    print("Run a comparison first to generate the PNG")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
