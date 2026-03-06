import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "gyms.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"
SEED_PATH = BASE_DIR / "seed.sql"


PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_columns(conn: sqlite3.Connection) -> None:
    columns = {
        row["name"] for row in conn.execute("PRAGMA table_info(gyms)").fetchall()
    }

    if "image_url" not in columns:
        conn.execute("ALTER TABLE gyms ADD COLUMN image_url TEXT")
    if "email" not in columns:
        conn.execute("ALTER TABLE gyms ADD COLUMN email TEXT")
    if "hours_info" not in columns:
        conn.execute("ALTER TABLE gyms ADD COLUMN hours_info TEXT")


def init_db(seed: bool = False) -> None:
    conn = get_connection()
    with open(SCHEMA_PATH, "r", encoding="utf-8") as schema_file:
        conn.executescript(schema_file.read())

    _ensure_columns(conn)

    if seed:
        has_rows = conn.execute("SELECT COUNT(1) AS total FROM gyms").fetchone()["total"]
        if has_rows == 0:
            with open(SEED_PATH, "r", encoding="utf-8") as seed_file:
                conn.executescript(seed_file.read())

    conn.commit()
    conn.close()


def list_disciplines() -> list[str]:
    conn = get_connection()
    rows = conn.execute("SELECT DISTINCT discipline FROM gyms ORDER BY discipline").fetchall()
    conn.close()
    return [row["discipline"] for row in rows]


def create_gym(payload: dict) -> int:
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO gyms (
            name,
            discipline,
            address,
            city,
            phone,
            email,
            website,
            image_url,
            hours_info
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            payload["name"].strip(),
            payload["discipline"].strip(),
            payload["address"].strip(),
            payload["city"].strip(),
            payload.get("phone", "").strip() or None,
            payload.get("email", "").strip() or None,
            payload.get("website", "").strip() or None,
            payload.get("image_url", "").strip() or None,
            payload["hours_info"].strip(),
        ),
    )
    conn.commit()
    new_id = int(cursor.lastrowid)
    conn.close()
    return new_id


def search_gyms(
    discipline: str | None = None,
    query: str | None = None,
) -> list[dict]:
    conn = get_connection()

    base_sql = """
        SELECT
            g.id,
            g.name,
            g.discipline,
            g.address,
            g.city,
            g.phone,
            g.email,
            g.website,
            g.image_url,
            g.hours_info
        FROM gyms g
        WHERE 1=1
    """

    params: list[object] = []

    if discipline:
        base_sql += " AND g.discipline = ?"
        params.append(discipline)

    if query:
        base_sql += """
            AND (
                LOWER(g.name) LIKE ?
                OR LOWER(g.address) LIKE ?
                OR LOWER(g.city) LIKE ?
                OR LOWER(g.discipline) LIKE ?
            )
        """
        q = f"%{query.lower()}%"
        params.extend([q, q, q, q])

    base_sql += " ORDER BY g.city, g.name"

    gyms = conn.execute(base_sql, params).fetchall()

    gym_list: list[dict] = []
    for gym in gyms:
        gym_list.append(
            {
                "id": gym["id"],
                "name": gym["name"],
                "discipline": gym["discipline"],
                "address": gym["address"],
                "city": gym["city"],
                "phone": gym["phone"],
                "email": gym["email"],
                "website": gym["website"],
                "image_url": gym["image_url"] or PLACEHOLDER_IMAGE,
                "hours_info": gym["hours_info"] or "Orari non specificati",
            }
        )

    conn.close()
    return gym_list
