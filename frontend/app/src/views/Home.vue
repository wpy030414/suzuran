<template>
  <v-app>
    <v-app-bar color="primary" dark>
      <v-app-bar-title>Suzuran Cloud</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn v-if="!authStore.isAuthenticated" to="/login">登录</v-btn>
      <div v-else>
        <span class="mr-2">{{ authStore.user?.name }}</span>
        <v-btn @click="authStore.logout">退出</v-btn>
      </div>
    </v-app-bar>

    <v-main>
      <v-container class="mt-8">
        <v-row justify="center">
          <v-col cols="12" md="8">
            <v-card>
              <v-card-title class="text-h4 font-weight-bold">
                欢迎使用 Suzuran Cloud
              </v-card-title>
              <v-card-text>
                <p class="text-body-1 mt-4">
                  低代码多租户业务平台
                </p>
                <ul class="ml-6 mt-2">
                  <li>服务商端：管理组织、设计表单、配置工作流</li>
                  <li>租户管理端：用户管理、部门管理、钉钉同步</li>
                  <li>用户端：填写表单、查看进度</li>
                </ul>
              </v-card-text>
              <v-card-actions v-if="!authStore.isAuthenticated">
                <v-spacer></v-spacer>
                <v-btn color="primary" size="large" to="/login">
                  立即登录
                  <v-icon end>mdi-arrow-right</v-icon>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mt-8">
          <v-col cols="12" sm="6" md="4">
            <v-card :to="'/provider/dashboard'" class="cursor-pointer hover-elevation">
              <v-card-text class="text-center pa-6">
                <v-icon size="64" color="primary">mdi-account-multiple</v-icon>
                <div class="text-h5 mt-4 font-weight-bold">服务商端</div>
                <div class="text-body-2 mt-2">组织管理 · 表单设计 · 工作流配置</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-card :to="'/tenant/dashboard'" class="cursor-pointer hover-elevation">
              <v-card-text class="text-center pa-6">
                <v-icon size="64" color="secondary">mdi-shield-account</v-icon>
                <div class="text-h5 mt-4 font-weight-bold">租户管理</div>
                <div class="text-body-2 mt-2">用户管理 · 部门管理 · 钉钉同步</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="4">
            <v-card :to="'/user'" class="cursor-pointer hover-elevation">
              <v-card-text class="text-center pa-6">
                <v-icon size="64" color="success">mdi-account</v-icon>
                <div class="text-h5 mt-4 font-weight-bold">用户端</div>
                <div class="text-body-2 mt-2">表单填写 · 进度查询 · 消息通知</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
</script>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.hover-elevation:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
</style>
