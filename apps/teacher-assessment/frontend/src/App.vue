<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>教师考核系统</v-toolbar-title>
      <v-spacer />
      <v-chip class="mr-2" color="white" variant="outlined" size="small">
        <v-icon start size="x-small">mdi-shield-account</v-icon>
        {{ roleLabel }}
      </v-chip>
      <v-select
        v-model="currentRole"
        :items="roles"
        item-title="label"
        item-value="value"
        density="compact"
        variant="solo-filled"
        hide-details
        single-line
        style="max-width: 140px"
        class="mr-2"
        @update:model-value="onRoleChange"
      />
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list nav>
        <v-list-item prepend-icon="mdi-account-group" title="教师管理" to="/" />
        <v-list-item prepend-icon="mdi-calendar-week" title="周行事件" to="/weekly-events" />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-trophy" title="获奖登记" to="/awards" />
        <v-list-item prepend-icon="mdi-tag-multiple" title="获奖类别" to="/award-categories" />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-calendar-range" title="学期考核" to="/semester" />
        <v-list-item prepend-icon="mdi-calendar-star" title="学年考核" to="/annual" />
        <v-divider class="my-2" />
        <v-list-item prepend-icon="mdi-chart-bar" title="统计报表" to="/stats" />
      </v-list>
    </v-navigation-drawer>
    <v-main><router-view /></v-main>
  </v-app>
</template>
<script setup>
import { ref, computed } from 'vue'

const drawer = ref(false)
const roles = [
  { label: '管理员', value: 'admin' },
  { label: '教导处', value: 'director' },
  { label: '年级组长', value: 'grade_head' },
  { label: '教师', value: 'teacher' },
]
const currentRole = ref('admin')

const roleLabel = computed(() => {
  const found = roles.find(r => r.value === currentRole.value)
  return found ? found.label : currentRole.value
})

function onRoleChange(role) {
  // Store in localStorage for persistence
  localStorage.setItem('user_role', role)
  // Reload page to apply role globally
  window.location.reload()
}

// Restore role from localStorage on init
const saved = localStorage.getItem('user_role')
if (saved && roles.some(r => r.value === saved)) {
  currentRole.value = saved
}

// Inject role header into all API calls via axios interceptor
import axios from 'axios'
// The api.js module uses its own axios instance, so we set a default header
// that will be picked up by the shared browser session
document.documentElement.setAttribute('data-role', currentRole.value)
</script>
