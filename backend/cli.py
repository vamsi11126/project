import argparse
import asyncio
import getpass
from datetime import datetime, timezone

try:
    import typer
except ModuleNotFoundError:
    typer = None

from app.core.security import get_password_hash
from app.db.mongodb import close_mongo_connection, connect_to_mongo, db_instance
from app.models.schemas import Admin


async def _create_admin(email: str, name: str, password: str):
    normalized_email = email.strip().lower()
    normalized_name = name.strip()

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    await connect_to_mongo()
    try:
        existing_admin = await db_instance.db.admins.find_one({"email": normalized_email})
        if existing_admin:
            raise ValueError(f"Admin already exists for {normalized_email}.")

        admin = Admin(
            email=normalized_email,
            name=normalized_name,
            hashed_password=get_password_hash(password),
            created_at=datetime.now(timezone.utc),
        )
        await db_instance.db.admins.insert_one(admin.model_dump())
        print(f"Created admin {normalized_name} <{normalized_email}> with id {admin.id}.")
    finally:
        await close_mongo_connection()


def _prompt_for_admin_fields():
    email = input("Admin email: ").strip()
    name = input("Admin name: ").strip()
    password = getpass.getpass("Password: ")
    confirm_password = getpass.getpass("Confirm password: ")

    if password != confirm_password:
        raise ValueError("Passwords do not match.")

    return email, name, password


def _run_create_admin(email: str | None = None, name: str | None = None, password: str | None = None):
    if not email or not name or not password:
        email, name, password = _prompt_for_admin_fields()

    asyncio.run(_create_admin(email=email, name=name, password=password))


if typer:
    cli = typer.Typer(help="Campus Toolkit maintenance commands")

    @cli.command("create-admin")
    def create_admin(
        email: str = typer.Option(..., prompt=True),
        name: str = typer.Option(..., prompt=True),
        password: str = typer.Option(
            ...,
            prompt=True,
            hide_input=True,
            confirmation_prompt=True,
        ),
    ):
        _run_create_admin(email=email, name=name, password=password)


def _build_argparse_cli():
    parser = argparse.ArgumentParser(description="Campus Toolkit maintenance commands")
    subparsers = parser.add_subparsers(dest="command")

    create_admin_parser = subparsers.add_parser("create-admin", help="Create an admin account")
    create_admin_parser.add_argument("--email")
    create_admin_parser.add_argument("--name")
    create_admin_parser.add_argument("--password")

    return parser


def main():
    if typer:
        cli()
        return

    parser = _build_argparse_cli()
    args = parser.parse_args()

    if args.command == "create-admin":
        _run_create_admin(email=args.email, name=args.name, password=args.password)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
