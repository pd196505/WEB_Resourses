import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

# ============================================================
# ПАРАМЕТРЫ ПОДКЛЮЧЕНИЯ (общие для всех схем)
# ============================================================
DB_HOST     = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT     = os.getenv("DB_PORT", "5432")
DB_NAME     = os.getenv("DB_NAME", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "123")

_SCHEMA_RE = re.compile(r"^tlk(\d{2})$")


def schema_to_role(schema: str) -> str:
    """tlk01 -> stud01, tlk12 -> stud12."""
    if not schema:
        raise ValueError("Пустое имя схемы")
    m = _SCHEMA_RE.match(schema)
    if not m:
        raise ValueError(f"Некорректная схема: {schema}. Ожидается tlkNN.")
    return f"stud{m.group(1)}"


def _connect(schema: str, use_dict_cursor: bool):
    """
    Подключение к БД от имени владельца схемы (studNN).
    search_path = tlkNN, public уже задан через ALTER ROLE в CreateShemas.sql,
    поэтому в SQL пишем имена таблиц без префикса схемы.
    """
    role = schema_to_role(schema)
    params = dict(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=role,
        password=DB_PASSWORD,
    )
    if use_dict_cursor:
        params["cursor_factory"] = RealDictCursor

    try:
        conn = psycopg2.connect(**params)
    except psycopg2.OperationalError as e:
        raise RuntimeError(
            f"Не удалось подключиться к схеме '{schema}' как '{role}': {e}"
        ) from e

    conn.autocommit = True
    return conn


def get_db_connection(schema: str):
    """Обычное подключение (для записи)."""
    return _connect(schema, use_dict_cursor=False)


def get_db_connection_dict(schema: str):
    """Подключение с RealDictCursor (для чтения)."""
    return _connect(schema, use_dict_cursor=True)