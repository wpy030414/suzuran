<template>
  <v-container>
    <h2 class="text-h5 mb-4">申请用车</h2>

    <v-card>
      <v-card-text>
        <v-text-field v-model="form.purpose" label="用车用途" class="mb-4" />
        <v-text-field v-model="form.departure_time" type="datetime-local" label="出发时间" class="mb-4" />
        <v-text-field v-model="form.return_time" type="datetime-local" label="预计返回时间" class="mb-4" />
        <v-text-field v-model="form.destination" label="目的地" class="mb-4" />
        <v-text-field v-model="form.passengers" label="乘车人员" class="mb-4" />
        <v-text-field v-model="form.contact_phone" label="联系电话" class="mb-4" />

        <v-btn color="primary" @click="submit">提交申请</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api.js'

const router = useRouter()
const form = ref({
  purpose: '',
  departure_time: '',
  return_time: '',
  destination: '',
  passengers: '',
  contact_phone: ''
})

async function submit() {
  await api.createRequest({
    user_id: 1, // TODO: get from auth context
    purpose: form.value.purpose,
    departure_time: form.value.departure_time,
    return_time: form.value.return_time,
    destination: form.value.destination,
    passengers: form.value.passengers,
    contact_phone: form.value.contact_phone,
    status: 'pending'
  })
  router.push('/')
}
</script>
