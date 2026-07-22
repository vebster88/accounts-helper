import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

const projectRoot = resolve(__dirname);

// Rollup plugin to generate the final manifest.json into dist root.
function manifestPlugin() {
  return {
    name: 'accounts-helper-manifest',
    writeBundle() {
      const distDir = resolve(projectRoot, 'dist');
      const publicDir = resolve(projectRoot, 'public');
      mkdirSync(distDir, { recursive: true });

      const manifestPath = resolve(projectRoot, 'src', 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

      // Copy public assets (icons) into dist.
      function copyDir(src: string, dst: string) {
        mkdirSync(dst, { recursive: true });
        for (const entry of readdirSync(src, { withFileTypes: true })) {
          const s = resolve(src, entry.name);
          const d = resolve(dst, entry.name);
          if (entry.isDirectory()) {
            copyDir(s, d);
          } else {
            copyFileSync(s, d);
          }
        }
      }
      copyDir(publicDir, distDir);

      // Write manifest into dist root.
      writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(projectRoot, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: true,
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        background: resolve(projectRoot, 'src/background/index.html'),
        popup: resolve(projectRoot, 'src/popup/index.html'),
        content: resolve(projectRoot, 'src/content/index.html'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'popup') return 'popup/popup.js';
          if (chunkInfo.name === 'content') return 'content.js';
          return '[name].js';
        },
        chunkFileNames: 'shared/[name].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.css')) {
            if (name.includes('popup')) return 'popup/[name][extname]';
            return 'assets/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
  plugins: [manifestPlugin()],
});
