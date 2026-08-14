<template>
  <v-container>
    <h2 class="text-h5 mb-4">新闻</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">发布新闻</v-btn>

    <v-row>
      <v-col cols="12" md="6" v-for="article in news" :key="article.id">
        <v-card>
          <v-img v-if="article.cover_image_url" :src="article.cover_image_url" height="200" />
          <v-card-title>{{ article.title }}</v-card-title>
          <v-card-subtitle>{{ article.published_at }}</v-card-subtitle>
          <v-card-text>{{ article.content.substring(0, 150) }}...</v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn color="error" size="small" @click="remove(article.id)">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>发布新闻</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="标题" />
          <v-textarea v-model="form.content" label="内容" rows="5" />
          <v-text-field v-model="form.cover_image_url" label="封面图片URL" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">发布</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const news = ref([])
const dialog = ref(false)
const form = ref({ title: '', content: '', cover_image_url: '' })

async function save() {
  await api.createNews({
    title: form.value.title,
    content: form.value.content,
    cover_image_url: form.value.cover_image_url,
    author_id: 1,
    status: 'published',
    published_at: new Date().toISOString(),
    view_count: 0
  })
  dialog.value = false
  news.value = await api.getNews()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteNews(id)
    news.value = await api.getNews()
  }
}

onMounted(async () => {
  news.value = await api.getNews()
})
</script>
