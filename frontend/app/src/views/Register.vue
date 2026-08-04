<template>
  <v-app>
    <v-main class="register-bg">
      <v-container>
        <v-row justify="center" align="center" style="height: 100vh">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card elevation="8" class="pa-2">
              <v-card-title class="text-h4 font-weight-bold text-center mt-6">
                注册 Passkey
              </v-card-title>
              <v-card-subtitle class="text-center mb-4">
                使用生物识别或安全密钥，无需密码
              </v-card-subtitle>

              <v-card-text>
                <v-alert v-if="errorMessage" type="error" class="mb-4" closable>
                  {{ errorMessage }}
                </v-alert>
                <v-alert v-if="successMessage" type="success" class="mb-4" closable>
                  {{ successMessage }}
                </v-alert>

                <v-form @submit.prevent="handleRegister">
                  <v-text-field
                    v-model="name"
                    label="用户名"
                    placeholder="输入用户名"
                    prepend-inner-icon="mdi-account"
                    variant="outlined"
                    :rules="[required]"
                    class="mb-4"
                  />
                  <v-btn
                    color="primary"
                    size="x-large"
                    block
                    type="submit"
                    :loading="loading"
                    prepend-icon="mdi-fingerprint"
                  >
                    创建 Passkey
                  </v-btn>
                </v-form>

                <div class="text-center mt-6">
                  <span class="text-body-2 text-grey-darken-1">已有账号？</span>
                  <v-btn variant="text" color="primary" to="/login">
                    返回登录
                  </v-btn>
                </div>
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

const name = ref('')
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const required = (v: string) => !!v || '此项为必填项'

const handleRegister = async () => {
  if (!name.value) {
    errorMessage.value = '请填写用户名'
    return
  }
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    await authStore.registerPasskey(name.value)
    successMessage.value = 'Passkey 注册成功！请前往登录。'
    setTimeout(() => {
      router.push('/login')
    }, 1500)
  } catch (error: any) {
    console.error('Registration failed:', error)
    errorMessage.value = error.response?.data?.error || error.message || '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}
</style>
