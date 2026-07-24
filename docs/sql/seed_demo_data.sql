-- docs/sql/seed_demo_data.sql
-- Suzuran Cloud 演示数据种子脚本

-- 清空现有数据（开发环境）
DELETE FROM org_user_bonds;
DELETE FROM users;
DELETE FROM orgs;

-- 重置序列
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS orgs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS org_user_bonds_id_seq RESTART WITH 1;

-- 插入服务商用户（使用 SHA256 哈希，与后端 Go 代码一致）
INSERT INTO users (id, phone, password_hash, salt, name, created_at, updated_at)
VALUES (
  1,
  '13800138000',
  encode(sha256('password123'::bytea), 'hex'),
  '',
  '服务商管理员',
  NOW(),
  NOW()
);

-- 插入服务商组织
INSERT INTO orgs (id, name, description, created_at, updated_at)
VALUES (
  1,
  '演示服务商',
  '用于演示的服务商组织',
  NOW(),
  NOW()
);

-- 绑定用户到组织（管理员权限）
INSERT INTO org_user_bonds (id, org_id, user_id, is_admin, created_at, updated_at)
VALUES (
  1,
  1,
  1,
  true,
  NOW(),
  NOW()
);

-- 插入测试租户用户
INSERT INTO users (id, phone, password_hash, salt, name, created_at, updated_at)
VALUES (
  2,
  '13800138001',
  encode(sha256('password123'::bytea), 'hex'),
  '',
  '租户管理员',
  NOW(),
  NOW()
);

-- 插入租户组织
INSERT INTO orgs (id, name, description, created_at, updated_at)
VALUES (
  2,
  '演示租户',
  '用于演示的租户组织',
  NOW(),
  NOW()
);

-- 绑定租户用户到组织（管理员权限）
INSERT INTO org_user_bonds (id, org_id, user_id, is_admin, created_at, updated_at)
VALUES (
  2,
  2,
  2,
  true,
  NOW(),
  NOW()
);

-- 插入普通用户
INSERT INTO users (id, phone, password_hash, salt, name, created_at, updated_at)
VALUES (
  3,
  '13800138002',
  encode(sha256('password123'::bytea), 'hex'),
  '',
  '普通用户',
  NOW(),
  NOW()
);

-- 绑定普通用户到租户组织
INSERT INTO org_user_bonds (id, org_id, user_id, is_admin, created_at, updated_at)
VALUES (
  3,
  2,
  3,
  false,
  NOW(),
  NOW()
);

-- 同步序列到当前最大 id
-- 显式 id 插入不会推进序列，必须 setval 同步，否则后续 API 自增创建会撞主键（orgs_pkey 等）
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('orgs_id_seq', (SELECT MAX(id) FROM orgs));
SELECT setval('org_user_bonds_id_seq', (SELECT MAX(id) FROM org_user_bonds));
