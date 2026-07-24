<!-- frontend/app/src/views/tenant/Dashboard.vue -->
<template>
  <div>
    <h1 class="text-h4 mb-4">租户管理仪表盘</h1>
    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="primary">mdi-account-multiple</v-icon>
            <div class="text-h5 mt-2">用户管理</div>
            <p>管理系统用户</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="secondary">mdi-sitemap</v-icon>
            <div class="text-h5 mt-2">部门管理</div>
            <p>组织架构管理</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="success">mdi-sync</v-icon>
            <div class="text-h5 mt-2">钉钉同步</div>
            <p>同步钉钉数据</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
</script>
