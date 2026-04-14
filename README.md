# Campus Toolkit

Campus Toolkit is a full-stack academic portal for students, faculty, and administrators. It combines previous-year paper management, a faculty directory, appointment booking with OTP verification, a faculty self-service dashboard, and an admin console for paper operations.

The primary project manual is available here:

- [Campus Toolkit Installation, Usage, and Maintenance Manual](docs/Campus-Toolkit-Manual.md)

## Quick Start

1. Configure the backend environment in `backend/.env`.
2. Configure the frontend environment in `frontend/.env`.
3. Start the API from `backend/` with `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`.
4. Start the frontend from `frontend/` with `npm start`.
5. Create the first admin from `backend/` with `python cli.py create-admin`.

## Project Structure

- `backend/` - FastAPI API, MongoDB access, OTP and auth services, CLI utilities
- `frontend/` - React application for students, faculty, and admins
- `tests/` - backend-focused automated tests
- `docs/` - operational and end-user documentation
