from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_instance = MongoDB()

async def connect_to_mongo():
    db_instance.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_instance.db = db_instance.client[settings.DB_NAME]
    print(f"DEBUG: MongoDB Connected to DB: '{settings.DB_NAME}'")

async def close_mongo_connection():
    if db_instance.client:
        db_instance.client.close()

def get_database():
    return db_instance.db
