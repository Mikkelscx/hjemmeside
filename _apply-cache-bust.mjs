import fs from 'fs';
import path from 'path';

const roots = [
  process.cwd(),
  path.join(process.cwd(), 'hjemmesiden'),
];

const META = `    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">`;

const CSS_SNIPPET = `<script>
    (function () {
        window.mskAssetV = Date.now();
        document.write('<link rel="stylesheet" href="styles.css?v=' + window.mskAssetV + '">');
    })();
    </script>
    <noscript><link rel="stylesheet" href="styles.css"></noscript>`;

const JS_SNIPPET = `<script>
    (function () {
        document.write('<script src="script.js?v=' + (window.mskAssetV || Date.now()) + '"><\\/script>');
    })();
    </script>`;

function bustTag(kind, file) {
  const attr = kind === 'css' ? `rel="stylesheet" href="${file}?v=' + v + '"` : `src="${file}?v=' + v + '"`;
  const tag = kind === 'css'
    ? `'<link rel="stylesheet" href="${file}?v=' + v + '">'`
    : `'<script src="${file}?v=' + v + '"><\\/script>'`;
  return `<script>(function(){var v=window.mskAssetV||Date.now();document.write(${tag});})();</script>`;
}

function ensureMeta(html) {
  if (/http-equiv="Cache-Control"/i.test(html)) {
    if (!/http-equiv="Expires"/i.test(html)) {
      html = html.replace(
        /(<meta http-equiv="Pragma"[^>]*>)/i,
        `$1\n    <meta http-equiv="Expires" content="0">`
      );
    }
    return html;
  }
  if (/<meta name="viewport"[^>]*>/i.test(html)) {
    return html.replace(/(<meta name="viewport"[^>]*>)/i, `$1\n${META}`);
  }
  return html.replace(/(<meta charset="UTF-8">)/i, `$1\n${META}`);
}

function apply(html) {
  html = ensureMeta(html);
  html = html.replace(
    /<link rel="stylesheet" href="styles\.css(?:\?[^"]*)?">/g,
    CSS_SNIPPET
  );
  html = html.replace(
    /<script src="script\.js(?:\?[^"]*)?"><\/script>/g,
    JS_SNIPPET
  );
  const extras = [
    ['css', 'projects-ipad-portrait-lock.css'],
    ['css', 'projects-phone-portrait-lock.css'],
    ['js', 'projects-phone-portrait-profiles.js'],
    ['js', 'projects-ipad-portrait-lock.js'],
  ];
  for (const [kind, file] of extras) {
    const re = kind === 'css'
      ? new RegExp(`<link rel="stylesheet" href="${file.replace('.', '\\.')}(?:\\?[^"]*)?">`, 'g')
      : new RegExp(`<script src="${file.replace('.', '\\.')}(?:\\?[^"]*)?"><\\/script>`, 'g');
    html = html.replace(re, bustTag(kind, file));
  }
  return html;
}

for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const name of fs.readdirSync(root)) {
    if (!name.endsWith('.html')) continue;
    const file = path.join(root, name);
    const before = fs.readFileSync(file, 'utf8');
    const after = apply(before);
    if (after !== before) {
      fs.writeFileSync(file, after);
      console.log('updated', path.relative(process.cwd(), file));
    }
  }
}
