import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin para copiar el archivo de audio de alarma
const copyAlarmSoundPlugin = () => ({
    name: 'copy-alarm-sound',
    buildStart() {
        const src = path.resolve(__dirname, 'Los Simpson - Intro.mp3')
        const dest = path.resolve(__dirname, 'public/alarm-sound.mp3')
        
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest)
            console.log('✓ Audio de alarma copiado a public/alarm-sound.mp3')
        } else {
            console.warn('⚠ No se encontró "Los Simpson - Intro.mp3" en la raíz del proyecto')
        }
    }
})

export default defineConfig({
    plugins: [
        react(),
        copyAlarmSoundPlugin()
    ],
    server: {
        port: 5173,
        open: false
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
                    react: ['react', 'react-dom', 'react-router-dom']
                }
            }
        }
    }
})
