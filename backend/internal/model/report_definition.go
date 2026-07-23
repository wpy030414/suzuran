package model

import "time"

type ReportDefinition struct {
	ID          int       `gorm:"primaryKey" json:"id"`
	OrgID       int       `gorm:"not null;uniqueIndex:idx_org_code_rpt" json:"orgId"`
	Name        string    `gorm:"not null" json:"name"`
	Code        string    `gorm:"not null;uniqueIndex:idx_org_code_rpt" json:"code"`
	QueryConfig JSONB     `json:"queryConfig"`
	ChartConfig JSONB     `json:"chartConfig"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

func (ReportDefinition) TableName() string {
	return "report_definitions"
}
