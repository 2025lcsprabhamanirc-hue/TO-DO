
from contextlib import asynccontextmanager
from pathlib import Path
import sqlite3

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from app.database import get_connection, init_db


BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="My TO_DO",
    version="1.0.0",
    lifespan=lifespan,
)


app.mount(
    "/static",
    StaticFiles(directory=str(FRONTEND_DIR)),
    name="static",
)


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=280)


def serialize_task(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "completed": bool(row["completed"]),
    }


@app.get("/")
def home():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api/tasks")
def get_tasks():
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, title, completed FROM tasks ORDER BY id DESC"
        ).fetchall()

    return [serialize_task(row) for row in rows]


@app.post("/api/tasks", status_code=201)
def create_task(task: TaskCreate):
    title = task.title.strip()

    if not title:
        raise HTTPException(
            status_code=422,
            detail="Task cannot be empty"
        )

    with get_connection() as connection:
        cursor = connection.execute(
            "INSERT INTO tasks (title) VALUES (?)",
            (title,)
        )

        row = connection.execute(
            "SELECT id, title, completed FROM tasks WHERE id = ?",
            (cursor.lastrowid,)
        ).fetchone()

    return serialize_task(row)


@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int):
    with get_connection() as connection:
        cursor = connection.execute(
            "DELETE FROM tasks WHERE id = ?",
            (task_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Task not found"
            )

    return {"message": "Task deleted successfully"}
