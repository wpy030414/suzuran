<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计报表</h2>

    <v-row class="mb-4">
      <v-col cols="12" md="3">
        <v-card color="primary" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.total || 0 }}</div>
            <div class="text-caption">总任务数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="success" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.completionRate || 0 }}%</div>
            <div class="text-caption">完成率</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="error" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ stats.avgBlockedDays || 0 }}</div>
            <div class="text-caption">平均阻塞天数</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="3">
        <v-card color="warning" variant="tonal">
          <v-card-text class="text-center">
            <div class="text-h4 font-weight-bold">{{ Object.keys(stats.assigneeCounts || {}).length }}</div>
            <div class="text-caption">参与执行人数</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>按状态统计</v-card-title>
          <v-card-text>
            <div v-for="(count, status) in stats.statusCounts" :key="status" class="d-flex align-center mb-2">
              <v-chip :color="statusColor(status)" size="small" class="mr-2">{{ statusText(status) }}</v-chip>
              <v-progress-linear :model-value="(count / stats.total) * 100" class="flex-grow-1 mx-2" />
              <span class="font-weight-bold">{{ count }}</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>按学校统计</v-card-title>
          <v-card-text>
            <div v-for="(count, school) in stats.bySchool" :key="school" class="d-flex align-center mb-2">
              <span class="text-body-2 mr-2" style="width: 120px;">{{ school }}</span>
              <v-progress-linear :model-value="(count / stats.total) * 100" class="flex-grow-1 mx-2" color="info" />
              <span class="font-weight-bold">{{ count }}</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>按标签统计</v-card-title>
          <v-card-text>
            <div v-for="(count, tag) in stats.tagCounts" :key="tag" class="d-flex align-center mb-2">
              <v-chip size="small" class="mr-2">{{ tag }}</v-chip>
              <v-progress-linear :model-value="(count / stats.total) * 100" class="flex-grow-1 mx-2" color="purple" />
              <span class="font-weight-bold">{{ count }}</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>按执行人统计</v-card-title>
          <v-card-text>
            <div v-for="(count, user) in stats.assigneeCounts" :key="user" class="d-flex align-center mb-2">
              <span class="text-body-2 mr-2" style="width: 120px;">{{ user }}</span>
              <v-progress-linear :model-value="(count / stats.total) * 100" class="flex-grow-1 mx-2" color="teal" />
              <span class="font-weight-bold">{{ count }}</span>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const stats = ref({})

function statusColor(s) {
  return { pending: 'warning', in_progress: 'info', blocked: 'error', completed: 'success', cancelled: 'grey' }[s] || 'grey'
}

function statusText(s) {
  return { pending: '待处理', in_progress: '进行中', blocked: '已阻塞', completed: '已完成', cancelled: '已取消' }[s] || s
}

onMounted(async () => {
  stats.value = await api.getStatistics()
})
</script>
