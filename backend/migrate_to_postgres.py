"""
migrate_to_postgres.py
Automated database creator and data migration tool from SQLite to PostgreSQL.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

def ensure_postgres_db():
    import psycopg2
    from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
    from urllib.parse import urlparse, unquote

    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/obe_db")
    parsed = urlparse(db_url)
    
    user = parsed.username or "postgres"
    password = unquote(parsed.password) if parsed.password else "postgres"
    host = parsed.hostname or "localhost"
    port = parsed.port or 5433
    dbname = parsed.path.lstrip("/") or "obe_db"

    print(f"[*] Checking PostgreSQL connection at {host}:{port} with user '{user}'...")
    try:
        # Connect to default postgres DB first to create target DB if missing
        conn = psycopg2.connect(
            user=user,
            password=password,
            host=host,
            port=port,
            dbname="postgres"
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{dbname}'")
        exists = cursor.fetchone()
        if not exists:
            print(f"[*] Database '{dbname}' not found. Creating database '{dbname}'...")
            cursor.execute(f"CREATE DATABASE {dbname}")
            print(f"[+] Database '{dbname}' successfully created.")
        else:
            print(f"[+] Database '{dbname}' already exists.")
            
        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"[!] PostgreSQL Connection Error: {e}")
        print("\nPlease ensure PostgreSQL is running and check your password in backend/.env:")
        print(f"Current DATABASE_URL: {db_url}")
        return False

def migrate_data():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    import models
    from database import Base, DEFAULT_SQLITE_PATH

    print("\n[*] Initializing SQLAlchemy schema on PostgreSQL...")
    db_url = os.getenv("DATABASE_URL")
    pg_engine = create_engine(db_url, pool_pre_ping=True)
    
    # Create all tables
    models.Base.metadata.create_all(bind=pg_engine)
    print("[+] All PostgreSQL database tables created successfully.")

    if not os.path.exists(DEFAULT_SQLITE_PATH):
        print(f"[*] No existing SQLite database found at {DEFAULT_SQLITE_PATH}. Initial schema is ready.")
        return

    print(f"\n[*] Found existing SQLite database at {DEFAULT_SQLITE_PATH}. Migrating records to PostgreSQL...")
    sqlite_engine = create_engine(f"sqlite:///{DEFAULT_SQLITE_PATH}")
    
    SqliteSession = sessionmaker(bind=sqlite_engine)
    PgSession = sessionmaker(bind=pg_engine)
    
    sqlite_db = SqliteSession()
    pg_db = PgSession()

    # Ordered table model list to respect foreign key constraints
    model_order = [
        models.Department,
        models.User,
        models.Config,
        models.Course,
        models.CourseOutcome,
        models.PoMapping,
        models.Student,
        models.IAQuestion,
        models.MarksIA,
        models.MarksMSE,
        models.MarksESE,
        models.Survey,
        models.Assignment,
        models.Syllabus,
        models.IndicatorMapping,
        models.Remedial,
        models.Target,
        models.AuditLog,
        models.ActionPlan,
    ]

    total_migrated = 0
    try:
        for model in model_order:
            table_name = model.__tablename__
            records = sqlite_db.query(model).all()
            if not records:
                continue

            print(f"  -> Migrating {len(records)} records for table '{table_name}'...")
            for record in records:
                data = {c.name: getattr(record, c.name) for c in record.__table__.columns}
                pk_name = list(model.__table__.primary_key.columns)[0].name
                pk_val = getattr(record, pk_name)
                existing = pg_db.query(model).filter(getattr(model, pk_name) == pk_val).first()
                if not existing:
                    pg_db.add(model(**data))
                    total_migrated += 1
            pg_db.commit()
            
        print(f"\n[+] Data migration completed successfully! ({total_migrated} records copied to PostgreSQL).")
    except Exception as e:
        pg_db.rollback()
        print(f"[!] Migration warning/error: {e}")
    finally:
        sqlite_db.close()
        pg_db.close()

if __name__ == "__main__":
    if ensure_postgres_db():
        migrate_data()
        print("\n========================================================")
        print("  PostgreSQL Migration Complete!")
        print("  You can now start your backend with: python main.py")
        print("========================================================")
    else:
        sys.exit(1)
