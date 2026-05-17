import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    base: '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    server: {
        port: 8080,
        host: true,
        strictPort: false
    },
    publicDir: 'public',
    build: {
        assetsInlineLimit: 0,
        rollupOptions: {
            output: {
                assetFileNames: (assetInfo) => {
                    if (/^tile\d+\.(png|jpg|jpeg|svg)$/.test(assetInfo.name)) {
                        return 'custom-icons/[name][extname]'
                    }
                    return 'assets/[name]-[hash][extname]'
                }
            }
        }
    }
})