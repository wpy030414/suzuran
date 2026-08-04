-- docs/sql/seed_demo_data.sql
-- Suzuran Cloud 演示数据种子脚本（OAuth-only，无密码）

-- 清空现有数据（开发环境）
DELETE FROM webauthn_credentials;
DELETE FROM oauth_tokens;
DELETE FROM oauth_sessions;
DELETE FROM departments;
DELETE FROM org_user_bonds;
DELETE FROM oauth_clients;
DELETE FROM users;
DELETE FROM orgs;

-- 重置序列
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS orgs_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS org_user_bonds_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS departments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS webauthn_credentials_id_seq RESTART WITH 1;

-- ============================================
-- 注意：OAuth-only 平台，用户无密码。
-- 演示账号需通过 WebAuthn 注册 Passkey 或钉钉 OAuth 登录。
-- 本脚本只创建组织骨架 + 用户骨架（无凭证），管理员首次登录时注册 Passkey。
-- ============================================

-- 插入服务商组织（org_id=1 是超级管理组织，对应 provider 角色）
INSERT INTO orgs (id, name, description, created_at, updated_at)
VALUES (1, '演示服务商', '用于演示的服务商组织（超级管理）', NOW(), NOW());

-- 插入租户组织
INSERT INTO orgs (id, name, description, created_at, updated_at)
VALUES (2, '演示租户', '用于演示的租户组织', NOW(), NOW());

-- 插入服务商管理员骨架（无密码，需注册 WebAuthn Passkey）
INSERT INTO users (id, name, email, created_at, updated_at)
VALUES (1, '服务商管理员', 'admin@example.com', NOW(), NOW());

-- 绑定服务商管理员到超级管理组织（is_admin = true → provider 角色）
INSERT INTO org_user_bonds (id, org_id, user_id, is_admin, created_at, updated_at)
VALUES (1, 1, 1, true, NOW(), NOW());

-- 插入租户管理员骨架
INSERT INTO users (id, name, email, created_at, updated_at)
VALUES (2, '租户管理员', 'tenant@example.com', NOW(), NOW());

-- 绑定租户管理员到租户组织（is_admin = true → tenant_admin 角色）
INSERT INTO org_user_bonds (id, org_id, user_id, is_admin, created_at, updated_at)
VALUES (2, 2, 2, true, NOW(), NOW());

-- 插入普通用户骨架
INSERT INTO users (id, name, email, created_at, updated_at)
VALUES (3, '普通用户', 'user@example.com', NOW(), NOW());

-- 绑定普通用户到租户组织（is_admin = false → user 角色）
INSERT INTO org_user_bonds (id, org_id, user_id, is_admin, created_at, updated_at)
VALUES (3, 2, 3, false, NOW(), NOW());

-- 插入根部门
INSERT INTO departments (id, org_id, name, level, sort_order, created_at, updated_at)
VALUES (1, 2, '根部门', 1, 0, NOW(), NOW());

-- 同步序列到当前最大 id
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
SELECT setval('orgs_id_seq', (SELECT MAX(id) FROM orgs));
SELECT setval('org_user_bonds_id_seq', (SELECT MAX(id) FROM org_user_bonds));
SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments));

-- ============================================
-- 首次登录说明：
-- 1. 启动后端 + 前端
-- 2. 访问前端注册页，用 email "admin@example.com" 注册 WebAuthn Passkey
--    （后端 /oauth/webauthn/register/begin 会匹配到 user_id=1）
--    注意：当前实现按 email/name 查找已有用户；若邮箱已存在则为其添加 Passkey。
-- 3. 注册成功后，用 WebAuthn 登录 → 选择组织 1 → 获得 provider 令牌
-- ============================================
