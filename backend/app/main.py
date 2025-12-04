from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import analysis, profiles

app = FastAPI(title="共情理解演示系统后端")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])
app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["Profiles"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Empathy Understanding Demo API"}