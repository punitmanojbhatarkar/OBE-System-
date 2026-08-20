/**
 * ai-chat.js
 * Injects a floating AI Chat assistant into the OBE dashboard.
 * Provides navigation help, answers common questions, and maintains state via localStorage.
 */

(function initAIChat() {
  // Prevent duplicate injections
  if (document.getElementById('ai-chat-widget')) return;

  const HISTORY_KEY = 'obe_ai_chat_history';
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  
  // Basic Welcome Message if empty
  if (history.length === 0) {
    history.push({ role: 'ai', text: "Hello! I am your OBE Assistant 🤖. I can help you navigate the system, explain how to map COs, set up courses, or answer any doubts you have. How can I help you today?" });
  }

  // Inject CSS dynamically to bypass browser cache
  const style = document.createElement('style');
  style.innerHTML = `
    /* ── PREMIUM AI CHATBOX WIDGET ── */
    #ai-chat-widget { position: fixed !important; bottom: 24px !important; right: 24px !important; z-index: 999999 !important; display: flex !important; flex-direction: column; align-items: flex-end; pointer-events: none; font-family: 'Inter', system-ui, sans-serif; }
    
    /* Floating Action Button */
    #ai-chat-btn { width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899); background-size: 200% 200%; color: white; border: 2px solid rgba(255,255,255,0.2); box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4), inset 0 2px 4px rgba(255,255,255,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 24px; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: auto; animation: gradientShift 4s ease infinite, floatPulse 3s ease-in-out infinite; transform-origin: center; position: relative; overflow: hidden; }
    #ai-chat-btn::before { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s; }
    #ai-chat-btn:hover { transform: scale(1.1) translateY(-4px); box-shadow: 0 12px 30px rgba(139, 92, 246, 0.6), inset 0 2px 4px rgba(255,255,255,0.5); }
    #ai-chat-btn:hover::before { opacity: 1; }
    #ai-chat-btn:active { transform: scale(0.95); }
    
    @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
    @keyframes floatPulse { 0% { transform: translateY(0px); box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4); } 50% { transform: translateY(-6px); box-shadow: 0 12px 28px rgba(139, 92, 246, 0.5); } 100% { transform: translateY(0px); box-shadow: 0 8px 24px rgba(139, 92, 246, 0.4); } }

    /* Chat Panel */
    #ai-chat-panel { width: 340px; max-height: calc(100vh - 100px); height: 500px; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 20px; margin-bottom: 20px; box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.1); display: flex; flex-direction: column; overflow: hidden; transform-origin: bottom right; transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); opacity: 0; transform: scale(0.85) translateY(20px); pointer-events: none; }
    #ai-chat-panel.active { opacity: 1; transform: scale(1) translateY(0); pointer-events: auto; }
    
    /* Header */
    .ai-chat-header { padding: 16px 20px; background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center; position: relative; }
    .ai-chat-title { font-weight: 600; font-size: 15px; color: #fff; display: flex; align-items: center; gap: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); letter-spacing: 0.3px; }
    .ai-chat-title span.pulse { display: inline-block; width: 8px; height: 8px; background: #10b981; border-radius: 50%; box-shadow: 0 0 10px #10b981; animation: ai-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; border: 1.5px solid rgba(255,255,255,0.8); }
    @keyframes ai-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.2); box-shadow: 0 0 16px #10b981; } }
    #ai-chat-clear-btn { transition: transform 0.2s, opacity 0.2s; opacity: 0.6; font-size: 14px; }
    #ai-chat-clear-btn:hover { transform: rotate(15deg) scale(1.1); opacity: 1; color: #ef4444 !important; }

    /* Messages Area */
    .ai-chat-messages { flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; scroll-behavior: smooth; }
    .ai-chat-messages::-webkit-scrollbar { width: 5px; }
    .ai-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
    .ai-chat-messages::-webkit-scrollbar-track { background: transparent; }
    
    /* Message Bubbles */
    .chat-msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 13.5px; line-height: 1.45; font-weight: 400; box-shadow: 0 4px 12px rgba(0,0,0,0.08); animation: msg-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; word-wrap: break-word; transform-origin: bottom; opacity: 0; }
    @keyframes msg-pop { 0% { opacity: 0; transform: translateY(12px) scale(0.95); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
    
    .chat-msg.ai { background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.08); color: #e2e8f0; align-self: flex-start; border-bottom-left-radius: 4px; border-top-left-radius: 16px; position: relative; }
    .chat-msg.user { background: linear-gradient(135deg, #3b82f6, #6366f1); border: 1px solid rgba(255,255,255,0.1); color: white; align-self: flex-end; border-bottom-right-radius: 4px; border-top-right-radius: 16px; }
    .chat-msg a { color: #93c5fd; text-decoration: none; border-bottom: 1px solid rgba(147,197,253,0.4); transition: border-color 0.2s; font-weight: 500; }
    .chat-msg a:hover { border-color: #93c5fd; }
    
    /* Input Area */
    .ai-chat-input-area { padding: 14px 16px; background: rgba(15, 23, 42, 0.85); border-top: 1px solid rgba(255,255,255,0.06); display: flex; gap: 10px; align-items: center; position: relative; }
    .ai-chat-input-area::before { content: ''; position: absolute; top: -1px; left: 0; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent); }
    .ai-chat-input-area input { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 10px 16px; color: white; outline: none; font-size: 13.5px; transition: all 0.3s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.15); }
    .ai-chat-input-area input::placeholder { color: rgba(255,255,255,0.35); }
    .ai-chat-input-area input:focus { border-color: #8b5cf6; background: rgba(255,255,255,0.08); box-shadow: inset 0 2px 4px rgba(0,0,0,0.15), 0 0 0 2px rgba(139, 92, 246, 0.2); }
    
    .ai-chat-input-area button { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 4px 10px rgba(59, 130, 246, 0.4); flex-shrink: 0; }
    .ai-chat-input-area button:hover { transform: scale(1.1) rotate(10deg); box-shadow: 0 6px 14px rgba(59, 130, 246, 0.6); }
    .ai-chat-input-area button:active { transform: scale(0.9); }
    
    /* Typing Indicator */
    .ai-typing { display: flex; gap: 4px; align-items: center; padding: 4px 2px; }
    .ai-typing span { width: 5px; height: 5px; background: #94a3b8; border-radius: 50%; animation: typeBounce 1.4s infinite ease-in-out both; }
    .ai-typing span:nth-child(1) { animation-delay: -0.32s; }
    .ai-typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typeBounce { 0%, 80%, 100% { transform: scale(0); opacity: 0.4; } 40% { transform: scale(1.2); opacity: 1; background: #e2e8f0; } }
  `;
  document.head.appendChild(style);

  // Create UI
  const widget = document.createElement('div');
  widget.id = 'ai-chat-widget';
  
  widget.innerHTML = `
    <div id="ai-chat-panel">
      <div class="ai-chat-header">
        <div class="ai-chat-title">
          <span class="pulse"></span> OBE Assistant
        </div>
        <button id="ai-chat-clear-btn" title="Clear Chat" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:16px;">🗑️</button>
      </div>
      <div class="ai-chat-messages" id="ai-chat-messages"></div>
      <div class="ai-chat-input-area">
        <input type="text" id="ai-chat-input" placeholder="Type your question..." autocomplete="off">
        <button id="ai-chat-send">➤</button>
      </div>
    </div>
    <button id="ai-chat-btn" title="Ask AI Assistant">🤖</button>
  `;
  document.body.appendChild(widget);

  const btn = document.getElementById('ai-chat-btn');
  const panel = document.getElementById('ai-chat-panel');
  const msgsContainer = document.getElementById('ai-chat-messages');
  const input = document.getElementById('ai-chat-input');
  const sendBtn = document.getElementById('ai-chat-send');
  const clearBtn = document.getElementById('ai-chat-clear-btn');

  let isOpen = false;

  btn.addEventListener('click', () => {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add('active');
      setTimeout(() => input.focus(), 300);
      scrollToBottom();
    } else {
      panel.classList.remove('active');
    }
  });

  clearBtn.addEventListener('click', () => {
    history = [{ role: 'ai', text: "Chat history cleared. How can I assist you?" }];
    saveHistory();
    renderHistory();
  });

  // ── Session Management (persistent per browser session) ──────────────────
  let SESSION_ID = sessionStorage.getItem('obe_chat_session');
  if (!SESSION_ID) {
    SESSION_ID = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('obe_chat_session', SESSION_ID);
  }

  function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }

  function renderHistory() {
    msgsContainer.innerHTML = '';
    history.forEach(msg => appendMessage(msg.role, msg.text, false));
    scrollToBottom();
  }

  function formatAIText(text) {
    // Rich markdown-to-HTML conversion
    let html = text
      // Code blocks
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.4);padding:8px;border-radius:6px;font-size:12px;overflow-x:auto;margin:4px 0;"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.35);padding:1px 5px;border-radius:3px;font-size:12px;">$1</code>')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Headers (## and ###)
      .replace(/^### (.+)$/gm, '<p style="font-weight:700;color:#a5b4fc;margin:6px 0 2px;font-size:13px;">$1</p>')
      .replace(/^## (.+)$/gm, '<p style="font-weight:700;color:#c4b5fd;margin:8px 0 2px;font-size:14px;">$1</p>')
      .replace(/^# (.+)$/gm, '<p style="font-weight:700;color:#e2e8f0;margin:8px 0 2px;font-size:15px;">$1</p>')
      // Numbered lists
      .replace(/^\d+\. (.+)$/gm, '<p style="margin:2px 0;padding-left:12px;">• $1</p>')
      // Bullet lists
      .replace(/^[-*] (.+)$/gm, '<p style="margin:2px 0;padding-left:12px;">• $1</p>')
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    return html;
  }

  function appendMessage(role, text, save=true) {
    if (save) {
      history.push({ role, text });
      saveHistory();
    }
    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = role === 'ai' ? formatAIText(text) : text;
    msgsContainer.appendChild(div);
    scrollToBottom();
  }

  function scrollToBottom() {
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  }

  function showTyping(label) {
    const div = document.createElement('div');
    div.className = 'chat-msg ai ai-typing-indicator';
    div.innerHTML = `<div class="ai-typing"><span></span><span></span><span></span></div>${label ? `<span style="font-size:11px;opacity:0.6;margin-left:6px;">${label}</span>` : ''}`;
    msgsContainer.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const indicator = msgsContainer.querySelector('.ai-typing-indicator');
    if (indicator) indicator.remove();
  }

  async function callChatAPI(message, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch('http://127.0.0.1:8080/api/chat-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, session_id: SESSION_ID }),
          signal: AbortSignal.timeout(60000) // 60s timeout
        });

        if (response.status === 429 || response.status === 503) {
          // Rate limited — wait 20s and retry
          if (attempt < retries) {
            removeTyping();
            showTyping(`⏳ AI busy, retrying in 20s... (attempt ${attempt + 2}/${retries + 1})`);
            await new Promise(r => setTimeout(r, 20000));
            continue;
          }
          return { error: 'rate_limit', reply: null };
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          return { error: 'server_error', detail: err.detail || response.statusText, reply: null };
        }

        return await response.json();
      } catch (e) {
        if (attempt < retries && e.name !== 'AbortError') {
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }
        return { error: 'network', reply: null };
      }
    }
    return { error: 'unknown', reply: null };
  }

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    appendMessage('user', text);
    showTyping('🤖 Thinking...');

    const data = await callChatAPI(text);
    removeTyping();

    if (data.reply) {
      appendMessage('ai', data.reply);
    } else if (data.error === 'rate_limit') {
      appendMessage('ai', '⏳ **AI quota reached** for today (free tier limit). The system will be available again shortly. In the meantime, I can answer questions offline — please check the sidebar for what you need!');
    } else if (data.error === 'network') {
      appendMessage('ai', '⚠️ **Cannot reach the backend server.** Please make sure the Python server is running:\n```\ncd backend\n.\\venv\\Scripts\\python -m uvicorn main:app --port 8080\n```');
    } else if (data.error === 'server_error') {
      appendMessage('ai', `❌ **Server error:** ${data.detail || 'Unknown error'}. Please check the backend logs.`);
    } else {
      appendMessage('ai', "I received an unexpected response. Please try again.");
    }
  }

  // ── Clear chat (also clears server memory) ────────────────────────────────
  clearBtn.addEventListener('click', () => {
    history = [{ role: 'ai', text: "Hello! I am your OBE Assistant 🤖. I can help you navigate the system, explain how to map COs, set up courses, or answer any doubts you have. How can I help you today?" }];
    saveHistory();
    renderHistory();
    // Also clear server-side memory for this session
    fetch(`http://127.0.0.1:8080/api/chat-agent/memory/${SESSION_ID}`, { method: 'DELETE' }).catch(() => {});
    // Generate a new session ID
    SESSION_ID = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('obe_chat_session', SESSION_ID);
  });

  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleSend();
  });
  sendBtn.addEventListener('click', handleSend);

  // Initial render
  renderHistory();

})();
