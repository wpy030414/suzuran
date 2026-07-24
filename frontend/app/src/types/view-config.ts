// frontend/app/src/types/view-config.ts
export type ViewType = 'table' | 'chart' | 'kanban'

export interface TableViewConfig {
  type: 'table'
  formCode?: string
  columns?: Array<{ fieldId: string; label: string }>
  pageSize?: number
}

export interface ChartViewConfig {
  type: 'chart'
  chartType?: 'bar' | 'line' | 'pie'
  dimensionFieldId?: string
}

export interface KanbanViewConfig {
  type: 'kanban'
  groupingFieldId?: string
  titleFieldId?: string
}

export type ViewConfig = TableViewConfig | ChartViewConfig | KanbanViewConfig

export function defaultViewConfig(type: ViewType): ViewConfig {
  switch (type) {
    case 'table':
      return { type: 'table', pageSize: 20 }
    case 'chart':
      return { type: 'chart', chartType: 'bar' }
    case 'kanban':
      return { type: 'kanban' }
  }
}
