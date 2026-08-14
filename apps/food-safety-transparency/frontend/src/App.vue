<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>校园食品安全公示系统</v-toolbar-title>
      <v-spacer />
      <template v-if="user">
        <v-chip color="white" variant="text" size="small" class="mr-2">
          <v-icon start>mdi-account</v-icon>
          {{ user.name }}
        </v-chip>
        <v-chip :color="roleColor" variant="elevated" size="small">
          {{ roleLabel }}
        </v-chip>
        <v-btn icon="mdi-logout" size="small" @click="logout" class="ml-2" />
      </template>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" temporary v-if="user">
      <v-list nav>
        <v-list-item
          prepend-icon="mdi-image-multiple"
          title="餐标公示"
          to="/"
          :active="$route.path === '/'"
        />
        <v-list-item
          prepend-icon="mdi-calendar-week"
          title="周菜谱"
          to="/menus"
          :active="$route.path === '/menus'"
        />
        <v-list-item
          prepend-icon="mdi-view-grid-outline"
          title="总览"
          to="/overview"
          :active="$route.path === '/overview'"
        />
        <v-list-item
          v-if="user.role !== 'parent'"
          prepend-icon="mdi-school"
          title="校区管理"
          to="/campuses"
          :active="$route.path === '/campuses'"
        />
        <v-list-item
          v-if="user.role !== 'parent'"
          prepend-icon="mdi-chart-bar"
          title="统计分析"
          to="/stats"
          :active="$route.path === '/stats'"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const drawer = ref(false);
const user = ref(null);

const roleLabel = computed(() => {
  if (!user.value) return '';
  const map = { admin: '管理员', staff: '教职工', parent: '家长' };
  return map[user.value.role] || user.value.role;
});

const roleColor = computed(() => {
  if (!user.value) return 'grey';
  const map = { admin: 'red', staff: 'blue', parent: 'green' };
  return map[user.value.role] || 'grey';
});

onMounted(() => {
  try {
    user.value = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user.value = null;
  }
});

function logout() {
  localStorage.removeItem('user');
  router.push('/login');
}
</script>

<style>
html {
  overflow-y: auto !important;
}
</style>
