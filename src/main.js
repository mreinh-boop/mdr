import { createApp } from 'vue'
import { BccComponentLibrary } from '@bcc-code/component-library-vue'
import App from './App.vue'
import './style.css'
import { start } from './data/store.js'

const app = createApp(App)
app.use(BccComponentLibrary)
app.mount('#app')
start()
