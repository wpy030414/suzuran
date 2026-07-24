<!-- frontend/app/src/views/user/Dashboard.vue -->
<template>
  <div>
    <h1 class="text-h4 mb-4">用户中心</h1>
    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="primary">mdi-form-select</v-icon>
            <div class="text-h5 mt-2">我的表单</div>
            <p>填写和提交表单</p>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-text>
            <v-icon size="48" color="secondary">mdi-bell</v-icon>
            <div class="text-h5 mt-2">消息通知</div>
            <p>查看审批进度</p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
</script>
