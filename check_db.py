import sqlite3
conn = sqlite3.connect('C:/Users/LOQ/OneDrive/Desktop/AI_OBE_System/obe_system.db')
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(tables)
for t in tables:
    name = t[0]
    cursor.execute(f"SELECT COUNT(*) FROM {name}")
    print(name, cursor.fetchone()[0])
conn.close()
