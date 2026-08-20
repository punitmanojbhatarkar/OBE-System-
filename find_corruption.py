
with open('backend/agents/ai_logic.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'COPO CACHE HIT' in line:
        print(f'cache_hit at line {i+1}')
    if 'return _COPO_CACHE' in line:
        print(f'cache return at line {i+1}')
    if 'O2\": 1, \"PSO3' in line:
        print(f'trailing garbage at line {i+1}: {repr(line)}')
    if 'llm = get_llm' in line:
        print(f'llm= at line {i+1}: {repr(line)}')
    if 'template = """' in line:
        print(f'template= at line {i+1}')
