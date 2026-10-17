import { useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { functions } from '../firebase';
import { useTheme } from '../context/ThemeContext';

// Sapaan awal saat panel pertama kali dibuka
const GREETING = 'Hai! Aku Asisten AIS. Aku bisa bantu soal poin kamu, aturan/AD-ART, piket, jam malam, SPA, dan info internal lainnya.';

// Jumlah pesan terakhir yang dikirim sebagai riwayat ke backend
const MAX_HISTORY = 10;

// Terjemahkan kode error Firebase ke pesan yang ramah untuk pengguna
const friendlyError = (err) => {
  const code = err?.code || '';
  if (code === 'functions/resource-exhausted') {
    return 'Terlalu banyak pesan, coba lagi beberapa saat lagi.';
  }
  if (code === 'functions/unauthenticated') {
    return 'Sesi kamu sudah berakhir. Silakan login kembali.';
  }
  if (code === 'functions/internal') {
    return 'Terjadi gangguan pada server. Coba lagi nanti.';
  }
  return 'Maaf, terjadi kesalahan. Coba lagi ya.';
};

const AiChatWidget = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: GREETING },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const listEndRef = useRef(null);

  // Auto-scroll ke pesan terbaru setiap kali daftar pesan / status loading berubah
  useEffect(() => {
    if (isOpen) {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // ========== Warna menyesuaikan tema gelap/terang ==========
  const colors = isDark
    ? {
        panelBg: '#2D1D13',
        panelBorder: '#4A2E1E',
        headerBg: '#3A2417',
        headerText: '#FFFFFF',
        bodyText: '#F3F4F6',
        subText: '#D1D5DB',
        assistantBubble: '#3A2417',
        assistantText: '#F3F4F6',
        inputBg: '#1F130C',
        inputBorder: '#4A2E1E',
        inputText: '#F3F4F6',
        errorBg: '#4A1D1D',
        errorText: '#FCA5A5',
        closeColor: '#D1D5DB',
      }
    : {
        panelBg: '#FFFFFF',
        panelBorder: '#FFE4E6',
        headerBg: '#F97316',
        headerText: '#FFFFFF',
        bodyText: '#1C1C1E',
        subText: '#6B7280',
        assistantBubble: '#F3F4F6',
        assistantText: '#1C1C1E',
        inputBg: '#FFFFFF',
        inputBorder: '#E5E7EB',
        inputText: '#1C1C1E',
        errorBg: '#FEF2F2',
        errorText: '#B91C1C',
        closeColor: '#FFFFFF',
      };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    // Tambahkan pesan pengguna ke tampilan
    const userMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      // Kirim hanya ~10 pesan terakhir sebagai riwayat
      const history = nextMessages.slice(-MAX_HISTORY);
      const appAiChat = httpsCallable(functions, 'appAiChat');
      const res = await appAiChat({ messages: history });
      const reply = res?.data?.reply || 'Maaf, aku belum punya jawaban untuk itu.';
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      // FirebaseError selalu membawa properti code (mis. functions/resource-exhausted)
      setError(friendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Responsive styles for floating chat button and panel */}
      <style>{`
        @keyframes ai-chat-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Desktop default */
        .ai-chat-floating-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
        }

        .ai-chat-panel {
          position: fixed;
          bottom: 96px;
          right: clamp(16px, calc((100vw - 360px) / 2 - 16px), 24px);
          width: min(360px, calc(100vw - 32px));
          height: min(520px, calc(100vh - 130px));
        }

        /* Mobile View: dinaikkan ke atas agar tidak menimpa bottom navbar */
        @media (max-width: 768px) {
          .ai-chat-floating-btn {
            bottom: calc(98px + env(safe-area-inset-bottom, 0px)) !important;
            right: 18px !important;
            width: 56px !important;
            height: 56px !important;
          }

          .ai-chat-panel {
            bottom: calc(166px + env(safe-area-inset-bottom, 0px)) !important;
            right: 16px !important;
            left: auto !important;
            width: min(360px, calc(100vw - 32px)) !important;
            height: min(480px, calc(100vh - 180px)) !important;
          }
        }
      `}</style>

      {/* ========== Panel Chat ========== */}
      {isOpen && (
        <div
          className="ai-chat-panel"
          style={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: colors.panelBg,
            border: `2px solid ${colors.panelBorder}`,
            borderRadius: '24px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            zIndex: 9998,
            transition: 'background-color 0.3s ease, border-color 0.3s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              padding: '14px 16px',
              backgroundColor: colors.headerBg,
              color: colors.headerText,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>Asisten AIS</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.85 }}>
                  Siap membantu 24 jam
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Tutup chat"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: colors.closeColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '8px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Daftar Pesan */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '82%',
                      padding: '10px 14px',
                      borderRadius: '16px',
                      backgroundColor: isUser ? '#F97316' : colors.assistantBubble,
                      color: isUser ? '#FFFFFF' : colors.assistantText,
                      fontSize: '0.9rem',
                      lineHeight: 1.45,
                      fontWeight: 500,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      borderBottomRightRadius: isUser ? '4px' : '16px',
                      borderBottomLeftRadius: isUser ? '16px' : '4px',
                      transition: 'background-color 0.3s ease, color 0.3s ease',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Indikator loading */}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    borderBottomLeftRadius: '4px',
                    backgroundColor: colors.assistantBubble,
                    color: colors.subText,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <Loader2 size={16} style={{ animation: 'ai-chat-spin 1s linear infinite' }} />
                  Asisten sedang menulis...
                </div>
              </div>
            )}

            {/* Tampilan error */}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: colors.errorBg,
                  color: colors.errorText,
                  fontSize: '0.82rem',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <div ref={listEndRef} />
          </div>

          {/* Input & Tombol Kirim */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px',
              borderTop: `1px solid ${colors.panelBorder}`,
              backgroundColor: colors.panelBg,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tulis pesan..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: '14px',
                border: `2px solid ${colors.inputBorder}`,
                backgroundColor: colors.inputBg,
                color: colors.inputText,
                fontSize: '0.9rem',
                outline: 'none',
                fontWeight: 500,
              }}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              aria-label="Kirim pesan"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                flexShrink: 0,
                borderRadius: '14px',
                border: `2px solid ${isLoading || !input.trim() ? '#FDBA74' : '#EA580C'}`,
                backgroundColor: isLoading || !input.trim() ? '#FDBA74' : '#F97316',
                color: '#FFFFFF',
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 0 #EA580C',
                transition: 'all 0.15s ease',
              }}
            >
              {isLoading ? (
                <Loader2 size={18} style={{ animation: 'ai-chat-spin 1s linear infinite' }} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========== Floating Button ========== */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="ai-chat-floating-btn"
        aria-label={isOpen ? 'Tutup Asisten AIS' : 'Buka Asisten AIS'}
        style={{
          borderRadius: '50%',
          border: '2px solid #EA580C',
          backgroundColor: '#F97316',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 16px rgba(249, 115, 22, 0.45)',
          zIndex: 9999,
          transition: 'transform 0.15s ease',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(2px)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0px)';
        }}
      >
        {isOpen ? <X size={26} /> : <MessageCircle size={26} />}
      </button>
    </>
  );
};

export default AiChatWidget;
