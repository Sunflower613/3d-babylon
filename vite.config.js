import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'serve-parent-assets',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const relativeUrl = req.url.split('?')[0];
          
          // Match /games/*, /images/* or root-level parent assets like class.html, album.html, etc.
          const isParentAsset = relativeUrl.match(/^\/(games|images)\//) || 
                                relativeUrl.match(/^\/[^\/]+\.(html|js|css|png|jpg|ico)$/);
                                
          if (isParentAsset) {
            const fullPath = path.resolve(__dirname, '..', relativeUrl.replace(/^\//, ''));
            
            if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
              const ext = path.extname(fullPath).toLowerCase();
              const mimeTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.ico': 'image/x-icon'
              };
              res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
              res.end(fs.readFileSync(fullPath));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    open: true,
    allowedHosts: ['.pengyg.top', 'pengyg.top'],
    fs: {
      allow: ['..'] // Allow importing siteConfig from parent directory
    },
    // Proxy API and WebSocket requests to the Go backend running on port 8080
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: './dist',
    emptyOutDir: true
  }
});
