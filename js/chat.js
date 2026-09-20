(function() {
  const BASE_URL = 'https://app.travitrade.com'
  const API_URL = `${BASE_URL}/api/chat`
  const LEADS_URL = `${BASE_URL}/api/leads`
  const MESSAGES_URL = `${BASE_URL}/api/chat/messages`
  const HISTORY_URL = `${BASE_URL}/api/chat/history`

  let sessionId = 'web_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  let messages = []
  let leadData = null
  let leadCaptured = false
  let lastMessageCount = 0
  let pollingInterval = null
  let agentJoined = false
  let agentRequestTime = null
  let waitingMessageSent = false

  const styles = `
    #tv-chat-btn {
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      width: 54px; height: 54px; border-radius: 50%;
      background: #1D9E75; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(29,158,117,0.4);
      transition: transform 0.2s;
    }
    #tv-chat-btn:hover { transform: scale(1.08); }
    #tv-chat-panel {
      position: fixed; bottom: 90px; right: 24px; z-index: 9999;
      width: 340px; height: 500px;
      background: #0d1f14; border: 0.5px solid #1a3a24;
      border-radius: 14px; display: none; flex-direction: column;
      overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #tv-chat-panel.open { display: flex; }
    .tv-header {
      padding: 14px 16px; background: #0f2e1a;
      border-bottom: 0.5px solid #1a3a24;
      display: flex; align-items: center; gap: 10px;
    }
    .tv-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: #1D9E75; display: flex; align-items: center;
      justify-content: center; font-size: 14px; font-weight: 500; color: #fff;
    }
    .tv-header-title { font-size: 13px; font-weight: 500; color: #fff; }
    .tv-header-status { font-size: 11px; color: #1D9E75; display: flex; align-items: center; gap: 4px; }
    .tv-header-dot { width: 6px; height: 6px; border-radius: 50%; background: #1D9E75; }
    .tv-messages {
      flex: 1; overflow-y: auto; padding: 12px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .tv-msg { display: flex; }
    .tv-msg.user { justify-content: flex-end; }
    .tv-bubble {
      max-width: 80%; padding: 8px 12px; font-size: 13px;
      color: #fff; line-height: 1.5;
    }
    /* Bot — verde oscuro */
    .tv-bubble.bot {
      background: #0a1a0f;
      border: 0.5px solid #1a3a24;
      border-radius: 12px 12px 12px 2px;
      color: #9FE1CB;
    }

    /* Usuario — verde primario */
    .tv-bubble.user {
      background: #1D9E75;
      border-radius: 12px 12px 2px 12px;
      color: #fff;
    }

    /* Agente humano — azul */
    .tv-bubble.agent {
      background: #3b82f6;
      border-radius: 12px 12px 12px 2px;
      color: #fff;
    }
    .tv-form {
      padding: 12px; border-top: 0.5px solid #1a3a24;
      display: flex; flex-direction: column; gap: 8px;
    }
    .tv-form-title {
      font-size: 12px; color: rgba(159,225,203,0.7);
      text-align: center; margin-bottom: 4px;
    }
    .tv-input-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .tv-input {
      width: 100%; background: #0a1a0f;
      border: 0.5px solid #1a3a24; border-radius: 8px;
      padding: 8px 10px; color: #9FE1CB; font-size: 12px;
      outline: none; box-sizing: border-box;
    }
    .tv-input:focus { border-color: #1D9E75; }
    .tv-submit {
      width: 100%; padding: 9px; background: #1D9E75;
      border: none; border-radius: 8px; color: #fff;
      font-size: 13px; font-weight: 500; cursor: pointer;
    }
    .tv-chat-row {
      padding: 10px; border-top: 0.5px solid #1a3a24;
      display: flex; gap: 8px;
    }
    .tv-chat-input {
      flex: 1; background: #0a1a0f;
      border: 0.5px solid #1a3a24; border-radius: 8px;
      padding: 8px 10px; color: #9FE1CB; font-size: 13px; outline: none;
    }
    .tv-send-btn {
      background: #1D9E75; border: none; border-radius: 8px;
      padding: 8px 12px; cursor: pointer;
    }
    .tv-options {
      padding: 8px 12px; border-top: 0.5px solid #1a3a24;
      display: flex; flex-direction: column; gap: 6px;
    }
    .tv-option-btn {
      background: #0a1a0f; border: 0.5px solid #1a3a24;
      border-radius: 8px; padding: 8px 12px; color: #9FE1CB;
      font-size: 12px; cursor: pointer; text-align: left;
      transition: border-color 0.15s;
    }
    .tv-option-btn:hover { border-color: #1D9E75; color: #1D9E75; }
    .tv-loading { display: flex; gap: 4px; align-items: center; padding: 8px 12px; }
    .tv-dot { width: 6px; height: 6px; border-radius: 50%; background: #1D9E75; animation: tv-bounce 1s ease-in-out infinite; }
    .tv-dot:nth-child(2) { animation-delay: 0.15s; }
    .tv-dot:nth-child(3) { animation-delay: 0.3s; }
    @keyframes tv-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
  `

  function injectStyles() {
    const style = document.createElement('style')
    style.textContent = styles
    document.head.appendChild(style)
  }

  function createWidget() {
    document.body.insertAdjacentHTML('beforeend', `
      <button id="tv-chat-btn" aria-label="Abrir chat">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M4 4h14a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 4V6a2 2 0 012-2z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/>
        </svg>
      </button>
      <div id="tv-chat-panel">
        <div class="tv-header">
          <div class="tv-avatar">T</div>
          <div>
            <div class="tv-header-title">Asistente Travitrade</div>
            <div class="tv-header-status"><div class="tv-header-dot"></div>En línea</div>
          </div>
        </div>
        <div class="tv-messages" id="tv-messages"></div>
        <div id="tv-bottom"></div>
      </div>
    `)
  }

  const COUNTRIES_CODES = [
    { name: 'Venezuela', code: '+58', flag: '🇻🇪' },
    { name: 'Colombia', code: '+57', flag: '🇨🇴' },
    { name: 'México', code: '+52', flag: '🇲🇽' },
    { name: 'Argentina', code: '+54', flag: '🇦🇷' },
    { name: 'Chile', code: '+56', flag: '🇨🇱' },
    { name: 'Perú', code: '+51', flag: '🇵🇪' },
    { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
    { name: 'Bolivia', code: '+591', flag: '🇧🇴' },
    { name: 'Paraguay', code: '+595', flag: '🇵🇾' },
    { name: 'Uruguay', code: '+598', flag: '🇺🇾' },
    { name: 'Panamá', code: '+507', flag: '🇵🇦' },
    { name: 'Costa Rica', code: '+506', flag: '🇨🇷' },
    { name: 'Guatemala', code: '+502', flag: '🇬🇹' },
    { name: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
    { name: 'España', code: '+34', flag: '🇪🇸' },
    { name: 'Brasil', code: '+55', flag: '🇧🇷' },
    { name: 'Reino Unido', code: '+44', flag: '🇬🇧' },
    { name: 'Otro', code: '+', flag: '🌍' },
  ]

  function showLeadForm() {
    const countryOptions = COUNTRIES_CODES.map(c =>
      `<option value="${c.code}" data-flag="${c.flag}">${c.flag} ${c.name}</option>`
    ).join('')

    document.getElementById('tv-bottom').innerHTML = `
      <div class="tv-form">
        <div class="tv-form-title">Ingresa tus datos para continuar 👋</div>
        <div class="tv-input-row">
          <input class="tv-input" id="tv-nombre" placeholder="Nombre *" />
          <input class="tv-input" id="tv-apellido" placeholder="Apellido" />
        </div>
        <input class="tv-input" id="tv-email" placeholder="Correo electrónico *" type="email" />
        <div id="tv-email-error" style="color:#E24B4A;font-size:11px;display:none;padding:2px 4px">Ingresa un correo válido</div>
        <select class="tv-input" id="tv-pais" onchange="window.tvUpdateCode(this.value)">
          <option value="">🌍 Selecciona tu país *</option>
          ${countryOptions}
        </select>
        <div style="display:flex;gap:6px">
          <input class="tv-input" id="tv-code" placeholder="Código" style="width:80px;flex-shrink:0" readonly />
          <input class="tv-input" id="tv-phone" placeholder="Número WhatsApp *" type="tel" style="flex:1" />
        </div>
        <div id="tv-phone-error" style="color:#E24B4A;font-size:11px;display:none;padding:2px 4px">Ingresa solo números (7-15 dígitos)</div>
        <button class="tv-submit" onclick="window.tvSubmitLead()">Comenzar chat →</button>
      </div>
    `
  }

  window.tvUpdateCode = function(code) {
    document.getElementById('tv-code').value = code
  }

  function showChatInput() {
    const lastBotMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || ''
    const hasMenu = lastBotMsg.includes('1️⃣') || lastBotMsg.includes('gustaría hablar')

    if (hasMenu && !agentJoined) {
      document.getElementById('tv-bottom').innerHTML = `
        <div class="tv-options">
          <button class="tv-option-btn" onclick="window.tvSelectOption('Productos')">📦 Productos</button>
          <button class="tv-option-btn" onclick="window.tvSelectOption('Planes y precios')">💰 Planes y precios</button>
          <button class="tv-option-btn" onclick="window.tvSelectOption('Suscripción')">🔄 Suscripción</button>
          <button class="tv-option-btn" onclick="window.tvSelectOption('Hablar con un agente')">👨💼 Hablar con un agente</button>
          <button class="tv-option-btn" onclick="window.tvSelectOption('Pagos')">💳 Pagos</button>
          <button class="tv-option-btn" onclick="window.tvSelectOption('Otra información')">ℹ️ Otra información</button>
        </div>
      `
    } else {
      document.getElementById('tv-bottom').innerHTML = `
        <div class="tv-chat-row">
          <input class="tv-chat-input" id="tv-msg-input" placeholder="Escribe tu mensaje..." onkeydown="if(event.key==='Enter') window.tvSendMessage()" />
          <button class="tv-send-btn" onclick="window.tvSendMessage()">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8l12-6-6 12-2-4-4-2z" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>
          </button>
        </div>
      `
      setTimeout(() => document.getElementById('tv-msg-input')?.focus(), 100)
    }
  }

  function startPolling() {
    if (pollingInterval) return
    console.log('Iniciando polling con sessionId:', sessionId)
    pollingInterval = setInterval(async () => {
      try {
        if (agentRequestTime && !agentJoined && !waitingMessageSent) {
          const diffMinutes = (Date.now() - agentRequestTime) / 60000
          if (diffMinutes >= 2) {
            waitingMessageSent = true
            addMessage('assistant', 'Todos nuestros agentes están ocupados en este momento 😔 Te responderemos pronto a tu correo. ¡Gracias por tu paciencia! 🙏')
          }
        }

        const url = `${MESSAGES_URL}?sessionId=${sessionId}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.messages && data.messages.length > lastMessageCount) {
          const newMessages = data.messages.slice(lastMessageCount)
          newMessages.forEach(msg => {
            if (msg.role === 'agent') {
              agentJoined = true
              agentRequestTime = null
              waitingMessageSent = false
              addMessage('agent', msg.content)
            }
          })
          lastMessageCount = data.messages.length
        }
      } catch(err) {
        console.error('Error polling:', err)
      }
    }, 5000)
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  function addMessage(role, content) {
    messages.push({ role, content })
    const div = document.createElement('div')
    div.className = `tv-msg ${role === 'user' ? 'user' : 'bot'}`

    if (role === 'agent') {
      div.innerHTML = `
        <div style="width:100%;max-width:80%">
          <div style="font-size:10px;color:#3b82f6;margin-bottom:3px;font-weight:500;">👤 Agente Travitrade</div>
          <div class="tv-bubble agent">${content.replace(/\n/g, '<br>')}</div>
        </div>
      `
    } else if (role === 'user') {
      div.innerHTML = `<div class="tv-bubble user">${content.replace(/\n/g, '<br>')}</div>`
    } else {
      div.innerHTML = `
        <div style="width:100%;max-width:80%">
          <div style="font-size:10px;color:rgba(159,225,203,0.4);margin-bottom:3px;">🤖 Travi</div>
          <div class="tv-bubble bot">${content.replace(/\n/g, '<br>')}</div>
        </div>
      `
    }

    document.getElementById('tv-messages').appendChild(div)
    document.getElementById('tv-messages').scrollTop = 999999
  }

  function showLoading() {
    const div = document.createElement('div')
    div.id = 'tv-loading'
    div.className = 'tv-loading'
    div.innerHTML = '<div class="tv-dot"></div><div class="tv-dot"></div><div class="tv-dot"></div>'
    document.getElementById('tv-messages').appendChild(div)
    document.getElementById('tv-messages').scrollTop = 999999
  }

  function hideLoading() {
    document.getElementById('tv-loading')?.remove()
  }

  async function sendToAPI(userMsg) {
    // Si agente ya intervino, solo guardar mensaje sin esperar respuesta de IA
    if (agentJoined) {
      showLoading()
      try {
        await fetch('https://app.travitrade.com/api/chat/user-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            content: userMsg,
            userEmail: leadData?.email || null,
            userName: leadData?.nombre || null
          })
        })
      } catch(e) {
        console.error('Error guardando mensaje:', e)
      }
      hideLoading()
      showChatInput()
      return // salir sin mostrar error
    }

    // Si no hay agente, responder con IA
    showLoading()
    try {
      const res = await fetch('https://app.travitrade.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          sessionId,
          userEmail: leadData?.email || null
        })
      })
      const data = await res.json()
      hideLoading()

      if (data.sessionId && data.sessionId !== sessionId) {
        sessionId = data.sessionId
        if (leadData?.email) {
          localStorage.setItem(`tv_session_${leadData.email}`, data.sessionId)
        }
        lastMessageCount = 0
      }

      // Si agente está activo en el servidor, no mostrar respuesta del bot
      if (data.agentActive && !data.reply) {
        agentJoined = true
        showChatInput()
        return
      }

      if (data.reply) {
        addMessage('assistant', data.reply)
      }
      showChatInput()
    } catch(err) {
      console.error('Error chat:', err)
      hideLoading()
      addMessage('assistant', 'Ups, intenta de nuevo 😅')
      showChatInput()
    }
  }

  window.tvSubmitLead = async function() {
    const nombre = document.getElementById('tv-nombre').value.trim()
    const apellido = document.getElementById('tv-apellido').value.trim()
    const email = document.getElementById('tv-email').value.trim()
    const pais = document.getElementById('tv-pais').value
    const code = document.getElementById('tv-code').value
    const phone = document.getElementById('tv-phone').value.trim()

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      document.getElementById('tv-email-error').style.display = 'block'
      return
    }
    document.getElementById('tv-email-error').style.display = 'none'

    // Validar teléfono
    const phoneRegex = /^[0-9]{7,15}$/
    if (phone && !phoneRegex.test(phone)) {
      document.getElementById('tv-phone-error').style.display = 'block'
      return
    }
    document.getElementById('tv-phone-error').style.display = 'none'

    if (!nombre || !email || !pais) {
      alert('Por favor completa los campos obligatorios (*).')
      return
    }

    const whatsapp = phone ? `${code}${phone}` : null
    leadData = { nombre, apellido, email, pais, whatsapp }
    leadCaptured = true

    if (email) {
      const savedSession = localStorage.getItem(`tv_session_${email}`)
      if (savedSession) {
        sessionId = savedSession
      } else {
        localStorage.setItem(`tv_session_${email}`, sessionId)
      }
    }

    try {
      await fetch(LEADS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leadData, sessionId })
      })
    } catch {}

    addMessage('user', 'Hola')
    await sendToAPI('Hola')
    startPolling()
  }

  window.tvSelectOption = async function(option) {
    addMessage('user', option)
    if (option.toLowerCase().includes('agente') || option.toLowerCase().includes('soporte')) {
      agentRequestTime = Date.now()
      waitingMessageSent = false
    }
    await sendToAPI(option)
    startPolling()
  }

  window.tvSendMessage = async function() {
    const input = document.getElementById('tv-msg-input')
    const text = input?.value?.trim()
    if (!text) return
    input.value = ''
    addMessage('user', text)
    if (text.toLowerCase().includes('agente') || text.toLowerCase().includes('soporte')) {
      agentRequestTime = Date.now()
      waitingMessageSent = false
    }
    await sendToAPI(text)
    startPolling()
  }

  function init() {
    injectStyles()
    createWidget()

    document.getElementById('tv-chat-btn').addEventListener('click', function() {
      const panel = document.getElementById('tv-chat-panel')
      const isOpen = panel.classList.contains('open')
      panel.classList.toggle('open')

      if (!isOpen && !leadCaptured) {
        // Primera apertura — mostrar mensaje de bienvenida y pedir datos
        addMessage('assistant', '¡Hola! 👋 Soy Travi, el asistente de Travitrade.\n\nPara comenzar necesito algunos datos rápidos:')
        showLeadForm()
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
