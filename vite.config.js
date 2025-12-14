
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rawTarget = process.env.VITE_RAW_DATA_URL || 'http://localhost:7000'
const storageTarget = process.env.VITE_DATA_STORAGE_URL || 'http://localhost:8000'
const mlTarget = process.env.VITE_ML_URL || 'http://localhost:8060'

export default defineConfig({
	plugins: [react()],
	envPrefix: ['VITE_'],
	server: {
		host: '0.0.0.0',
		port: 5173,
		proxy: {
			'/data-ingestion': {
				target: rawTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/data-ingestion/, '')
			},
			'/data-storage': {
				target: storageTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/data-storage/, '')
			}
			,'/pei-ml': {
				target: mlTarget,
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path.replace(/^\/pei-ml/, '')
			}
		}
	}
})
