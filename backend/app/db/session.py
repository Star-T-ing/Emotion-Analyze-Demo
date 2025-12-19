import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def json_serializer(obj):
    return json.dumps(obj, ensure_ascii=False)

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    json_serializer=json_serializer
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()