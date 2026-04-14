import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

async def inspect():
    root_dir = Path(__file__).parent.parent
    load_dotenv(root_dir / ".env")
    
    mongo_uri = os.getenv("MONGO_URI")
    client = AsyncIOMotorClient(mongo_uri)
    db = client["campustoolkit"] # Manually set to match .env
    
    otp_id = "2b70df72-2fcd-445f-95ca-cb56c9e9fb5c"
    session = await db.otp_sessions.find_one({"id": otp_id})
    print(f"Session in 'campustoolkit': {session}")
    
    if session is None:
        # Check overall otp_sessions count
        count = await db.otp_sessions.count_documents({})
        print(f"Total sessions: {count}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(inspect())
