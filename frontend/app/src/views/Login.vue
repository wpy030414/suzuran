<template>
  <v-app>
    <v-main class="login-bg">
      <v-container>
        <v-row justify="center" align="center" style="height: 100vh">
          <v-col cols="12" sm="8" md="6" lg="4">
            <v-card elevation="8" class="pa-2">
              <v-card-title class="text-h4 font-weight-bold text-center mt-6">
                Suzuran Cloud
              </v-card-title>
              <v-card-subtitle class="text-center mb-4">
                AI 原生多租户应用平台
              </v-card-subtitle>

              <v-card-text>
                <v-alert v-if="errorMessage" type="error" class="mb-4" closable>
                  {{ errorMessage }}
                </v-alert>
                <v-alert v-if="successMessage" type="success" class="mb-4" closable>
                  {{ successMessage }}
                </v-alert>

                <!-- WebAuthn 登录 -->
                <v-form @submit.prevent="handlePasskeyLogin">
                  <v-text-field
                    v-model="identifier"
                    label="邮箱或用户名"
                    placeholder="输入注册时的邮箱或用户名"
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
                    使用 Passkey 登录
                  </v-btn>
                </v-form>

                <v-divider class="my-6">或</v-divider>

                <!-- 钉钉 OAuth 登录 -->
                <v-btn
                  color="info"
                  size="x-large"
                  block
                  variant="outlined"
                  :loading="dingtalkLoading"
                  prepend-icon="mdi-account-tie"
                  @click="handleDingTalkLogin"
                >
                  钉钉登录
                </v-btn>

                <!-- 注册入口 -->
                <div class="text-center mt-6">
                  <span class="text-body-2 text-grey-darken-1">还没有账号？</span>
                  <v-btn variant="text" color="primary" to="/register">
                    注册 Passkey
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

const identifier = ref('')
const loading = ref(false)
const dingtalkLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const required = (v: string) => !!v || '此项为必填项'

// WebAuthn 登录流程：begin → 浏览器弹窗 → finish → 拿 sessionId → 选组织 → 拿 token
const handlePasskeyLogin = async () => {
  if (!identifier.value) {
    errorMessage.value = '请输入邮箱或用户名'
    return
  }
  loading.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Step 1: Complete WebAuthn ceremony, get sessionId + availableOrgs
    const result = await authStore.loginWithPasskey(identifier.value)

    // Step 2: If user has available orgs, select the first one and exchange for tokens
    if (result.availableOrgs.length > 0) {
      const org = result.availableOrgs[0]
      await authStore.completeLoginWithToken(result.sessionId, org.orgId)
      successMessage.value = `已登录组织：${org.orgName}`
    }

    // Step 3: Route based on role
    const role = authStore.userRole
    if (role === 'provider') {
      router.push('/provider/dashboard')
    } else if (role === 'tenant_admin') {
      router.push('/tenant/dashboard')
    } else {
      router.push('/user')
    }
  } catch (error: any) {
    console.error('Passkey login failed:', error)
    errorMessage.value = error.response?.data?.error || error.message || 'Passkey 登录失败'
  } finally {
    loading.value = false
  }
}

const handleDingTalkLogin = async () => {
  dingtalkLoading.value = true
  errorMessage.value = ''
  try {
    // Redirect to DingTalk OAuth; the callback will be handled by Callback.vue
    const redirectURI = `${window.location.origin}/oauth/dingtalk/callback`
    await authStore.redirectToDingTalk(redirectURI)
  } catch (error: any) {
    console.error('DingTalk login failed:', error)
    errorMessage.value = error.response?.data?.error || '钉钉登录跳转失败'
    dingtalkLoading.value = false
  }
}
</script>

<style scoped>
.login-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}
</style>
