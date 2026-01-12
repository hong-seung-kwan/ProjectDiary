import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { MinifyOptions } from 'terser'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    minify: 'terser', // 더 강력한 압축 적용
    terserOptions: {
      compress: {
        drop_console: true,    // 콘솔 로그 제거
        drop_debugger: true,   // debugger 제거
      },
      format: {
        comments: false,       // 주석 제거
      },
    } as MinifyOptions,
  },
})
