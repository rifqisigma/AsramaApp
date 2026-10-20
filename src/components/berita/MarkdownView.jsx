import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Menampilkan konten Markdown (berita, dsb) dengan gaya tipografi `.markdown-body`.
 * Gaya tipografi ada di src/index.css.
 */
const MarkdownView = ({ children, className = '' }) => (
  <div className={`markdown-body ${className}`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: (props) => (
          <a {...props} target="_blank" rel="noopener noreferrer" />
        ),
        img: (props) => (
          <img {...props} loading="lazy" alt={props.alt || ''} />
        ),
        table: (props) => (
          <div className="markdown-table-wrap">
            <table {...props} />
          </div>
        ),
      }}
    >
      {children || ''}
    </ReactMarkdown>
  </div>
);

export default MarkdownView;
