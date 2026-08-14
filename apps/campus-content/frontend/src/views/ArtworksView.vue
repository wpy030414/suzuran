<template>
  <v-container>
    <h2 class="text-h5 mb-4">艺术作品</h2>
    <v-btn color="primary" @click="dialog = true" class="mb-4">上传作品</v-btn>
    <v-btn color="secondary" @click="loadRanked" class="mb-4 ml-2">按热度排序</v-btn>

    <v-row>
      <v-col cols="12" md="4" v-for="art in artworks" :key="art.id">
        <v-card>
          <v-img :src="art.image_url" height="200" />
          <v-card-title>{{ art.category }}</v-card-title>
          <v-card-text>{{ art.description }}</v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="like(art.id)">
              <v-icon>mdi-thumb-up</v-icon>
              {{ art.like_count }}
            </v-btn>
            <v-spacer />
            <v-btn color="error" size="small" @click="remove(art.id)">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="dialog" max-width="500">
      <v-card>
        <v-card-title>上传作品</v-card-title>
        <v-card-text>
          <v-text-field v-model="form.category" label="分类" />
          <v-text-field v-model="form.image_url" label="图片URL" />
          <v-textarea v-model="form.description" label="描述" rows="3" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="dialog = false">取消</v-btn>
          <v-btn color="primary" @click="save">上传</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const artworks = ref([])
const dialog = ref(false)
const form = ref({ category: '', image_url: '', description: '' })

async function save() {
  await api.createArtwork({
    student_id: 1,
    category: form.value.category,
    image_url: form.value.image_url,
    description: form.value.description,
    like_count: 0
  })
  dialog.value = false
  artworks.value = await api.getArtworks()
}

async function like(id) {
  await api.toggleLike({ target_type: 'artwork', target_id: id, user_id: 1 })
  artworks.value = await api.getArtworks()
}

async function loadRanked() {
  artworks.value = await api.getArtworksRanked()
}

async function remove(id) {
  if (confirm('确定删除？')) {
    await api.deleteArtwork(id)
    artworks.value = await api.getArtworks()
  }
}

onMounted(async () => {
  artworks.value = await api.getArtworks()
})
</script>
