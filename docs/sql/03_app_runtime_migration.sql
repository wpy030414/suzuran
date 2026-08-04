-- Suzuran Cloud 应用运行时迁移脚本
-- Spec 04: Application Runtime

-- 应用表
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    org_id INT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    runtime VARCHAR(50),
    entrypoint VARCHAR(500),
    port INT,
    cpu_quota VARCHAR(20),
    memory_quota VARCHAR(20),
    db_conn_quota INT DEFAULT 10,
    mcp_scopes JSONB,
    routes JSONB,
    status VARCHAR(20) DEFAULT 'created',
    container_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_applications_org_id ON applications(org_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- 应用部署历史表
CREATE TABLE IF NOT EXISTS application_deployments (
    id VARCHAR(64) PRIMARY KEY,
    application_id VARCHAR(64) NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    version VARCHAR(50),
    image_tag VARCHAR(200),
    status VARCHAR(20) DEFAULT 'building',
    container_id VARCHAR(100),
    logs TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_deployments_app_id ON application_deployments(application_id);
