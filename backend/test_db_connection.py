import asyncio
import asyncpg

async def test():
    try:
        conn = await asyncpg.connect(
            'postgresql://postgres:Kushal07@localhost:5432/taxease_db'
        )
        print('✓ Connected to database OK')
        result = await conn.fetchval('SELECT 1')
        print(f'✓ Query test: {result}')
        await conn.close()
        return True
    except Exception as e:
        print(f'✗ Connection failed: {e}')
        return False

if __name__ == '__main__':
    success = asyncio.run(test())
    exit(0 if success else 1)
