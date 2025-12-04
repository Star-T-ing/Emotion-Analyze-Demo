# 数据库表建立好后，初始化数据库中的数据（目前只有添加默认用户）
import sys
import os

# 将backend/目录临时添加到Python的搜索路径，以便能导入app模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.db.session import SessionLocal, Base, engine
from app.models.user_model import User

db = SessionLocal()

# 检查用户是否已存在
db_user = db.query(User).filter(User.user_id == 'xiaoA-default-user-id-12345').first()

if not db_user:
    user_a = User(user_id='xiaoA-default-user-id-12345', username='小A')
    db.add(user_a)
    db.commit()
    print("用户 '小A' 已成功创建。")
else:
    print("用户 '小A' 已存在。")

db.close()