import py_compile, re

file_path = 'C:/Users/LOQ/OneDrive/Desktop/AI_OBE_System/backend/agents/ai_logic.py'

try:
    py_compile.compile(file_path, doraise=True)
    print("SUCCESS: File compiles without errors!")
except py_compile.PyCompileError as e:
    err = str(e)
    m = re.search(r'line (\d+)', err)
    if m:
        lineno = int(m.group(1))
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        print(f"Error at line {lineno}: {err[:200]}")
        print("\nContext:")
        for i in range(max(0, lineno-5), min(len(lines), lineno+3)):
            print(f"  {i+1}: {repr(lines[i][:120])}")
    else:
        print(f"Error: {err[:400]}")
