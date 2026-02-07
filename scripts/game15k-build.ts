import fs from 'node:fs/promises';
import path from 'node:path';
import { minify } from 'terser';

function assertSafeOutDir(outDir: string) {
  const norm = path.normalize(outDir);
  if (!norm.endsWith(path.normalize('apps/web/public/game'))) {
    throw new Error(`Refusing to write outside apps/web/public/game: ${outDir}`);
  }
}

function minifyCss(css: string): string {
  return (
    css
      // Strip block comments.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Collapse whitespace.
      .replace(/\s+/g, ' ')
      // Remove spaces around punctuation.
      .replace(/\s*([{}:;,])\s*/g, '$1')
      // Remove trailing semicolons before close braces.
      .replace(/;}/g, '}')
      .trim() + '\n'
  );
}

function minifyHtml(html: string): string {
  return (
    html
      // Remove HTML comments.
      .replace(/<!--[\s\S]*?-->/g, '')
      // Collapse whitespace between tags.
      .replace(/>\s+</g, '><')
      .trim() + '\n'
  );
}

async function cleanDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
  const entries = await fs.readdir(dir);
  for (const e of entries) {
    const full = path.join(dir, e);
    await fs.rm(full, { recursive: true, force: true });
  }
}

async function main() {
  const root = process.cwd();
  const srcDir = path.join(root, 'apps/game15k/src');
  const outDir = path.join(root, 'apps/web/public/game');

  assertSafeOutDir(outDir);

  const [html, css, js] = await Promise.all([
    fs.readFile(path.join(srcDir, 'index.html'), 'utf8'),
    fs.readFile(path.join(srcDir, 'style.css'), 'utf8'),
    fs.readFile(path.join(srcDir, 'game.js'), 'utf8'),
  ]);

  const jsMin = await minify(js, {
    compress: {
      passes: 2,
      toplevel: true,
      booleans_as_integers: true,
      drop_console: true,
      keep_fargs: false,
    },
    mangle: { toplevel: true },
  });

  if (!jsMin.code) throw new Error('terser produced empty output');

  const outHtml = minifyHtml(html);
  const outCss = minifyCss(css);
  const outJs = jsMin.code.trim() + '\n';

  await cleanDir(outDir);
  await Promise.all([
    fs.writeFile(path.join(outDir, 'index.html'), outHtml, 'utf8'),
    fs.writeFile(path.join(outDir, 'style.css'), outCss, 'utf8'),
    fs.writeFile(path.join(outDir, 'game.js'), outJs, 'utf8'),
  ]);

  const sizes = await Promise.all([
    fs.stat(path.join(outDir, 'index.html')),
    fs.stat(path.join(outDir, 'style.css')),
    fs.stat(path.join(outDir, 'game.js')),
  ]);
  const total = sizes[0].size + sizes[1].size + sizes[2].size;
  console.log(
    JSON.stringify(
      {
        outDir,
        bytes: {
          html: sizes[0].size,
          css: sizes[1].size,
          js: sizes[2].size,
          total,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
