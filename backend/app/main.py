from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.router import api_router

app = FastAPI(
    title="Road Scan API",
    version="1.0.0",
    description="FastAPI backend for road damage computer vision modules.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/v1/placeholders/{filename}")
async def serve_placeholder_image(filename: str):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "static", "placeholders", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Image {filename} not found at {file_path}")
        
    return FileResponse(file_path)

app.include_router(api_router, prefix="/api/v1")

# Mount static files directory
static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
