import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

const projectRoot = resolve(__dirname);

// Какой вход собираем в этом проходе. Пусто = финальный проход (popup + манифест + ассеты).
const TARGET = process.env.BUILD_TARGET || '';

function copyDir(src: string, dst: string) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const s = resolve(src, entry.name);
    const d = resolve(dst, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

// Финальный плагин: манифест + иконки + правка popup html. Только на проходе popup.
function finalizePlugin() {
  return {
    name: 'accounts-helper-finalize',
    writeBundle() {
      const distDir = resolve(projectRoot, 'dist');
      const publicDir = resolve(projectRoot, 'public');
      mkdirSync(distDir, { recursive: true });

      // иконки / статика
      if (existsSync(publicDir)) copyDir(publicDir, distDir);

      // манифест в корень dist
      const manifest = JSON.parse(
        readFileSync(resolve(projectRoot, 'src', 'manifest.json'), 'utf8'),
      );
      writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // popup html: Vite пишет абсолютные пути и crossorigin — чиним под расширение
      const popupSrc = resolve(distDir, 'src/popup/index.html');
      const popupDst = resolve(distDir, 'popup/index.html');
      if (existsSync(popupSrc)) {
        mkdirSync(resolve(popupDst, '..'), { recursive: true });
        let html = readFileSync(popupSrc, 'utf8');
        html = html.replace(/(src|href)="\/([^"]+)"/g, '$1="$2"');
        html = html.replace(/ crossorigin/g, '');
        writeFileSync(popupDst, html);
      }
    },
  };
}

const common = {
  resolve: { alias: { '@': resolve(projectRoot, 'src') } },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    sourcemap: true,
    target: 'es2022',
    modulePreload: false,
  },
};

export default defineConfig(() => {
  // ---- проход BACKGROUND: один self-contained файл, без чанков ----
  if (TARGET === 'background') {
    return {
      ...common,
      build: {
        ...common.build,
        emptyOutDir: true,
        lib: {
          entry: resolve(projectRoot, 'src/background/index.ts'),
          formats: ['es'],
          fileName: () => 'background.js',
        },
        rollupOptions: {
          output: { inlineDynamicImports: true, entryFileNames: 'background.js' },
        },
      },
    };
  }

  // ---- проход CONTENT: один файл, IIFE ----
  if (TARGET === 'content') {
    return {
      ...common,
      build: {
        ...common.build,
        lib: {
          entry: resolve(projectRoot, 'src/content/index.ts'),
          formats: ['iife'],
          name: 'AccountsHelperContent',
          fileName: () => 'content.js',
        },
        rollupOptions: {
          output: { inlineDynamicImports: true, entryFileNames: 'content.js' },
        },
      },
    };
  }

  // ---- проход POPUP: обычная HTML-страница ----
  return {
    ...common,
    plugins: [finalizePlugin()],
    build: {
      ...common.build,
      rollupOptions: {
        input: { popup: resolve(projectRoot, 'src/popup/index.html') },
        output: {
          entryFileNames: 'popup/popup.js',
          chunkFileNames: 'popup/[name].js',
          assetFileNames: (a: { name?: string }) => {
            const n = a.name || '';
            if (n.endsWith('.css')) return 'popup/[name][extname]';
            return 'assets/[name][extname]';
          },
        },
      },
    },
  };
});
