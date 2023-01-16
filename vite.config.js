import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/archives-environnement/',   // https://dev.to/shashannkbawa/deploying-vite-app-to-github-pages-3ane
  plugins: [react()],
  server: { fs: { allow: ['..'], } }
})
