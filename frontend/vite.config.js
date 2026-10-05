import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({root:fileURLToPath(new URL('.',import.meta.url)),plugins:[react()],server:{host:'127.0.0.1',proxy:{'/api':{target:'http://127.0.0.1:5000',changeOrigin:false}}},build:{outDir:'../dist/client',emptyOutDir:true,rolldownOptions:{output:{codeSplitting:{groups:[{name:'charts',test:/recharts/},{name:'maps',test:/leaflet/}]}}}}});
