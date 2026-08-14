<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>大眼睛</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-home" title="首页" to="/" />
        <v-list-item prepend-icon="mdi-newspaper" title="新闻" to="/news" />
        <v-list-item prepend-icon="mdi-book-open-variant" title="教程" to="/tutorials" />
        <v-list-item prepend-icon="mdi-forum" title="帖子" to="/posts" />
        <v-list-item prepend-icon="mdi-palette" title="艺术作品" to="/artworks" />
      </v-list>
    </v-navigation-drawer>
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
