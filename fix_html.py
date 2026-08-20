import os
for root, dirs, files in os.walk('frontend'):
    for file in files:
        if file.endswith('.html'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            if r'<script src="../scripts/ai-mock.js"></script>\n</body>' in content:
                content = content.replace(r'<script src="../scripts/ai-mock.js"></script>\n</body>', '</body>')
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print('Fixed', path)
