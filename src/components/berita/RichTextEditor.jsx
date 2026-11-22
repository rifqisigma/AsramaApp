import { useEffect, useRef, useState } from 'react';
import { htmlToMarkdown, markdownToHtml } from '../../utils/markdown';
import { uploadBeritaInlineImage } from '../../utils/berita';
import {
  Bold, Italic, Underline, Strikethrough, Highlighter,
  Heading1, Heading2, Heading3, Heading4, Pilcrow,
  List, ListOrdered, Quote, AlignLeft, AlignCenter, AlignRight,
  Minus, Link2, ImagePlus, Table, Code2, Undo2, Redo2,
  FileCode2, Eye, Loader2
} from 'lucide-react';

/** Tombol toolbar (di luar komponen agar tidak dibuat ulang tiap render). */
const ToolButton = ({ icon: Icon, title, onClick, active, disabled, isDark }) => {
  const [hover, setHover] = useState(false);
  const bg = active
    ? (isDark ? '#1E3A8A' : '#DBEAFE')
    : hover && !disabled
      ? (isDark ? '#263143' : '#F3F4F6')
      : 'transparent';

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '32px', height: '32px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: bg,
        color: active
          ? (isDark ? '#93C5FD' : '#1D4ED8')
          : (isDark ? '#CBD5E1' : '#374151'),
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.15s, color 0.15s'
      }}
    >
      <Icon size={16} />
    </button>
  );
};

const Divider = ({ isDark }) => (
  <span style={{
    width: '1px', height: '20px', flexShrink: 0,
    backgroundColor: isDark ? '#334155' : '#E5E7EB', margin: '0 2px'
  }} />
);

/**
 * Rich text editor berbasis contentEditable yang menghasilkan Markdown.
 * Nilai awal (`value`) adalah Markdown; perubahan dikirim sebagai Markdown.
 */
const RichTextEditor = ({ value = '', onChange, theme = 'light', minHeight = 320 }) => {
  const isDark = theme === 'dark';
  const editorRef = useRef(null);
  const imageInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState('rich'); // 'rich' | 'source'
  const [sourceValue, setSourceValue] = useState(value || '');
  const [charCount, setCharCount] = useState((value || '').length);

  // Muat nilai awal sekali (editor uncontrolled).
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(value || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => {
    if (!editorRef.current) return;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    setCharCount(md.length);
    onChange?.(md);
  };

  const exec = (command, arg) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const insertHtml = (html) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emit();
  };

  const addLink = () => {
    const url = window.prompt('Masukkan URL tautan:', 'https://');
    if (!url) return;
    if (url.startsWith('https://') || url.startsWith('http://')) {
      const selection = window.getSelection();
      const hasSelection = selection && !selection.isCollapsed && selection.toString().trim() !== '';
      if (hasSelection) {
        exec('createLink', url);
      } else {
        exec('insertHTML', `<a href="${url}">${url}</a>`);
      }
    }
  };

  const handleImagePick = () => imageInputRef.current?.click();

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar.');
      return;
    }
    setUploading(true);
    try {
      const url = await uploadBeritaInlineImage(file);
      exec('insertImage', url);
    } catch (err) {
      console.error(err);
      alert('Gagal mengunggah gambar: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const insertTable = () => {
    const rows = '<tr><td>&nbsp;</td><td>&nbsp;</td></tr>'.repeat(2);
    insertHtml(
      `<table><thead><tr><th>Kolom 1</th><th>Kolom 2</th></tr></thead>` +
      `<tbody>${rows}</tbody></table><p><br></p>`
    );
  };

  const insertCodeBlock = () => {
    insertHtml('<pre><code>// tulis kode di sini</code></pre><p><br></p>');
  };

  const handlePaste = (e) => {
    // Tempel sebagai teks polos agar tidak membawa style liar dari sumber.
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      e.preventDefault();
      document.execCommand('insertText', false, text);
      emit();
    }
  };

  const switchMode = (next) => {
    if (next === 'source') {
      const md = htmlToMarkdown(editorRef.current?.innerHTML || '');
      setSourceValue(md);
      setCharCount(md.length);
      setMode('source');
      return;
    }
    if (editorRef.current) {
      editorRef.current.innerHTML = markdownToHtml(sourceValue);
    }
    setCharCount(sourceValue.length);
    onChange?.(sourceValue);
    setMode('rich');
  };

  return (
    <div style={{
      border: `1px solid ${isDark ? '#334155' : '#E5E7EB'}`,
      borderRadius: '16px',
      overflow: 'hidden',
      backgroundColor: isDark ? '#111827' : '#FFFFFF'
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px',
        padding: '8px',
        borderBottom: `1px solid ${isDark ? '#334155' : '#F3F4F6'}`,
        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <ToolButton icon={Heading1} title="Judul H1" isDark={isDark} onClick={() => exec('formatBlock', '<h1>')} />
        <ToolButton icon={Heading2} title="Judul H2" isDark={isDark} onClick={() => exec('formatBlock', '<h2>')} />
        <ToolButton icon={Heading3} title="Sub-judul H3" isDark={isDark} onClick={() => exec('formatBlock', '<h3>')} />
        <ToolButton icon={Heading4} title="Sub-judul H4" isDark={isDark} onClick={() => exec('formatBlock', '<h4>')} />
        <ToolButton icon={Pilcrow} title="Paragraf" isDark={isDark} onClick={() => exec('formatBlock', '<p>')} />
        <Divider isDark={isDark} />
        <ToolButton icon={Bold} title="Tebal (Ctrl+B)" isDark={isDark} onClick={() => exec('bold')} />
        <ToolButton icon={Italic} title="Miring (Ctrl+I)" isDark={isDark} onClick={() => exec('italic')} />
        <ToolButton icon={Underline} title="Garis bawah (Ctrl+U)" isDark={isDark} onClick={() => exec('underline')} />
        <ToolButton icon={Strikethrough} title="Coret" isDark={isDark} onClick={() => exec('strikeThrough')} />
        <ToolButton icon={Highlighter} title="Sorot" isDark={isDark} onClick={() => exec('backColor', '#FEF08A')} />
        <Divider isDark={isDark} />
        <ToolButton icon={List} title="Daftar bullet" isDark={isDark} onClick={() => exec('insertUnorderedList')} />
        <ToolButton icon={ListOrdered} title="Daftar nomor" isDark={isDark} onClick={() => exec('insertOrderedList')} />
        <ToolButton icon={Quote} title="Kutipan" isDark={isDark} onClick={() => exec('formatBlock', '<blockquote>')} />
        <Divider isDark={isDark} />
        <ToolButton icon={AlignLeft} title="Rata kiri" isDark={isDark} onClick={() => exec('justifyLeft')} />
        <ToolButton icon={AlignCenter} title="Rata tengah" isDark={isDark} onClick={() => exec('justifyCenter')} />
        <ToolButton icon={AlignRight} title="Rata kanan" isDark={isDark} onClick={() => exec('justifyRight')} />
        <Divider isDark={isDark} />
        <ToolButton icon={Link2} title="Tautan" isDark={isDark} onClick={addLink} />
        <ToolButton
          icon={uploading ? Loader2 : ImagePlus}
          title="Sisipkan gambar"
          isDark={isDark}
          onClick={handleImagePick}
          disabled={uploading || mode === 'source'}
        />
        <ToolButton icon={Table} title="Tabel" isDark={isDark} onClick={insertTable} />
        <ToolButton icon={Code2} title="Blok kode" isDark={isDark} onClick={insertCodeBlock} />
        <ToolButton icon={Minus} title="Garis pemisah" isDark={isDark} onClick={() => exec('insertHorizontalRule')} />
        <Divider isDark={isDark} />
        <ToolButton icon={Undo2} title="Batalkan (Ctrl+Z)" isDark={isDark} onClick={() => exec('undo')} />
        <ToolButton icon={Redo2} title="Ulangi (Ctrl+Y)" isDark={isDark} onClick={() => exec('redo')} />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleImageUpload}
        />
        <div style={{ flex: 1 }} />
        <ToolButton
          icon={mode === 'rich' ? FileCode2 : Eye}
          title={mode === 'rich' ? 'Lihat / ubah sumber Markdown' : 'Kembali ke editor'}
          isDark={isDark}
          onClick={() => switchMode(mode === 'rich' ? 'source' : 'rich')}
          active={mode === 'source'}
        />
      </div>

      {/* Area menulis */}
      {mode === 'rich' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={handlePaste}
          className="markdown-body"
          data-placeholder="Tulis isi berita di sini... (mendukung format Markdown)"
          style={{
            minHeight: `${minHeight}px`,
            maxHeight: '600px',
            overflowY: 'auto',
            padding: '20px',
            outline: 'none',
            cursor: 'text'
          }}
        />
      ) : (
        <textarea
          value={sourceValue}
          onChange={(e) => {
            setSourceValue(e.target.value);
            setCharCount(e.target.value.length);
            onChange?.(e.target.value);
          }}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: `${minHeight}px`,
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            padding: '20px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.85rem',
            lineHeight: 1.6,
            backgroundColor: isDark ? '#0B1220' : '#F9FAFB',
            color: isDark ? '#E2E8F0' : '#1F2937',
            boxSizing: 'border-box'
          }}
        />
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '12px', padding: '8px 12px',
        borderTop: `1px solid ${isDark ? '#334155' : '#F3F4F6'}`,
        backgroundColor: isDark ? '#1F2937' : '#F9FAFB',
        fontSize: '0.7rem',
        color: isDark ? '#94A3B8' : '#6B7280',
        flexWrap: 'wrap'
      }}>
        <span>Format tersimpan sebagai Markdown{uploading ? ' — mengunggah gambar…' : ''}</span>
        <span>{charCount} karakter</span>
      </div>
    </div>
  );
};

export default RichTextEditor;
