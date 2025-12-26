import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Support both QWEN_API_KEY and DASHSCOPE_API_KEY (like Python SDK)
    const apiKey = env.QWEN_API_KEY || env.DASHSCOPE_API_KEY;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api/dashscope': {
            target: 'https://dashscope.aliyuncs.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/dashscope/, ''),
            configure: (proxy, options) => {
              proxy.on('proxyReq', (proxyReq, req, res) => {
                // Add authorization header
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('X-DashScope-SSE', 'disable');
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
