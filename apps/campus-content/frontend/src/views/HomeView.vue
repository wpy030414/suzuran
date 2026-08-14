<template>
  <v-container>
    <h2 class="text-h5 mb-4">大眼睛 - 校园内容平台</h2>
    <v-row>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>最新新闻</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="news in news.slice(0, 5)" :key="news.id">
                <v-list-item-title>{{ news.title }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn to="/news">查看全部</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>热门帖子</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="post in topPosts.slice(0, 5)" :key="post.id">
                <v-list-item-title>{{ post.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ post.like_count }} 赞</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn to="/posts">查看全部</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col cols="12" md="4">
        <v-card>
          <v-card-title>精选作品</v-card-title>
          <v-card-text>
            <v-list density="compact">
              <v-list-item v-for="art in topArtworks.slice(0, 5)" :key="art.id">
                <v-list-item-title>{{ art.category }}</v-list-item-title>
                <v-list-item-subtitle>{{ art.like_count }} 赞</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn to="/artworks">查看全部</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../api.js'

const news = ref([])
const topPosts = ref([])
const topArtworks = ref([])

onMounted(async () => {
  news.value = await api.getNews()
  topPosts.value = await api.getPostsRanked()
  topArtworks.value = await api.getArtworksRanked()
})
</script>
