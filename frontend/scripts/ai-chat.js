/**
 * ai-chat.js
 * Clean Enterprise AI Copilot widget for OBE System.
 * Accessible across all role workspaces with persistent session memory.
 */

(function initAIChat() {
  if (document.getElementById('ai-chat-widget')) return;

  const HISTORY_KEY = 'obe_ai_chat_history';
  let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  
  if (history.length === 0) {
    history.push({
      role: 'ai',
      text: "Welcome to OBE Copilot. I can assist you with Course Outcome formulations, Bloom's taxonomy levels, NBA Criterion 3 calculations, or general system workflows."
    });
  }

  // Inject crisp flat widget styles
  const style = document.createElement('style');
  style.innerHTML = `
    #ai-chat-widget {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      display: flex; flex-direction: column; align-items: flex-end;
      pointer-events: none; font-family: var(--font-sans, 'Plus Jakarta Sans', system-ui, sans-serif);
    }
    
    #ai-chat-btn {
      width: 48px; height: 48px; border-radius: 50%;
      background: #0F172A; color: #FFFFFF;
      border: 1px solid #334155; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease; pointer-events: auto;
    }
    #ai-chat-btn:hover { background: #2563EB; border-color: #2563EB; }
    
    #ai-chat-panel {
      width: 360px; max-width: calc(100vw - 32px); height: 480px; max-height: calc(100vh - 100px);
      background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px;
      margin-bottom: 12px; display: flex; flex-direction: column; overflow: hidden;
      opacity: 0; transform: translateY(10px); pointer-events: none; transition: all 0.2s ease;
    }
    #ai-chat-panel.active { opacity: 1; transform: translateY(0); pointer-events: auto; }
    
    .ai-chat-header {
      padding: 12px 16px; background: #0F172A; color: #FFFFFF;
      border-bottom: 1px solid #1E293B; display: flex; justify-content: space-between; align-items: center;
    }
    .ai-chat-title {
      font-size: 13.5px; font-weight: 700; display: flex; align-items: center; gap: 8px;
    }
    .ai-chat-badge {
      font-size: 10px; font-weight: 700; background: #2563EB; color: #FFFFFF;
      padding: 2px 6px; border-radius: 4px;
    }
    
    .ai-chat-messages {
      flex: 1; padding: 14px; overflow-y: auto; display: flex; flex-direction: column;
      gap: 10px; background: #F8FAFC;
    }
    
    .chat-msg {
      max-width: 85%; padding: 8px 12px; border-radius: 8px; font-size: 13px; line-height: 1.5;
      word-wrap: break-word;
    }
    .chat-msg.ai {
      background: #FFFFFF; border: 1px solid #E2E8F0; color: #0F172A; align-self: flex-start;
    }
    .chat-msg.user {
      background: #2563EB; border: 1px solid #1D4ED8; color: #FFFFFF; align-self: flex-end;
    }
    
    .ai-chat-input-area {
      padding: 10px 12px; background: #FFFFFF; border-top: 1px solid #E2E8F0;
      display: flex; gap: 8px; align-items: center;
    }
    .ai-chat-input-area input {
      flex: 1; background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px;
      padding: 8px 12px; color: #0F172A; outline: none; font-size: 13px; font-family: inherit;
    }
    .ai-chat-input-area input:focus { border-color: #2563EB; }
    
    .ai-chat-input-area button {
      height: 34px; padding: 0 12px; border-radius: 6px; background: #2563EB; color: #FFFFFF;
      border: none; cursor: pointer; font-size: 12.5px; font-weight: 600; font-family: inherit;
    }
    .ai-chat-input-area button:hover { background: #1D4ED8; }
    
    .ai-typing { display: flex; gap: 4px; align-items: center; padding: 4px; }
    .ai-typing span { width: 5px; height: 5px; background: #94A3B8; border-radius: 50%; animation: typingDot 1.4s infinite ease-in-out both; }
    .ai-typing span:nth-child(1) { animation-delay: -0.32s; }
    .ai-typing span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes typingDot { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); background: #2563EB; } }
  `;
  document.head.appendChild(style);

  const widget = document.createElement('div');
  widget.id = 'ai-chat-widget';
  widget.innerHTML = `
    <div id="ai-chat-panel">
      <div class="ai-chat-header">
        <div class="ai-chat-title">
          <span>OBE Copilot</span>
          <span class="ai-chat-badge">AI 2.5</span>
        </div>
        <button id="ai-chat-clear-btn" title="Clear Session" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;">Clear</button>
      </div>
      <div class="ai-chat-messages" id="ai-chat-messages"></div>
      <div class="ai-chat-input-area">
        <input type="text" id="ai-chat-input" placeholder="Ask about COs, POs, or workflows…" autocomplete="off">
        <button id="ai-chat-send">Send</button>
      </div>
    </div>
    <button id="ai-chat-btn" title="Open OBE Copilot">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>
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
      setTimeout(() => input.focus(), 200);
      scrollToBottom();
    } else {
      panel.classList.remove('active');
    }
  });

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
    return text
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre style="background:#0F172A;color:#F8FAFC;padding:8px;border-radius:4px;font-size:11.5px;overflow-x:auto;margin:4px 0;"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;color:#0F172A;padding:1px 4px;border-radius:3px;font-size:11.5px;">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.+)$/gm, '<p style="font-weight:700;margin:4px 0 2px;font-size:12.5px;">$1</p>')
      .replace(/^## (.+)$/gm, '<p style="font-weight:700;margin:6px 0 2px;font-size:13px;">$1</p>')
      .replace(/^\d+\. (.+)$/gm, '<p style="margin:2px 0;padding-left:8px;">• $1</p>')
      .replace(/^[-*] (.+)$/gm, '<p style="margin:2px 0;padding-left:8px;">• $1</p>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
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

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'chat-msg ai ai-typing-indicator';
    div.innerHTML = '<div class="ai-typing"><span></span><span></span><span></span></div>';
    msgsContainer.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const indicator = msgsContainer.querySelector('.ai-typing-indicator');
    if (indicator) indicator.remove();
  }

  async function callChatAPI(message) {
    try {
      const response = await fetch('http://127.0.0.1:8080/api/chat-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session_id: SESSION_ID }),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) return { error: 'server_error', reply: null };
      return await response.json();
    } catch (e) {
      return { error: 'network', reply: null };
    }
  }

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    appendMessage('user', text);
    showTyping();

    const data = await callChatAPI(text);
    removeTyping();

    if (data.reply) {
      appendMessage('ai', data.reply);
    } else {
      appendMessage('ai', "I am currently running in offline advisor mode. You can navigate through the left sidebar to access course outcomes, correlation matrices, marks entry, and attainment calculations.");
    }
  }

  clearBtn.addEventListener('click', () => {
    history = [{ role: 'ai', text: "Chat session cleared. How can I assist you with your course outcomes?" }];
    saveHistory();
    renderHistory();
    fetch(`http://127.0.0.1:8080/api/chat-agent/memory/${SESSION_ID}`, { method: 'DELETE' }).catch(() => {});
    SESSION_ID = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('obe_chat_session', SESSION_ID);
  });

  input.addEventListener('keypress', e => {
    if (e.key === 'Enter') handleSend();
  });
  sendBtn.addEventListener('click', handleSend);

  renderHistory();
})();
