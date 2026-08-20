import sqlite3
conn = sqlite3.connect('C:/Users/LOQ/OneDrive/Desktop/AI_OBE_System/backend/obe_system.db')
cursor = conn.cursor()
cursor.execute("DELETE FROM users WHERE email IN ('12@gmail.com', 'trial.hod@mitaoe.ac.in')")
print('Deleted:', cursor.rowcount)
conn.commit()
conn.close()
