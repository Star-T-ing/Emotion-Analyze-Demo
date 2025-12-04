import sys
import os

# 将backend/目录临时添加到Python的搜索路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal, Base
from sqlalchemy.orm import Session
# 在这里导入你 app/models/__init__.py 中定义的所有模型,触发所有模型类向 Base.metadata 的注册过程。
from app import models

def clear_all_data(db: Session):
    print("警告：即将删除所有表中的数据！")
    
    # 倒序删除，以处理外键约束
    # 现在，因为上面的导入，Base.metadata.sorted_tables 将不再为空
    for table in reversed(Base.metadata.sorted_tables):
        print(f"正在清空表: {table.name}...")
        db.execute(table.delete())
        
    db.commit()
    print("所有数据已清空。")

if __name__ == "__main__":
    print("正在连接到数据库...")
    db = SessionLocal()
    try:
        clear_all_data(db)
    finally:
        db.close()
        print("数据库连接已关闭。")