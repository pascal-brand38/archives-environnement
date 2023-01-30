import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import eslint from 'vite-plugin-eslint'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/archives-environnement/',   // https://dev.to/shashannkbawa/deploying-vite-app-to-github-pages-3ane
  plugins: [
    react(),
    // eslint(),
  ],
  server: { fs: { allow: ['..'], } }
})


