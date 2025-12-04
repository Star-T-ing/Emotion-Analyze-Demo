from sqlalchemy import Column, String, TIMESTAMP, func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(String, primary_key=True, index=True)
    username = Column(String, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)