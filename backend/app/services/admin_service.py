async def build_admin_stats(db):
    papers_count = await db.papers.count_documents({})
    faculty_count = await db.faculty_profiles.count_documents({})
    appointments_count = await db.appointments.count_documents({"otp_verified": True})
    pending_appointments_count = await db.appointments.count_documents(
        {
            "otp_verified": True,
            "appointment_status": "pending",
        }
    )

    return {
        "papers_count": papers_count,
        "faculty_count": faculty_count,
        "appointments_count": appointments_count,
        "pending_appointments_count": pending_appointments_count,
    }
