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
-- 低代码元数据表
-- ============================================

-- 表单定义
CREATE TABLE form_definitions (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    schema JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'draft', -- draft, published
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, code)
);

-- 表单提交数据
CREATE TABLE form_submissions (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    form_code VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 表单分发记录（服务商分发给租户）
CREATE TABLE form_distributions (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    form_code VARCHAR(255) NOT NULL,
    app_code VARCHAR(255) NOT NULL,
    distributed_at TIMESTAMP DEFAULT NOW()
);

-- 工作流定义
CREATE TABLE workflow_definitions (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    definition JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, code)
);

-- 工作流实例
CREATE TABLE workflow_instances (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    workflow_code VARCHAR(255) NOT NULL,
    business_key VARCHAR(255),
    current_node VARCHAR(255),
    status VARCHAR(20) DEFAULT 'running', -- running, completed, cancelled
    started_by INT REFERENCES users(id),
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- 工作流审批记录
CREATE TABLE workflow_approvals (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    instance_id INT NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
    node_key VARCHAR(255),
    approver_id INT REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    action VARCHAR(50),
    comment TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 应用管理表（新架构：应用 → 表单 + 视图）
-- ============================================

-- 应用定义表
CREATE TABLE applications (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    package_name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    schema JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(uuid),
    INDEX idx_package_version (package_name, version)
);

-- 表单定义表（属于某个应用）
CREATE TABLE forms (
    id SERIAL PRIMARY KEY,
    application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(application_id, code)
);

-- 视图定义表（属于某个应用）
CREATE TABLE views (
    id SERIAL PRIMARY KEY,
    application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- table, chart, kanban, etc.
    description TEXT,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(application_id, code)
);

-- 报表定义（保留，但未来可能迁移到 views）
CREATE TABLE report_definitions (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    query_config JSONB NOT NULL,
    chart_config JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, code)
);

-- 应用页面（含 Vue template）
CREATE TABLE application_pages (
    id SERIAL PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    layout_config JSONB,
    widget_config JSONB,
    vue_template TEXT,
    vue_script TEXT,
    vue_style TEXT,
    skill_config JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(org_id, code)
);

-- 组件库
CREATE TABLE widget_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50), -- input, display, chart, etc.
    config JSONB,
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
CREATE INDEX idx_form_definitions_org_code ON form_definitions(org_id, code);
CREATE INDEX idx_form_submissions_org_code ON form_submissions(org_id, form_code);
CREATE INDEX idx_workflow_instances_org_code ON workflow_instances(org_id, workflow_code);
CREATE INDEX idx_workflow_approvals_instance ON workflow_approvals(instance_id);
CREATE INDEX idx_report_definitions_org_code ON report_definitions(org_id, code);
CREATE INDEX idx_application_pages_org_code ON application_pages(org_id, code);
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
