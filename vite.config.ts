import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import fs from 'fs-extra'

// copy vs
const vsDist = path.resolve(__dirname, 'src/renderer/public/vs')
if (!fs.existsSync(vsDist)) {
  fs.copySync(
    path.resolve(__dirname, 'node_modules/monaco-editor/min/vs'),
    vsDist
  )
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  root: 'src/renderer',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  },
  server: {
    port: 8066,
    proxy: {
      '/static': {
        target: 'http://127.0.0.1:3044'
      },
      '/custom-css': {
        target: 'http://127.0.0.1:3044'
      },
      '/extension': {
        target: 'http://127.0.0.1:3044'
      },
      '/github.css': {
        target: 'http://127.0.0.1:3044'
      },
      '/api': {
        target: 'http://127.0.0.1:3044'
      },
      '/ws': {
        target: 'http://127.0.0.1:3044',
        ws: true
      }
    }
  },
  resolve: {
    alias: [
      { find: /^semver$/, replacement: path.resolve(__dirname, 'src/renderer/others/semver.js') },
      { find: /^socket.io-client$/, replacement: 'socket.io-client/dist/socket.io.js' },
      { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
      { find: /^@\//, replacement: path.resolve(__dirname, 'src') + '/' },
      { find: /^@fe\//, replacement: path.resolve(__dirname, 'src', 'renderer') + '/' },
      { find: /^@share\//, replacement: path.resolve(__dirname, 'src', 'share') + '/' },
    ]
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/renderer/index.html'),
        embed: path.resolve(__dirname, 'src/renderer/embed/index.html')
      }
    }
  }
})
