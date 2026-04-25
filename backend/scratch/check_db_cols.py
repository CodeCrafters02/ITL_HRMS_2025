import psycopg2
import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env', override=True)

try:
    conn = psycopg2.connect(
        dbname='hrms_db',
        user='postgres',
        password='1234',
        host='localhost',
        port='5432'
    )
    cur = conn.cursor()
    cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='app_loanapplication';")
    columns = [row[0] for row in cur.fetchall()]
    print(f"Columns in app_loanapplication: {columns}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
