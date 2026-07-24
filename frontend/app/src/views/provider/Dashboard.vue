<!-- frontend/app/src/views/provider/Dashboard.vue -->
<template>
  <div>
    <h1 class="text-h4 mb-4">服务商仪表盘</h1>
    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="primary">mdi-account-multiple</v-icon>
            <div class="text-h5 mt-2">组织管理</div>
            <p>创建和管理租户组织</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="secondary">mdi-form-select</v-icon>
            <div class="text-h5 mt-2">表单设计</div>
            <p>拖拽式表单设计器</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="success">mdi-graph-outline</v-icon>
            <div class="text-h5 mt-2">工作流</div>
            <p>配置审批流程</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
</script>
