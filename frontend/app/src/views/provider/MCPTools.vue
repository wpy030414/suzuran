<template>
  <div>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4 font-weight-bold">
        <v-icon class="mr-2" color="primary">mdi-tools</v-icon>
        MCP 工具
      </h1>
      <v-spacer />
      <v-btn variant="text" prepend-icon="mdi-refresh" :loading="loading" @click="fetchTools">
        刷新
      </v-btn>
    </div>

    <v-alert v-if="error" type="error" class="mb-4" closable>{{ error }}</v-alert>

    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="64" />
    </div>

    <v-card v-else-if="tools.length === 0" variant="outlined" class="text-center pa-12">
      <v-icon size="64" color="grey-lighten-1">mdi-tools</v-icon>
      <p class="text-h6 mt-4 text-grey">没有可用的 MCP 工具</p>
    </v-card>

    <v-row v-else>
      <v-col
        v-for="tool in tools"
        :key="tool.name"
        cols="12"
        md="6"
        lg="4"
      >
        <v-card variant="outlined" class="h-100">
          <v-card-title class="text-subtitle-1 font-monospace">
            {{ tool.name }}
          </v-card-title>
          <v-card-subtitle class="text-body-2">
            {{ tool.description || '无描述' }}
          </v-card-subtitle>
          <v-divider />
          <v-card-text v-if="schemaProperties(tool)">
            <div class="text-caption text-grey mb-1">输入参数</div>
            <v-table density="compact">
              <tbody>
                <tr v-for="(prop, key) in schemaProperties(tool)" :key="key">
                  <td class="font-monospace">{{ key }}</td>
                  <td>
                    <v-chip size="x-small" variant="flat" color="primary">
                      {{ propType(prop) }}
                    </v-chip>
                    <v-icon v-if="isRequired(tool, key)" size="small" color="error" class="ml-1">
                      mdi-asterisk
                    </v-icon>
                  </td>
                  <td class="text-grey">{{ propDesc(prop) }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
          <v-card-text v-else class="text-grey">
            无输入参数
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { MCPTool } from '../../api/mcp'

const tools = ref<MCPTool[]>([])
const loading = ref(false)
const error = ref('')

async function fetchTools() {
  loading.value = true
  error.value = ''
  try {
    // The /mcp/tools endpoint returns a JSON-RPC envelope.
    const resp = await fetch('/mcp/tools', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
      },
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const envelope = await resp.json()
    // JSON-RPC: { result: { tools: [...] } }
    tools.value = envelope?.result?.tools || envelope?.tools || []
  } catch (e: any) {
    error.value = e.message || '获取 MCP 工具失败'
  } finally {
    loading.value = false
  }
}

function schemaProperties(tool: MCPTool): Record<string, any> | null {
  const props = tool.inputSchema?.properties
  if (!props || Object.keys(props).length === 0) return null
  return props as Record<string, any>
}

function propType(prop: any): string {
  if (!prop) return '—'
  return prop.type || '—'
}

function propDesc(prop: any): string {
  if (!prop) return ''
  return prop.description || ''
}

function isRequired(tool: MCPTool, key: string): boolean {
  const req = tool.inputSchema?.required || []
  return req.includes(key)
}

onMounted(fetchTools)
</script>

<style scoped>
.font-monospace {
  font-family: 'Consolas', 'Monaco', monospace;
}
.h-100 {
  height: 100%;
}
</style>
