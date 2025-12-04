from pydantic import BaseModel

class UserSchema(BaseModel):
    user_id: str
    username: str

    class Config:
        orm_mode = True