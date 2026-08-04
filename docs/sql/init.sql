-- Suzuran Cloud 数据库初始化脚本
-- PostgreSQL 15+

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 多租户核心表
-- ============================================

-- 组织表（租户，平级结构，无 parent_id）
CREATE TABLE orgs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 用户表（全局）— OAuth-only，无密码字段
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20),
    email VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    name VARCHAR(255),
    position VARCHAR(255),
    dingtalk_userid VARCHAR(100) UNIQUE,
    dingtalk_unionid VARCHAR(100),
    dingtalk_openid VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_dingtalk_unionid ON users(dingtalk_unionid);

-- WebAuthn 凭证表（Passkey 注册）
CREATE TABLE webauthn_credentials (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id BYTEA NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    attestation_type VARCHAR(100),
    aaguid VARCHAR(255),
    sign_count INT DEFAULT 0,
    transports JSONB,
    user_id_bytes BYTEA,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);
CREATE INDEX idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_user_id_bytes ON webauthn_credentials(user_id_bytes);

-- OAuth2 客户端表（应用作为 OAuth client）
CREATE TABLE oauth_clients (
    id VARCHAR(64) PRIMARY KEY,
    org_id INT REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client_secret VARCHAR(255) NOT NULL,
    redirect_uris JSONB,
    scopes JSONB,
    confidential BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_oauth_clients_org_id ON oauth_clients(org_id);

-- OAuth2 token 表（access + refresh）
CREATE TABLE oauth_tokens (
    id VARCHAR(64) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id INT,
    client_id VARCHAR(64) NOT NULL,
    scope VARCHAR(255),
    refresh_token_hash VARCHAR(64),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_client_id ON oauth_tokens(client_id);
CREATE INDEX idx_oauth_tokens_refresh_hash ON oauth_tokens(refresh_token_hash);

-- OAuth2 授权码会话表（authorization_code 流程）
CREATE TABLE oauth_sessions (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    code_challenge VARCHAR(128),
    code_challenge_method VARCHAR(10),
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id INT,
    client_id VARCHAR(64) NOT NULL,
    redirect_uri TEXT,
    scope VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_oauth_sessions_code ON oauth_sessions(code);
CREATE INDEX idx_oauth_sessions_client_id ON oauth_sessions(client_id);

-- 组织-用户关联表
CREATE TABLE org_user_bonds (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_department_manager BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);

-- 部门表（树形结构，同一 org 内多层级）
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id INT REFERENCES departments(id) ON DELETE SET NULL,
    level INT DEFAULT 1,
    manager_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 审计与日志
-- ============================================

-- 审计日志
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    org_id INT REFERENCES orgs(id),
    user_id INT REFERENCES users(id),
    action VARCHAR(100), -- read, create, update, delete
    resource_type VARCHAR(100),
    resource_id INT,
    request_data JSONB,
    response_status INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 登录日志
CREATE TABLE login_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    org_id INT REFERENCES orgs(id),
    login_method VARCHAR(50), -- password, dingtalk, oauth
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 钉钉同步日志
CREATE TABLE dingtalk_sync_logs (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    sync_type VARCHAR(50), -- department, user, full
    status VARCHAR(20) DEFAULT 'pending', -- pending, success, failed
    message TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- ============================================
-- 索引优化
-- ============================================

CREATE INDEX idx_org_user_bonds_org_id ON org_user_bonds(org_id);
CREATE INDEX idx_org_user_bonds_user_id ON org_user_bonds(user_id);
CREATE INDEX idx_org_user_bonds_dept_id ON org_user_bonds(department_id);
CREATE INDEX idx_departments_org_id ON departments(org_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_id);
CREATE INDEX idx_audit_logs_org_user ON audit_logs(org_id, user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX idx_dingtalk_sync_logs_org ON dingtalk_sync_logs(org_id);

-- ============================================
-- 示例数据（开发环境）
-- ============================================

-- 插入默认组织
INSERT INTO orgs (name, description) VALUES ('演示租户', '系统默认演示组织');

-- 插入管理员用户（密码: admin123，bcrypt 哈希）
INSERT INTO users (phone, password_hash, salt, name, email)
VALUES ('13800138000', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'random_salt_123', '系统管理员', 'admin@example.com');

-- 绑定管理员到默认组织（is_admin = true）
INSERT INTO org_user_bonds (org_id, user_id, is_admin) VALUES (1, 1, true);

-- 插入根部门
INSERT INTO departments (org_id, name, level, sort_order) VALUES (1, '根部门', 1, 0);
