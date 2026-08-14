<template>
  <v-container>
    <h2 class="text-h5 mb-4">课表孵化器</h2>
    <v-alert type="warning" class="mb-4" prepend-icon="mdi-lock">
      此操作将批量生成/清理快照，请输入管理口令后谨慎操作。
    </v-alert>

    <!-- Password gate -->
    <v-card v-if="!unlocked" class="mb-4">
      <v-card-title>口令验证</v-card-title>
      <v-card-text>
        <v-text-field v-model="password" :type="showPassword ? 'text' : 'password'"
          label="请输入孵化器口令" :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
          @click:append-inner="showPassword = !showPassword"
          @keyup.enter="verifyPassword" density="compact" />
        <p v-if="passwordError" class="text-error mt-1">{{ passwordError }}</p>
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="verifyPassword">解锁</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Operations (visible after unlock) -->
    <v-row v-if="unlocked">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-success">生成快照</v-card-title>
          <v-card-text>
            <v-select v-model="incubateClassroom" :items="classrooms" item-title="name" item-value="id" label="班级（留空=全部）" clearable density="compact" />
            <v-progress-linear v-if="incubating" :model-value="incubateProgress" class="my-3" />
            <v-alert v-if="incubateResult" type="success" density="compact" class="mt-2">
              已生成 <strong>{{ incubateResult.created }}</strong> 条快照
              <span v-if="incubateResult.skipped">，跳过 {{ incubateResult.skipped }} 条空格</span>
              <span v-if="incubateResult.conflicts">，冲突 {{ incubateResult.conflicts }} 条</span>
            </v-alert>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="doIncubate" :loading="incubating" prepend-icon="mdi-play">生成快照</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-error">清理快照</v-card-title>
          <v-card-text>
            <v-select v-model="cleanClassroom" :items="classrooms" item-title="name" item-value="id" label="班级（留空=全部）" clearable density="compact" />
            <v-row>
              <v-col cols="6">
                <v-text-field v-model="cleanDateFrom" type="date" label="起始日期" density="compact" clearable />
              </v-col>
              <v-col cols="6">
                <v-text-field v-model="cleanDateTo" type="date" label="结束日期" density="compact" clearable />
              </v-col>
            </v-row>
            <p v-if="cleanResult" class="text-success mt-2">已清理 {{ cleanResult }} 条快照</p>
          </v-card-text>
          <v-card-actions>
            <v-btn color="error" @click="doClean" :loading="cleaning" prepend-icon="mdi-delete">清理快照</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Lock button -->
    <v-btn v-if="unlocked" variant="outlined" @click="unlocked = false" class="mt-4" prepend-icon="mdi-lock">
      锁定
    </v-btn>

    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const classrooms = ref([])
const password = ref('')
const showPassword = ref(false)
const passwordError = ref('')
const unlocked = ref(false)

const incubateClassroom = ref(null)
const cleanClassroom = ref(null)
const cleanDateFrom = ref('')
const cleanDateTo = ref('')
const incubating = ref(false)
const cleaning = ref(false)
const incubateResult = ref(null)
const cleanResult = ref(null)
const incubateProgress = ref(0)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

function showMsg(text, color = 'success') {
  snackbarText.value = text
  snackbarColor.value = color
  snackbar.value = true
}

function verifyPassword() {
  // Default password for demo; in production this would be server-verified
  if (password.value === 'suzuran2026' || password.value === 'admin123') {
    unlocked.value = true
    passwordError.value = ''
  } else {
    passwordError.value = '口令错误，请重试'
  }
}

async function doIncubate() {
  if (!confirm('确定要生成快照吗？此操作可能需要较长时间。')) return
  incubating.value = true
  incubateResult.value = null
  incubateProgress.value = 10
  try {
    const data = {
      classroom_id: incubateClassroom.value || undefined,
      password: password.value,
    }
    incubateProgress.value = 30
    const result = await api.incubateSnapshots(data)
    incubateProgress.value = 100
    incubateResult.value = result
    showMsg(`成功生成 ${result.created} 条快照`)
  } catch (e) {
    showMsg(e.response?.data?.error || '生成失败', 'error')
  } finally {
    incubating.value = false
  }
}

async function doClean() {
  if (!confirm('确定要清理快照吗？此操作不可恢复！')) return
  cleaning.value = true
  cleanResult.value = null
  try {
    const data = {
      classroom_id: cleanClassroom.value || undefined,
      date_from: cleanDateFrom.value || undefined,
      date_to: cleanDateTo.value || undefined,
      password: password.value,
    }
    const result = await api.cleanSnapshots(data)
    cleanResult.value = result.deleted
    showMsg(`成功清理 ${result.deleted} 条快照`)
  } catch (e) {
    showMsg(e.response?.data?.error || '清理失败', 'error')
  } finally {
    cleaning.value = false
  }
}

onMounted(async () => {
  classrooms.value = await api.getClassrooms()
})
</script>
