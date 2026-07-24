#!/bin/bash
# scripts/seed_demo_data.sh - 插入演示数据脚本

set -e

echo "🌱 开始插入演示数据..."

# 数据库连接信息
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-admin}"
DB_PASSWORD="${DB_PASSWORD:-changeme}"
DB_NAME="${DB_NAME:-suzuran_cloud}"

export PGPASSWORD="$DB_PASSWORD"

# 执行 SQL 文件
echo "📝 执行 SQL 文件: docs/sql/seed_demo_data.sql"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f docs/sql/seed_demo_data.sql

echo ""
echo "✅ 演示数据插入完成！"
echo ""
echo "📋 演示账户信息："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏢 服务商管理员（Provider）"
echo "   手机号: 13800138000"
echo "   密码: password123"
echo "   角色: 服务商管理员"
echo ""
echo "🛡️ 租户管理员（Tenant Admin）"
echo "   手机号: 13800138001"
echo "   密码: password123"
echo "   角色: 租户管理员"
echo ""
echo "👤 普通用户（User）"
echo "   手机号: 13800138002"
echo "   密码: password123"
echo "   角色: 普通用户"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 提示: 使用以上账户登录前端进行测试"

unset PGPASSWORD
