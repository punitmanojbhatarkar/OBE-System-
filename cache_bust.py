import os
import re

for root, dirs, files in os.walk('frontend'):
    for file in files:
        if file.endswith('.html'):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = re.sub(r'data\.js\?v=\d+', 'data.js?v=99', content)
            new_content = re.sub(r'api\.js\?v=\d+', 'api.js?v=99', new_content)
            
            if new_content != content:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print('Cache busted:', path)
