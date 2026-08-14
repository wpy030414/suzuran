<template>
  <v-container>
    <h2 class="text-h5 mb-4">发布公文</h2>

    <v-card>
      <v-card-text>
        <v-text-field v-model="form.title" label="标题" class="mb-4" />
        <v-textarea v-model="form.content" label="内容" rows="6" class="mb-4" />
        <v-text-field v-model="form.file_url" label="附件URL（可选）" class="mb-4" />

        <v-select
          v-model="form.tag_ids"
          :items="tags"
          item-title="name"
          item-value="id"
          label="选择标签"
          multiple
          chips
          class="mb-4"
        />

        <v-btn color="primary" @click="publish">发布</v-btn>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api.js'

const router = useRouter()
const tags = ref([])
const form = ref({ title: '', content: '', file_url: '', tag_ids: [] })

async function publish() {
  await api.createDocument({
    title: form.value.title,
    content: form.value.content,
    file_url: form.value.file_url,
    tag_ids: form.value.tag_ids
  })
  router.push('/')
}

onMounted(async () => {
  tags.value = await api.getTags()
})
</script>
