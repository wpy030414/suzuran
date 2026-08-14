<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="4">
        <v-card elevation="12" class="pa-6">
          <v-card-title class="text-center text-h5 mb-4">
            <v-icon size="48" color="primary" class="mb-2">mdi-shield-check</v-icon>
            <div>校园食品安全公示系统</div>
          </v-card-title>

          <v-card-subtitle class="text-center mb-6">
            请选择身份登录
          </v-card-subtitle>

          <v-list>
            <v-list-item
              v-for="u in demoUsers"
              :key="u.id"
              :title="u.name"
              :subtitle="roleMap[u.role]"
              @click="login(u)"
              class="mb-2 rounded-lg"
            >
              <template v-slot:prepend>
                <v-avatar :color="avatarColor(u.role)" size="40">
                  <v-icon color="white">{{ avatarIcon(u.role) }}</v-icon>
                </v-avatar>
              </template>
              <template v-slot:append>
                <v-icon color="primary">mdi-chevron-right</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const demoUsers = [
  { id: 1, name: '系统管理员', role: 'admin' },
  { id: 2, name: '食堂管理员', role: 'staff' },
  { id: 3, name: '王家长', role: 'parent' }
];

const roleMap = {
  admin: '管理员 - 全部权限',
  staff: '教职工 - 数据管理',
  parent: '家长 - 只读查看'
};

function avatarColor(role) {
  const map = { admin: 'red', staff: 'blue', parent: 'green' };
  return map[role] || 'grey';
}

function avatarIcon(role) {
  const map = { admin: 'mdi-shield-crown', staff: 'mdi-account-tie', parent: 'mdi-account-heart' };
  return map[role] || 'mdi-account';
}

function login(user) {
  localStorage.setItem('user', JSON.stringify(user));
  router.push('/');
}
</script>
