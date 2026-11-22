// ============================================================
// Konversi Markdown <-> HTML untuk editor berita.
// Berita disimpan sebagai Markdown; contentEditable bekerja dengan HTML.
// ============================================================
import TurndownService from 'turndown';
import { tables } from 'turndown-plugin-gfm';
import { marked } from 'marked';

const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Plugin GFM: menangani konversi tabel ke Markdown.
turndown.use(tables);

// `<u>` tidak punya padanan Markdown standar; pertahankan sebagai HTML
// agar tidak hilang saat menyimpan (react-markdown me-render-nya kembali).
turndown.keep(['u']);

// `<s>` / `<del>` -> `~~coret~~` (GFM strikethrough).
turndown.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
});

/** HTML (dari contentEditable) -> Markdown */
export function htmlToMarkdown(html) {
  if (!html) return '';
  return turndown.turndown(html).trim();
}

/** Markdown -> HTML (untuk dirender di editor sebelum diedit) */
export function markdownToHtml(md) {
  if (!md) return '';
  return marked.parse(md, { gfm: true, breaks: true, async: false });
}
