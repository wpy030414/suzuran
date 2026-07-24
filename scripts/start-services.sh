#!/bin/bash
# scripts/start-services.sh - 一键启动所有后端依赖服务

set -e

echo "🚀 开始启动 Suzuran Cloud 后端服务..."
echo ""

# 检查 PostgreSQL 是否已安装
if command -v psql &>/dev/null; then
    echo "✅ PostgreSQL 已安装"

    # 启动 PostgreSQL
    echo "📦 启动 PostgreSQL..."
    brew services start postgresql@16 2>/dev/null || true

    # 等待 PostgreSQL 就绪
    echo "⏳ 等待 PostgreSQL 就绪..."
    for i in {1..30}; do
        if pg_isready &>/dev/null; then
            echo "✅ PostgreSQL 已就绪"
            break
        fi
        sleep 1
    done
else
    echo "❌ PostgreSQL 未安装，正在安装..."
    brew install postgresql@16
    brew services start postgresql@16
fi

# 检查 Redis 是否已安装
if command -v redis-server &>/dev/null; then
    echo "✅ Redis 已安装"

    # 启动 Redis
    echo "📦 启动 Redis..."
    brew services start redis 2>/dev/null || true

    # 等待 Redis 就绪
    echo "⏳ 等待 Redis 就绪..."
    for i in {1..30}; do
        if redis-cli ping &>/dev/null; then
            echo "✅ Redis 已就绪"
            break
        fi
        sleep 1
    done
else
    echo "❌ Redis 未安装，正在安装..."
    brew install redis
    brew services start redis
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 所有服务已启动！"
echo ""
echo "📋 服务信息："
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 插入演示数据
echo "🌱 是否要插入演示数据？(y/n)"
read -r response
if [[ "$response" =~ ^[yY]$ ]]; then
    cd "$(dirname "$0")/.."
    ./scripts/seed_demo_data.sh
fi

echo ""
echo "💡 提示：现在可以启动后端服务器了"
echo "   cd backend && go run cmd/api/main.go"
echo ""
