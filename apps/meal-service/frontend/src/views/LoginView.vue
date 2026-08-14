<template>
  <v-container class="fill-height" fluid>
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="5" lg="4">
        <v-card elevation="8" class="pa-4">
          <v-card-title class="text-center text-h5 mb-4">
            <v-icon size="48" color="primary" class="mb-2">mdi-food</v-icon>
            <div>智慧用餐管理</div>
            <div class="text-subtitle-2 text-grey">请选择身份登录（演示）</div>
          </v-card-title>
          <v-card-text>
            <v-list>
              <v-list-item
                v-for="user in demoUsers"
                :key="user.id"
                :active="selectedId === user.id"
                @click="selectUser(user)"
                rounded="xl"
                class="mb-2"
              >
                <template v-slot:prepend>
                  <v-avatar :color="user.color" size="40">
                    <v-icon color="white">{{ user.icon }}</v-icon>
                  </v-avatar>
                </template>
                <v-list-item-title class="font-weight-bold">{{ user.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ user.roleLabel }}</v-list-item-subtitle>
                <template v-slot:append>
                  <v-icon v-if="selectedId === user.id" color="primary">mdi-check-circle</v-icon>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn
              block
              color="primary"
              size="large"
              :disabled="!selectedId"
              @click="login"
            >
              登录
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const selectedId = ref(null)

const demoUsers = [
  { id: 1, name: '系统管理员', role: 'admin', roleLabel: '管理员 - 全部权限', color: 'error', icon: 'mdi-shield-crown' },
  { id: 2, name: '食堂管理员', role: 'staff', roleLabel: '工作人员 - 订餐/核销管理', color: 'warning', icon: 'mdi-account-tie' },
  { id: 3, name: '张老师', role: 'student', roleLabel: '学生 - 订餐与查看', color: 'info', icon: 'mdi-account-school' },
  { id: 4, name: '李家长', role: 'parent', roleLabel: '家长 - 查看孩子订餐', color: 'success', icon: 'mdi-account-group' }
]

function selectUser(user) {
  selectedId.value = user.id
  localStorage.setItem('demo_user_id', String(user.id))
  localStorage.setItem('demo_user_name', user.name)
  localStorage.setItem('demo_user_role', user.role)
}

function login() {
  if (!selectedId.value) return
  const user = demoUsers.find(u => u.id === selectedId.value)
  if (user.role === 'student' || user.role === 'parent') {
    router.push('/')
  } else {
    router.push('/dashboard')
  }
}
</script>
