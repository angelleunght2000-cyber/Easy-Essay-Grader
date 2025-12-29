import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Support both QWEN_API_KEY and DASHSCOPE_API_KEY (like Python SDK)
    const apiKey = env.QWEN_API_KEY || env.DASHSCOPE_API_KEY;
    // Support configurable base URL (mainland vs international)
    const baseUrl = env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/qwen': {
            target: baseUrl,
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path.replace(/^\/api\/qwen/, ''),
            configure: (proxy) => {
              proxy.on('proxyReq', (proxyReq) => {
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
              });
            },
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.QWEN_API_KEY': JSON.stringify(apiKey),
        'process.env.DASHSCOPE_API_KEY': JSON.stringify(apiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
