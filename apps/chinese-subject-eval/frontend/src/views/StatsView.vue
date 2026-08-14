<template>
  <v-container>
    <h2 class="text-h5 mb-4">统计</h2>

    <v-row>
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>习作评价统计</v-card-title>
          <v-card-text>
            <div class="text-h4 mb-2">{{ compositionStats.total_count || 0 }}</div>
            <div class="text-body-2 text-grey mb-4">总评价次数</div>
            <div class="text-h6 mb-2">{{ compositionStats.student_count || 0 }} 名学生参与</div>

            <div v-if="compositionStats.grade_distribution && Object.keys(compositionStats.grade_distribution).length > 0">
              <div class="text-subtitle-2 mb-2">等级分布</div>
              <div v-for="(count, grade) in compositionStats.grade_distribution" :key="grade" class="mb-2">
                <div class="d-flex align-center ga-2">
                  <span style="min-width:80px">{{ grade }}</span>
                  <v-progress-linear :value="getPercentage(count, compositionStats.total_count)" color="blue" height="20" rounded>
                    <template #default>{{ count }} ({{ getPercentage(count, compositionStats.total_count).toFixed(1) }}%)</template>
                  </v-progress-linear>
                </div>
              </div>
            </div>
            <v-alert v-else type="info" variant="tonal" density="compact">暂无数据</v-alert>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>口语评价统计</v-card-title>
          <v-card-text>
            <div class="text-h4 mb-2">{{ oralStats.total_count || 0 }}</div>
            <div class="text-body-2 text-grey mb-4">总评价次数</div>
            <div class="text-h6 mb-2">{{ oralStats.student_count || 0 }} 名学生参与</div>

            <div v-if="oralStats.grade_distribution && Object.keys(oralStats.grade_distribution).length > 0">
              <div class="text-subtitle-2 mb-2">等级分布</div>
              <div v-for="(count, grade) in oralStats.grade_distribution" :key="grade" class="mb-2">
                <div class="d-flex align-center ga-2">
                  <span style="min-width:80px">{{ grade }}</span>
                  <v-progress-linear :value="getPercentage(count, oralStats.total_count)" color="green" height="20" rounded>
                    <template #default>{{ count }} ({{ getPercentage(count, oralStats.total_count).toFixed(1) }}%)</template>
                  </v-progress-linear>
                </div>
              </div>
            </div>
            <v-alert v-else type="info" variant="tonal" density="compact">暂无数据</v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const compositionStats = ref({})
const oralStats = ref({})

function getPercentage(count, total) {
  if (!total || total === 0) return 0
  return (count / total) * 100
}

onMounted(async () => {
  compositionStats.value = await api.getCompositionStats()
  oralStats.value = await api.getOralStats()
})
</script>
