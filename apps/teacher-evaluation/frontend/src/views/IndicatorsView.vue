<template>
  <v-container>
    <h2 class="text-h5 mb-4">指标管理</h2>

    <v-alert type="info" class="mb-4">
      系统预置了三套评价指标集，分别对应三种评价视角。指标集为只读，不可修改。
    </v-alert>

    <v-row>
      <v-col cols="12" md="4" v-for="set in indicatorSets" :key="set.perspective">
        <v-card>
          <v-card-title class="d-flex align-center">
            <span>{{ perspectiveLabel(set.perspective) }}</span>
            <v-spacer />
            <v-chip :color="perspectiveColor(set.perspective)" size="small">
              满分 {{ calculateMax(set.indicators) }} 分
            </v-chip>
          </v-card-title>
          <v-card-text>
            <v-table density="compact">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th>满分</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ind in set.indicators" :key="ind.code">
                  <td><strong>{{ ind.code }}</strong></td>
                  <td>{{ ind.name }}</td>
                  <td>{{ ind.max }}</td>
                </tr>
              </tbody>
            </v-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-alert v-if="indicatorSets.length === 0" type="info">
      正在加载指标集...
    </v-alert>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const indicatorSets = ref([])

const perspectiveMap = {
  peer: '组内互评',
  group_review: '考核组评价',
  admin_review: '行政评价',
}

const perspectiveColorMap = {
  peer: 'blue',
  group_review: 'green',
  admin_review: 'orange',
}

function perspectiveLabel(p) {
  return perspectiveMap[p] || p
}

function perspectiveColor(p) {
  return perspectiveColorMap[p] || 'grey'
}

function calculateMax(indicators) {
  return indicators.reduce((sum, ind) => sum + ind.max, 0)
}

onMounted(async () => {
  const sets = await api.getIndicatorSets()
  indicatorSets.value = sets.map(s => ({
    perspective: s.perspective,
    indicators: typeof s.indicators === 'string' ? JSON.parse(s.indicators) : s.indicators,
  }))
})
</script>
