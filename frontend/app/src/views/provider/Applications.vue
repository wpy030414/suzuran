<template>
  <div>
    <div class="d-flex align-center mb-6">
      <h1 class="text-h4">应用管理</h1>
      <v-spacer></v-spacer>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
        创建应用
      </v-btn>
    </div>

    <v-alert v-if="appStore.error" type="error" class="mb-4" closable>
      {{ appStore.error }}
    </v-alert>

    <v-progress-linear v-if="appStore.loading && !appStore.applications.length" indeterminate color="primary" class="mb-4"></v-progress-linear>

    <!-- Empty state -->
    <v-card v-if="!appStore.loading && !appStore.applications.length" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1">mdi-package-variant</v-icon>
      <div class="text-h6 mt-4 text-grey-darken-1">还没有应用</div>
      <div class="text-body-2 text-grey mt-2">点击右上角"创建应用"开始设计你的第一个应用</div>
    </v-card>

    <!-- Applications grouped by package name -->
    <div v-for="(group, packageName) in groupedApps" :key="packageName" class="mb-6">
      <div class="d-flex align-center mb-2">
        <v-icon color="primary" class="mr-2">mdi-package</v-icon>
        <span class="text-h6 font-weight-bold">{{ packageName }}</span>
        <v-chip size="small" class="ml-2" color="primary">{{ group.length }} 个版本</v-chip>
      </div>

      <v-row>
        <v-col v-for="app in group" :key="app.id" cols="12" sm="6" md="4">
          <v-card class="app-card h-100" @click="openApp(app)">
            <v-card-text>
              <div class="d-flex justify-space-between align-start">
                <div>
                  <div class="text-h6 font-weight-bold">{{ app.name }}</div>
                  <div class="text-caption text-grey mt-1">
                    <v-icon size="small">mdi-tag</v-icon>
                    {{ app.version }}
                  </div>
                </div>
                <v-chip v-if="isLatest(app, group)" size="x-small" color="success" variant="tonal">最新</v-chip>
              </div>

              <div class="text-body-2 text-grey-darken-1 mt-3" style="min-height: 40px;">
                {{ app.description || '暂无描述' }}
              </div>

              <v-divider class="my-3"></v-divider>

              <div class="text-caption text-grey">
                <div><v-icon size="small">mdi-identifier</v-icon> {{ app.uuid.substring(0, 8) }}...</div>
                <div class="mt-1"><v-icon size="small">mdi-clock-outline</v-icon> {{ formatDate(app.updatedAt) }}</div>
              </div>
            </v-card-text>

            <v-card-actions>
              <v-btn size="small" variant="text" color="primary" @click.stop="onFork(app)">
                <v-icon start>mdi-source-branch</v-icon>
                分叉
              </v-btn>
              <v-btn size="small" variant="text" color="secondary" @click.stop="onDistribute(app)">
                <v-icon start>mdi-share-outline</v-icon>
                分发
              </v-btn>
              <v-btn size="small" variant="text" color="error" @click.stop="onDelete(app)">
                <v-icon start>mdi-delete-outline</v-icon>
                删除
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- Create Application Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title class="text-h5">创建新应用</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="onCreate">
            <v-text-field
              v-model="newApp.name"
              label="应用名称"
              variant="outlined"
              :rules="[v => !!v || '请输入应用名称']"
              class="mb-4"
            ></v-text-field>
            <v-text-field
              v-model="newApp.packageName"
              label="包名"
              variant="outlined"
              placeholder="com.example.app"
              :rules="[v => !!v || '请输入包名']"
              hint="同一包名可以有多个版本，用于分组管理"
              persistent-hint
              class="mb-4"
            ></v-text-field>
            <v-textarea
              v-model="newApp.description"
              label="描述"
              variant="outlined"
              rows="2"
            ></v-textarea>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCreateDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="appStore.loading" @click="onCreate">创建</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Distribute Dialog -->
    <DistributeDialog
      v-model="showDistributeDialog"
      :source-app="distributeTargetApp"
      :orgs="orgs"
      :current-org-id="authStore.user?.orgId"
      @confirm="onDistributeConfirm"
    />

    <v-snackbar v-model="snackbar" :timeout="2000" color="success">{{ snackbarMsg }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApplicationStore } from '../../stores/application'
import { deleteApplication, distributeApplication, type Application } from '../../api/application'
import { listOrgs, type Org } from '../../api/org'
import { useAuthStore } from '../../stores/auth'
import DistributeDialog from '../../components/application/DistributeDialog.vue'

const router = useRouter()
const appStore = useApplicationStore()
const authStore = useAuthStore()

const showCreateDialog = ref(false)
const newApp = ref({ name: '', packageName: '', description: '' })

// 分发相关状态
const orgs = ref<Org[]>([])
const showDistributeDialog = ref(false)
const distributeTargetApp = ref<Application | null>(null)
const snackbar = ref(false)
const snackbarMsg = ref('')

// Group applications by package name
const groupedApps = computed(() => {
  const groups: Record<string, Application[]> = {}
  for (const app of appStore.applications) {
    if (!groups[app.packageName]) {
      groups[app.packageName] = []
    }
    groups[app.packageName].push(app)
  }
  // Sort each group by version descending (latest first)
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.version.localeCompare(a.version))
  }
  return groups
})

// Check if an app is the latest version in its group
function isLatest(app: Application, group: Application[]) {
  if (group.length === 0) return false
  const latest = group.reduce((max, a) => (a.version > max.version ? a : max))
  return app.id === latest.id
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN')
}

function openApp(app: Application) {
  router.push(`/provider/apps/${app.id}`)
}

async function onCreate() {
  try {
    await appStore.createApp(newApp.value)
    showCreateDialog.value = false
    newApp.value = { name: '', packageName: '', description: '' }
  } catch (err) {
    // Error already handled in store
  }
}

// 分叉：基于当前版本创建同包名新版本（新 UUID，版本 meta 变动）
async function onFork(app: Application) {
  try {
    await appStore.updateVersion(app.id)
    await appStore.fetchApplications()
    showSnack(`已分叉「${app.name}」为新版本`)
  } catch (err) {
    // Error already handled in store
  }
}

// 分发：打开对话框并懒加载组织列表
async function onDistribute(app: Application) {
  distributeTargetApp.value = app
  showDistributeDialog.value = true
  if (!orgs.value.length) {
    try {
      const r = await listOrgs()
      orgs.value = r.data
    } catch (err) {
      console.error('Failed to load orgs:', err)
    }
  }
}

// 删除当前版本
async function onDelete(app: Application) {
  if (!confirm(`确认删除应用「${app.name}」的当前版本？此操作不可撤销。`)) return
  try {
    await deleteApplication(app.id)
    await appStore.fetchApplications()
    showSnack(`已删除「${app.name}」当前版本`)
  } catch (err) {
    console.error('Failed to delete application:', err)
  }
}

// 确认分发
async function onDistributeConfirm({ targetOrgId, overwrite }: { targetOrgId: number; overwrite: boolean }) {
  if (!distributeTargetApp.value) return
  try {
    await distributeApplication(distributeTargetApp.value.id, { targetOrgId, overwrite })
    showDistributeDialog.value = false
    showSnack('分发成功')
  } catch (err) {
    console.error('Failed to distribute application:', err)
  }
}

function showSnack(msg: string) {
  snackbarMsg.value = msg
  snackbar.value = true
}

onMounted(() => {
  appStore.fetchApplications()
})
</script>

<style scoped>
.app-card {
  transition: all 0.2s;
  cursor: pointer;
}
.app-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
