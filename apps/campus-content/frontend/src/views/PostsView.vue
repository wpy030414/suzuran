<template>
  <v-container>
    <h2 class="text-h5 mb-4">帖子</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">发布帖子</v-btn>
    <v-btn color="secondary" @click="loadRanked" class="mb-4 ml-2">按热度排序</v-btn>

    <v-row>
      <v-col cols="12" md="6" v-for="post in posts" :key="post.id">
        <v-card>
          <v-card-title>{{ post.title }}</v-card-title>
          <v-card-text>{{ post.content }}</v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="like(post.id)">
              <v-icon>mdi-thumb-up</v-icon>
              {{ post.like_count }}
            </v-btn>
            <v-spacer />
            <v-btn color="error" size="small" @click="remove(post.id)">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>发布帖子</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.title" label="标题" />
          <v-textarea v-model="form.content" label="内容" rows="4" />
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

const posts = ref([])
const dialog = ref(false)
const form = ref({ title: '', content: '' })

async function save() {
  await api.createPost({
    title: form.value.title,
    content: form.value.content,
    author_id: 1,
    like_count: 0,
    status: 'published'
  })
  dialog.value = false
  posts.value = await api.getPosts()
}

async function like(id) {
  await api.toggleLike({ target_type: 'post', target_id: id, user_id: 1 })
  posts.value = await api.getPosts()
}

async function loadRanked() {
  posts.value = await api.getPostsRanked()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deletePost(id)
    posts.value = await api.getPosts()
  }
}

onMounted(async () => {
  posts.value = await api.getPosts()
})
</script>
