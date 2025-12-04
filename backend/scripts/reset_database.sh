#!/bin/bash

# ==============================================================================
# reset_database.sh
#
# 功能:
#   1. 将数据库回滚到初始空白状态 (删除所有表)。
#   2. 删除所有已存在的 Alembic 版本历史脚本。
#   此脚本用于在彻底重新设计表结构时，从一个干净的起点开始，而无需重新配置 Alembic。
#
# 使用方法:
#   必须在项目的 'backend' 目录下执行此脚本。
#   例如: ./scripts/reset_database.sh
# ==============================================================================

# 任何命令执行失败，脚本将立即中止
set -e

# --- 1. 环境与路径检查 ---
if ! command -v alembic &> /dev/null; then
    echo "错误: 'alembic' 命令未找到。"
    echo "请先激活项目的 Conda 环境 (conda activate emotion_analyze) 再执行此脚本。"
    exit 1
fi

if [ ! -f "alembic.ini" ]; then
    echo "错误: 未找到 'alembic.ini' 文件。"
    echo "请确保您当前位于项目的 'backend' 目录下再执行此脚本。"
    exit 1
fi

# --- 2. 用户确认 ---
echo "警告：此操作将执行以下两项操作："
echo "  1. 删除数据库中的所有表和数据。"
echo "  2. 永久删除 alembic/versions/ 目录下的所有迁移历史脚本。"
echo "这是一个破坏性操作，用于开始全新的数据库设计。"
read -p "是否继续? (y/n) " -n 1 -r
echo # 移动到新行

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "操作已取消。"
    exit 1
fi

# --- 3. 执行核心逻辑 ---
echo "步骤 1/2: 正在将数据库回滚到 base 状态..."
alembic downgrade base

echo "步骤 2/2: 正在删除所有版本历史脚本..."
# 安全地删除 versions 目录下的所有 .py 文件
# a || b 结构确保即使没有文件匹配也不会报错
rm -f alembic/versions/*.py || true
rm -f alembic/versions/__pycache__/*.pyc || true

echo "--------------------------------------------------------"
echo "Alembic 历史已成功重置！"
echo "您现在可以重新设计 app/models/ 中的模型，并创建新的迁移。"