import os, glob

CORRUPTED = '></script>`r`n<script src="../scripts/api.js">'
FIXED     = '></script>\n<script src="../scripts/api.js?v=13">'

files = glob.glob('frontend/**/*.html', recursive=True)
fixed_count = 0

for fpath in files:
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    if CORRUPTED in content:
        new_content = content.replace(CORRUPTED, FIXED)
        # Also bump all old api.js references without version
        new_content = new_content.replace(
            '<script src="../scripts/api.js"></script>',
            '<script src="../scripts/api.js?v=13"></script>'
        )
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  FIXED: {fpath}")
        fixed_count += 1

print(f"\nTotal fixed: {fixed_count} files")
