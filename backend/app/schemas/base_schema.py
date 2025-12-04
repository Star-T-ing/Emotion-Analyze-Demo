    
from pydantic import BaseModel

class BaseSchema(BaseModel):
    class Config:
        orm_mode = True # 让 Pydantic 模型可以从 SQLAlchemy 模型转换而来
        from_attributes = True # v2 Pydantic 的推荐用法

  