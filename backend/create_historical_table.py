import sqlite3
conn = sqlite3.connect('backend/obe_system.db')
c = conn.cursor()
try:
    c.execute('''
    CREATE TABLE IF NOT EXISTS historical_reports (
        id VARCHAR PRIMARY KEY,
        academicYear VARCHAR,
        courseId VARCHAR,
        courseName VARCHAR,
        reportData TEXT,
        timestamp VARCHAR
    )
    ''')
    conn.commit()
    print("Table created successfully")
except Exception as e:
    print(f"Error: {e}")
conn.close()
