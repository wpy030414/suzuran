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

-- 用户表（全局）
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    position VARCHAR(255),
    dingtalk_userid VARCHAR(100),
    dingtalk_unionid VARCHAR(100),
    dingtalk_openid VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

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
