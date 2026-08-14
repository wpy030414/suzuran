<template>
  <v-container>
    <h2 class="text-h5 mb-4">基础配置</h2>

    <v-tabs v-model="tab">
      <v-tab value="campuses">校区</v-tab>
      <v-tab value="shifts">班次</v-tab>
      <v-tab value="locations">地点</v-tab>
    </v-tabs>

    <v-window v-model="tab" class="mt-4">
      <v-window-item value="campuses">
        <v-btn color="primary" @click="campusDialog = true" class="mb-4">新增校区</v-btn>
        <v-table density="compact">
          <thead>
            <tr><th>名称</th><th>地址</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="c in campuses" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.address }}</td>
              <td>
                <v-btn size="small" color="error" @click="deleteCampus(c.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>

      <v-window-item value="shifts">
        <v-btn color="primary" @click="shiftDialog = true" class="mb-4">新增班次</v-btn>
        <v-table density="compact">
          <thead>
            <tr><th>校区</th><th>名称</th><th>开始时间</th><th>结束时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="s in shifts" :key="s.id">
              <td>{{ campuses.find(c => c.id === s.campus_id)?.name || s.campus_id }}</td>
              <td>{{ s.name }}</td>
              <td>{{ s.start_time }}</td>
              <td>{{ s.end_time }}</td>
              <td>
                <v-btn size="small" color="error" @click="deleteShift(s.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>

      <v-window-item value="locations">
        <v-btn color="primary" @click="locationDialog = true" class="mb-4">新增地点</v-btn>
        <v-table density="compact">
          <thead>
            <tr><th>校区</th><th>名称</th><th>描述</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in locations" :key="l.id">
              <td>{{ campuses.find(c => c.id === l.campus_id)?.name || l.campus_id }}</td>
              <td>{{ l.name }}</td>
              <td>{{ l.description }}</td>
              <td>
                <v-btn size="small" color="error" @click="deleteLocation(l.id)">删除</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-window-item>
    </v-window>

    <!-- Campus Dialog -->
    <v-dialog v-model="campusDialog" max-width="500">
      <v-card>
        <v-card-title>新增校区</v-card-title>
        <v-card-text>
          <v-text-field v-model="campusForm.name" label="名称" />
          <v-text-field v-model="campusForm.address" label="地址" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="campusDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveCampus">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Shift Dialog -->
    <v-dialog v-model="shiftDialog" max-width="500">
      <v-card>
        <v-card-title>新增班次</v-card-title>
        <v-card-text>
          <v-select v-model="shiftForm.campus_id" :items="campuses" item-title="name" item-value="id" label="校区" />
          <v-text-field v-model="shiftForm.name" label="名称" />
          <v-text-field v-model="shiftForm.start_time" type="time" label="开始时间" />
          <v-text-field v-model="shiftForm.end_time" type="time" label="结束时间" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="shiftDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveShift">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Location Dialog -->
    <v-dialog v-model="locationDialog" max-width="500">
      <v-card>
        <v-card-title>新增地点</v-card-title>
        <v-card-text>
          <v-select v-model="locationForm.campus_id" :items="campuses" item-title="name" item-value="id" label="校区" />
          <v-text-field v-model="locationForm.name" label="名称" />
          <v-textarea v-model="locationForm.description" label="描述" rows="2" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="locationDialog = false">取消</v-btn>
          <v-btn color="primary" @click="saveLocation">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const tab = ref('campuses')
const campuses = ref([])
const shifts = ref([])
const locations = ref([])

const campusDialog = ref(false)
const shiftDialog = ref(false)
const locationDialog = ref(false)

const campusForm = ref({ name: '', address: '' })
const shiftForm = ref({ campus_id: null, name: '', start_time: '', end_time: '' })
const locationForm = ref({ campus_id: null, name: '', description: '' })

async function saveCampus() {
  await api.createCampus(campusForm.value)
  campusDialog.value = false
  campuses.value = await api.getCampuses()
}

async function deleteCampus(id) {
  if (confirm('确定删除？')) {
    await api.deleteCampus(id)
    campuses.value = await api.getCampuses()
  }
}

async function saveShift() {
  await api.createShift({
    campus_id: parseInt(shiftForm.value.campus_id),
    name: shiftForm.value.name,
    start_time: shiftForm.value.start_time,
    end_time: shiftForm.value.end_time
  })
  shiftDialog.value = false
  shifts.value = await api.getShifts()
}

async function deleteShift(id) {
  if (confirm('确定删除？')) {
    await api.deleteShift(id)
    shifts.value = await api.getShifts()
  }
}

async function saveLocation() {
  await api.createLocation({
    campus_id: parseInt(locationForm.value.campus_id),
    name: locationForm.value.name,
    description: locationForm.value.description
  })
  locationDialog.value = false
  locations.value = await api.getLocations()
}

async function deleteLocation(id) {
  if (confirm('确定删除？')) {
    await api.deleteLocation(id)
    locations.value = await api.getLocations()
  }
}

onMounted(async () => {
  campuses.value = await api.getCampuses()
  shifts.value = await api.getShifts()
  locations.value = await api.getLocations()
})
</script>
