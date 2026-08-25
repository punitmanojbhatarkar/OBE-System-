"""
Safe migration: Add new columns to existing 'assignments' table.
- Never drops or modifies any existing column.
- Never touches your saved data.
- Skips columns that already exist.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'obe_system.db')

# New columns we want to add: (name, type, default)
NEW_COLUMNS = [
    ("type",        "VARCHAR",  "'assignment'"),
    ("no",          "INTEGER",  "1"),
    ("description", "TEXT",     "NULL"),
    ("dueDate",     "VARCHAR",  "NULL"),
    ("rbtLevel",    "VARCHAR",  "NULL"),
    ("coNos",       "TEXT",     "NULL"),
    ("rubrics",     "TEXT",     "NULL"),
    ("aiGenerated", "BOOLEAN",  "0"),
]

db = sqlite3.connect(DB_PATH)

# Get current columns
existing = [row[1] for row in db.execute("PRAGMA table_info(assignments)").fetchall()]
print(f"[migrate] Current columns: {existing}")

added = []
skipped = []
for col_name, col_type, default in NEW_COLUMNS:
    if col_name in existing:
        skipped.append(col_name)
    else:
        sql = f"ALTER TABLE assignments ADD COLUMN {col_name} {col_type} DEFAULT {default}"
        db.execute(sql)
        db.commit()
        added.append(col_name)
        print(f"[migrate] Added column: {col_name}")

db.close()

print(f"\n✅ Migration complete!")
print(f"   Added   : {added}")
print(f"   Skipped (already exist): {skipped}")
print(f"   Your existing data is untouched.")
