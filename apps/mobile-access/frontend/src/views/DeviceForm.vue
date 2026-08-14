<template>
  <v-container>
    <h2 class="text-h5 mb-4">{{ isEdit ? '编辑设备' : '添加设备' }}</h2>

    <v-form @submit.prevent="save">
      <v-card>
        <v-card-text>
          <v-text-field
            v-model="form.name"
            label="设备名称 *"
            :rules="[v => !!v || '名称不能为空']"
          />
          <v-text-field
            v-model="form.ezcloud_device_id"
            label="EZCloud 设备ID *"
            :rules="[v => !!v || '设备ID不能为空']"
          />
          <v-select
            v-model="form.device_type"
            :items="deviceTypes"
            label="设备类型"
          />
          <v-select
            v-model="form.protocol"
            :items="protocols"
            label="协议"
          />
          <v-text-field
            v-model="form.location"
            label="位置"
          />
          <v-text-field
            v-model="form.ip_address"
            label="IP 地址"
          />
          <v-text-field
            v-model.number="form.port"
            label="端口"
            type="number"
          />
          <v-text-field
            v-model.number="form.open_duration"
            label="开门时长（秒）"
            type="number"
            min="1"
            max="60"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="$router.back()">取消</v-btn>
          <v-btn type="submit" color="primary">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-form>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api.js'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)

const deviceTypes = [
  { title: '门', value: 'door' },
  { title: '闸机', value: 'gate' },
  { title: '道闸', value: 'barrier' }
]

const protocols = [
  { title: 'EZCloud', value: 'ezcloud' },
  { title: '本地', value: 'local' }
]

const form = ref({
  name: '',
  ezcloud_device_id: '',
  device_type: 'door',
  protocol: 'ezcloud',
  location: '',
  ip_address: '',
  port: null,
  open_duration: 5
})

async function save() {
  if (isEdit.value) {
    await api.updateDevice(route.params.id, form.value)
  } else {
    await api.createDevice(form.value)
  }
  router.push('/')
}

onMounted(async () => {
  if (isEdit.value) {
    const devices = await api.getDevices()
    const device = devices.find(d => d.id === parseInt(route.params.id))
    if (device) {
      form.value = { ...device }
    }
  }
})
</script>
