import glob, re

files = glob.glob('frontend/faculty/*.html') + glob.glob('frontend/admin/*.html') + glob.glob('frontend/hod/*.html')
issues = []

for f in files:
    with open(f, encoding='utf-8', errors='ignore') as fp:
        content = fp.read()
    onclicks = re.findall(r'onclick=["\'](\w+)\(', content)
    iife = '(async ()' in content
    if iife and onclicks:
        safe = {'Modal','Toast','Auth','DB','confirm','alert','console'}
        unexposed = [fn for fn in set(onclicks) if ('window.' + fn) not in content and fn not in safe]
        if unexposed:
            issues.append((f, sorted(unexposed)))

if not issues:
    print("ALL CLEAR — No scope bugs found!")
else:
    for fname, fns in issues:
        print(f"ISSUE in {fname}: {fns}")
