<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>关爱特殊学生</v-toolbar-title>
      <v-spacer />
      <v-chip size="small" color="white" variant="tonal" class="mr-2">
        {{ userRole }}
      </v-chip>
      <v-btn icon="mdi-account-cog" @click="roleDialog = true" size="small" />
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-home" title="首页工作台" to="/" />
        <v-list-item prepend-icon="mdi-account-group" title="学生档案" to="/students" />
        <v-list-item prepend-icon="mdi-calendar-check" title="关爱计划" to="/plans" />
        <v-list-item prepend-icon="mdi-clipboard-text" title="关爱记录" to="/records" />
        <v-list-item prepend-icon="mdi-pause-circle" title="暂缓审批" to="/pause-requests" />
        <v-divider class="my-2" />
        <v-list-subheader>统计看板</v-list-subheader>
        <v-list-item prepend-icon="mdi-clipboard-check" title="计划上报情况" to="/dashboard/report" />
        <v-list-item prepend-icon="mdi-account-search" title="学生动态摸排" to="/dashboard/survey" />
        <v-list-item prepend-icon="mdi-chart-bar" title="关爱次数统计" to="/dashboard/stats" />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-cog" title="系统配置" to="/config" />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>

    <!-- 角色切换对话框（演示用） -->
    <v-dialog v-model="roleDialog" max-width="400">
      <v-card>
        <v-card-title>切换角色（演示用）</v-card-title>
        <v-card-text>
          <v-radio-group v-model="selectedRole">
            <v-radio label="管理员" value="admin" />
            <v-radio label="心理教师" value="psychological_teacher" />
            <v-radio label="年级组长" value="grade_director" />
            <v-radio label="班主任" value="teacher" />
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="roleDialog = false">取消</v-btn>
          <v-btn color="primary" @click="switchRole">确定</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'

const drawer = ref(false)
const roleDialog = ref(false)
const selectedRole = ref(localStorage.getItem('user_role') || 'teacher')

const userRole = computed(() => {
  return {
    admin: '管理员',
    psychological_teacher: '心理教师',
    grade_director: '年级组长',
    teacher: '班主任'
  }[selectedRole.value] || '班主任'
})

function switchRole() {
  localStorage.setItem('user_role', selectedRole.value)
  roleDialog.value = false
  window.location.reload()
}
</script>
