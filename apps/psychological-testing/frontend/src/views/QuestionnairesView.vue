<template>
  <v-container>
    <h2 class="text-h5 mb-4">问卷管理</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">新增问卷</v-btn>

    <v-table density="compact">
      <thead>
        <tr>
          <th>标题</th>
          <th>描述</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="q in questionnaires" :key="q.id">
          <td>{{ q.title }}</td>
          <td>{{ q.description }}</td>
          <td>
            <v-chip :color="q.status === 'active' ? 'success' : 'grey'" size="small">
              {{ q.status === 'active' ? '启用' : '禁用' }}
            </v-chip>
          </td>
          <td>
            <v-btn size="small" color="error" @click="remove(q.id)">删除</v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="700">
      <v-card>
        <v-card-title>新增问卷</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="标题" />
          <v-textarea v-model="form.description" label="描述" rows="2" />
          <v-textarea v-model="form.questions" label="题目（JSON格式）" rows="5" />
          <v-textarea v-model="form.scoring_rules" label="评分规则（JSON格式）" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const questionnaires = ref([])
const dialog = ref(false)
const form = ref({ title: '', description: '', questions: '[]', scoring_rules: '{}' })

async function save() {
  await api.createQuestionnaire({
    title: form.value.title,
    description: form.value.description,
    questions: form.value.questions,
    scoring_rules: form.value.scoring_rules,
    status: 'active'
  })
  dialog.value = false
  questionnaires.value = await api.getQuestionnaires()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteQuestionnaire(id)
    questionnaires.value = await api.getQuestionnaires()
  }
}

onMounted(async () => {
  questionnaires.value = await api.getQuestionnaires()
})
</script>
