import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    """Возвращает стандартное подключение к БД"""
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "10.2.9.17"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "tlk_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres")
    )
    return conn

def get_db_connection_dict():
    """Возвращает подключение к БД с курсором, возвращающим словари (RealDictCursor)"""
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "10.2.9.17"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "tlk_db"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
        cursor_factory=RealDictCursor
    )
    return conn