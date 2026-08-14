import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './App.vue'
import router from './router/index.js'

const vuetify = createVuetify({ components, directives, theme: { defaultTheme: 'light' } })
const app = createApp(App)
app.use(createPinia()).use(router).use(vuetify)
app.mount('#app')
