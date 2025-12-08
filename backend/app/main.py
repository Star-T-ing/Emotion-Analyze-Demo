from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import analysis, profiles

app = FastAPI(title="情感分析演示系统后端")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|\[::1\])(\:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Analysis"])
app.include_router(profiles.router, prefix="/api/v1/profiles", tags=["Profiles"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Empathy Understanding Demo API"}