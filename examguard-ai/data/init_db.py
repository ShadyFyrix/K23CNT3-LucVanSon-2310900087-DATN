import psycopg2

def init_database():
    with open('data/schema_enterprise_attendance.sql', 'r', encoding='utf-8') as f:
        sql = f.read()

    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='123456',
        dbname='postgres'
    )
    cur = conn.cursor()
    cur.execute(sql)
    conn.commit()
    print("✅ SQL Schema applied successfully!")

    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    tables = cur.fetchall()
    print("📋 Real PostgreSQL Tables:", [t[0] for t in tables])
    cur.close()
    conn.close()

if __name__ == '__main__':
    init_database()
