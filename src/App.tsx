import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Copy, Mic, Paperclip, Search, SendHorizonal, Settings, Sparkles, Volume2, WifiOff, Plus, LogOut, ShieldCheck, RefreshCw } from 'lucide-react';

type Role = 'user' | 'assistant';

type Message = {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
};

type ToolCapability = {
  name: string;
  available: boolean;
  description: string;
};

type SystemStatus = {
  configured: boolean;
  model: string;
  tooling: ToolCapability[];
};

const suggestions = [
  'Ask anything',
  'Explain a concept',
  'Write something',
  'Summarize',
  'Search the web',
];

const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Hello, I’m Ace. How can I help you today?',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
];

type FileAttachment = {
  name: string;
  size: number;
  type: string;
  preview?: string;
};

function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [screen, setScreen] = useState<'setup' | 'home'>('setup');
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [attachment, setAttachment] = useState<FileAttachment | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const recognitionRef = useRef<any>(null);

  const statusLabel = useMemo(() => {
    if (screen === 'setup') return 'Connect to Gemini';
    return status?.configured ? 'Connected' : 'Needs setup';
  }, [screen, status]);

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDraft((current) => (current ? `${current} ${transcript}` : transcript));
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
      setScreen(data.configured ? 'home' : 'setup');
    } catch {
      setError('The connection service is unavailable right now.');
    }
  };

  const handleTestConnection = async () => {
    setIsBusy(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyInput.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Connection test failed.');
      }

      setSuccess(data.message || 'Connected successfully');
    } catch (err: any) {
      setError(err.message || 'Unable to validate the Gemini key.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleConnect = async () => {
    if (!keyInput.trim()) {
      setError('Please enter your Gemini API key.');
      return;
    }

    setIsBusy(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to connect using the provided key.');
      }

      setSuccess('Connected successfully');
      setScreen('home');
      await loadStatus();
    } catch (err: any) {
      setError(err.message || 'Connection failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSend = async () => {
    const trimmed = draft.trim();
    if (!trimmed && !attachment) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed || `Attached: ${attachment?.name ?? 'file'}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Thinking…',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft('');
    setAttachment(null);
    setIsBusy(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: status?.model || 'gemini-1.5-flash',
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'The model did not respond.');

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessage.id ? { ...message, content: data.reply || 'No response returned.' } : message,
        ),
      );
    } catch (err: any) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: `Sorry — ${err.message || 'I could not complete that request.'}` }
            : message,
        ),
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/disconnect', { method: 'POST' });
      setScreen('setup');
      setSettingsOpen(false);
      setKeyInput('');
      await loadStatus();
    } catch {
      setError('Unable to disconnect the saved key.');
    }
  };

  const handleMicToggle = () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    recognition.start();
    setIsListening(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Files must be 10MB or smaller.');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      setError('Unsupported file type. Please attach an image or a PDF/text document.');
      return;
    }

    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setAttachment({ name: file.name, size: file.size, type: file.type, preview });
    setError('');
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      setError('Copy failed in this browser.');
    }
  };

  const handleSpeak = (content: string) => {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not supported on this device.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content.replace(/[#*`_>~-]/g, ''));
    utterance.lang = 'en-US';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const renderSetup = () => (
    <main className="setup-screen">
      <div className="brand-lockup">
        <div className="orb orb-large" aria-hidden="true" />
        <div>
          <p className="eyebrow">AI companion</p>
          <h1>AceGPT</h1>
        </div>
      </div>

      <div className="setup-panel">
        <h2>Connect your Gemini API key</h2>
        <p>Keep your credentials on the server and never expose the raw secret in the browser.</p>

        <label className="input-label" htmlFor="gemini-key">Gemini API key</label>
        <div className="password-field">
          <input
            id="gemini-key"
            type={showKey ? 'text' : 'password'}
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Paste your Gemini key here"
            aria-label="Gemini API key"
          />
          <button type="button" onClick={() => setShowKey((value) => !value)}>
            {showKey ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="actions-row">
          <button className="primary-button" disabled={isBusy} onClick={handleConnect}>
            {isBusy ? 'Connecting…' : 'Connect'}
          </button>
          <button className="secondary-button" disabled={isBusy} onClick={handleTestConnection}>
            Test connection
          </button>
        </div>

        <a className="external-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
          Create or manage a Gemini key in Google AI Studio
        </a>

        {error && <div className="status-error">{error}</div>}
        {success && <div className="status-success">{success}</div>}
      </div>
    </main>
  );

  const renderHome = () => (
    <div className="home-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="brand-pill" type="button" onClick={() => setScreen('home')}>
            <span className="orb orb-small" aria-hidden="true" />
            AceGPT
          </button>
          <button className="icon-button" type="button" aria-label="New chat" onClick={() => setMessages(initialMessages)}>
            <Plus size={18} />
          </button>
        </div>

        <div className="sidebar-section">
          <h3>Recent chats</h3>
          <div className="chat-list-item active">
            <Sparkles size={16} />
            <span>New conversation</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Tools</h3>
          <div className="tools-stack">
            {(status?.tooling ?? []).map((tool) => (
              <div key={tool.name} className={`tool-pill ${tool.available ? 'enabled' : 'disabled'}`}>
                <Search size={14} />
                <span>{tool.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-footer">
          <button type="button" className="secondary-button wide" onClick={() => setSettingsOpen(true)}>
            <Settings size={16} /> Settings
          </button>
        </div>
      </aside>

      <main className="chat-panel">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Assistant</p>
            <h2>{statusLabel}</h2>
          </div>
          <div className="header-actions">
            <button type="button" className="icon-button" aria-label="Refresh status" onClick={loadStatus}>
              <RefreshCw size={18} />
            </button>
            <button type="button" className="icon-button" aria-label="Open settings" onClick={() => setSettingsOpen(true)}>
              <Settings size={18} />
            </button>
          </div>
        </header>

        {!!error && <div className="toast-error">{error}</div>}

        <section className="suggestion-row">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" className="suggestion-pill" onClick={() => setDraft(suggestion)}>
              {suggestion}
            </button>
          ))}
        </section>

        <section className="conversation">
          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="message-meta">
                <span>{message.role === 'assistant' ? 'Ace' : 'You'}</span>
                <time>{message.timestamp}</time>
              </div>
              <div className="markdown-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
              {message.role === 'assistant' && (
                <div className="message-actions">
                  <button type="button" onClick={() => handleCopy(message.content)}>
                    <Copy size={14} /> Copy
                  </button>
                  <button type="button" onClick={() => handleSpeak(message.content)}>
                    <Volume2 size={14} /> Speak
                  </button>
                </div>
              )}
            </article>
          ))}
        </section>

        <footer className="composer-wrap">
          {attachment && (
            <div className="attachment-card">
              <span>{attachment.name}</span>
              <button type="button" onClick={() => setAttachment(null)}>Remove</button>
            </div>
          )}

          <div className="composer">
            <label className="file-button" aria-label="Attach file">
              <Paperclip size={18} />
              <input type="file" accept="image/*,.pdf,.txt" onChange={handleFileChange} />
            </label>

            <button type="button" className="icon-button" onClick={handleMicToggle} aria-label="Voice input">
              <Mic size={18} className={isListening ? 'listening' : ''} />
            </button>

            <textarea
              aria-label="Message composer"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask anything, explain a concept, or request help..."
              rows={1}
            />

            <button type="button" className="primary-button square" disabled={isBusy || (!draft.trim() && !attachment)} onClick={handleSend}>
              <SendHorizonal size={18} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );

  return (
    <>
      <div className="app-shell">
        {screen === 'setup' ? renderSetup() : renderHome()}
      </div>

      {settingsOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="settings-modal">
            <div className="modal-header">
              <h3>Connection settings</h3>
              <button type="button" className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings">
                ×
              </button>
            </div>

            <div className="settings-body">
              <div className="status-line">
                <ShieldCheck size={16} />
                <span>{status?.configured ? 'Connected via server-side encrypted storage' : 'No valid key stored'}</span>
              </div>

              <label className="input-label" htmlFor="settings-key">Replace Gemini API key</label>
              <div className="password-field">
                <input
                  id="settings-key"
                  type={showKey ? 'text' : 'password'}
                  value={keyInput}
                  onChange={(event) => setKeyInput(event.target.value)}
                  placeholder="Paste a new Gemini key"
                />
                <button type="button" onClick={() => setShowKey((value) => !value)}>{showKey ? 'Hide' : 'Show'}</button>
              </div>

              <div className="actions-row stack">
                <button type="button" className="primary-button" onClick={async () => { await handleConnect(); setSettingsOpen(false); }}>
                  Save new key
                </button>
                <button type="button" className="secondary-button" onClick={handleDisconnect}>
                  <LogOut size={16} /> Disconnect
                </button>
              </div>

              <a className="external-link" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                Open Gemini Studio
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
