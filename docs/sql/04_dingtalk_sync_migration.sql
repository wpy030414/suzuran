-- Suzuran Cloud 钉钉组织架构同步迁移脚本
-- 让 departments 可按钉钉部门 ID 幂等 upsert，orgs 可记录钉钉 corp 级别信息

-- 部门表：钉钉部门 ID（同 org 内唯一，用于幂等同步）
ALTER TABLE departments ADD COLUMN IF NOT EXISTS dingtalk_dept_id BIGINT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_dingtalk_dept_id
    ON departments(org_id, dingtalk_dept_id)
    WHERE dingtalk_dept_id IS NOT NULL;

-- 组织表：钉钉 corp_id（用于关联整个企业的同步来源）
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS dingtalk_corp_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_orgs_dingtalk_corp_id ON orgs(dingtalk_corp_id);
