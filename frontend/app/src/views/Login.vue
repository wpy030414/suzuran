<template>
  <v-app>
    <v-main class="bg-grey-lighten-4">
      <v-container>
        <v-row justify="center" align="center" style="height: 100vh">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card elevation="8">
              <v-card-title class="text-h4 font-weight-bold text-center mt-6">
                Suzuran Cloud 登录
              </v-card-title>
              <v-card-text class="pa-6">
                <v-form @submit.prevent="handleLogin">
                  <v-text-field
                    v-model="phone"
                    label="手机号"
                    placeholder="请输入手机号"
                    prepend-inner-icon="mdi-phone"
                    variant="outlined"
                    :rules="[required, phoneRule]"
                    class="mb-4"
                  />
                  <v-text-field
                    v-model="password"
                    label="密码"
                    type="password"
                    placeholder="请输入密码"
                    prepend-inner-icon="mdi-lock"
                    variant="outlined"
                    :rules="[required]"
                    class="mb-4"
                  />
                  <v-alert v-if="errorMessage" type="error" class="mb-4">
                    {{ errorMessage }}
                  </v-alert>
                  <v-btn
                    color="primary"
                    size="x-large"
                    block
                    type="submit"
                    :loading="loading"
                  >
                    登录
                  </v-btn>
                </v-form>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const phone = ref('13800138000') // Default test account
const password = ref('password123') // Default test password
const loading = ref(false)
const errorMessage = ref('')

const required = (v: string) => !!v || '此项为必填项'
const phoneRule = (v: string) => /^1[3-9]\d{9}$/.test(v) || '请输入正确的手机号'

const handleLogin = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    await authStore.login(phone.value, password.value)

    // If user has multiple orgs, they need to select one
    if (authStore.availableOrgs.length > 0) {
      // For simplicity, auto-select the first org
      await authStore.selectOrganization(authStore.availableOrgs[0].orgId)
    }

    // Redirect based on user role
    if (authStore.userRole === 'provider') {
      router.push('/provider/dashboard')
    } else if (authStore.userRole === 'tenant_admin') {
      router.push('/tenant/dashboard')
    } else {
      router.push('/user')
    }
  } catch (error: any) {
    console.error('Login failed:', error)
    errorMessage.value = error.response?.data?.error || '登录失败，请检查手机号和密码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bg-grey-lighten-4 {
  background-color: #f5f5f5;
}
</style>
