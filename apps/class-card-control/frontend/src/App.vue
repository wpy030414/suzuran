<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click="drawer = !drawer" />
      <v-toolbar-title>电子班牌集控</v-toolbar-title>
    </v-app-bar>
    <v-navigation-drawer v-model="drawer" temporary>
      <v-list>
        <v-list-item prepend-icon="mdi-monitor" title="终端管理" to="/" />
        <v-list-item prepend-icon="mdi-playlist-play" title="播放列表" to="/playlists" />
        <v-list-item prepend-icon="mdi-cog" title="配置管理" to="/configs" />
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
