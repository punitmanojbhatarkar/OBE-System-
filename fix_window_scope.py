"""
Fix all onclick-scope bugs across the OBE System.
For each file with an async IIFE that has inline onclick handlers not on window,
inject `window.fnName = fnName;` lines just before the closing `})();` of the IIFE.
"""
import glob, re

files = glob.glob('frontend/faculty/*.html') + glob.glob('frontend/admin/*.html') + glob.glob('frontend/hod/*.html')

SAFE = {'Modal','Toast','Auth','DB','confirm','alert','console','document','window','location',
        'sessionStorage','localStorage','parseInt','parseFloat','String','Number','Array','Object'}

fixed = 0

for fpath in files:
    with open(fpath, encoding='utf-8', errors='ignore') as fp:
        content = fp.read()

    onclicks = re.findall(r'onclick=["\'](\w+)\(', content)
    iife = '(async ()' in content
    if not iife or not onclicks:
        continue

    unexposed = sorted(set([
        fn for fn in onclicks 
        if ('window.' + fn) not in content and fn not in SAFE
    ]))
    if not unexposed:
        continue

    # Build the window assignment block
    assignments = '\n  // Auto-exposed: onclick handlers need to be on window\n'
    assignments += '\n'.join(f'  window.{fn} = {fn};' for fn in unexposed)
    assignments += '\n'

    # Insert just before the last `})();` in the file
    # Find the last occurrence of })(); that closes the async IIFE
    pattern = r'(\}\)\(\);)'
    matches = list(re.finditer(pattern, content))
    if not matches:
        print(f"  SKIP (no IIFE closing found): {fpath}")
        continue

    last_match = matches[-1]
    insert_pos = last_match.start()
    new_content = content[:insert_pos] + assignments + content[insert_pos:]

    with open(fpath, 'w', encoding='utf-8') as fp:
        fp.write(new_content)
    print(f"  FIXED {len(unexposed)} functions in: {fpath}")
    print(f"         -> {unexposed}")
    fixed += 1

print(f"\nTotal files fixed: {fixed}")
