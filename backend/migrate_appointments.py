import motor.motor_asyncio
import asyncio
import os
from dotenv import load_dotenv

# Load config
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "campustoolkit")

async def run_migration():
    print(f"Connecting to {MONGO_URI}...")
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    # Rename rejection_reason to faculty_message in all existing appointments
    result = await db.appointments.update_many(
        {"rejection_reason": {"$exists": True}},
        {"$rename": {"rejection_reason": "faculty_message"}}
    )
    
    print(f"✅ Migration Complete!")
    print(f"Matched: {result.matched_count} records")
    print(f"Modified: {result.modified_count} records")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
