/**
 * Chat Interface - Mental Wellness Mirror
 * Connects to real backend API
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Chat.js loaded successfully');

  // ============================================
  // ELEMENT REFERENCES
  // ============================================
  const sidebar = document.getElementById('sidebar');
  const sidebarOpenBtn = document.getElementById('sidebarOpen');
  const sidebarCloseBtn = document.getElementById('sidebarClose');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const chatBody = document.getElementById('chatBody');
  const chatEmptyState = document.getElementById('chatEmptyState');
  const charCounter = document.getElementById('charCounter');

  // Debug: Check if elements exist
  console.log('Elements found:', {
    chatInput: !!chatInput,
    sendBtn: !!sendBtn,
    chatBody: !!chatBody
  });

  // ============================================
  // SIDEBAR TOGGLE (Mobile)
  // ============================================
  if (sidebarOpenBtn) {
    sidebarOpenBtn.addEventListener('click', () => {
      sidebar.classList.add('open');
      if (sidebarOverlay) sidebarOverlay.classList.add('active');
    });
  }

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
      sidebar.classList.remove('open');
      if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // ============================================
  // AUTO-RESIZING TEXTAREA
  // ============================================
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      // Reset height to auto to get correct scrollHeight
      chatInput.style.height = 'auto';
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;

      // Update character counter
      if (charCounter) {
        const length = chatInput.value.length;
        charCounter.textContent = `${length} / 5000`;
        
        if (length > 5000) {
          charCounter.style.color = 'var(--error)';
        } else if (length > 4500) {
          charCounter.style.color = 'var(--warning)';
        } else {
          charCounter.style.color = 'var(--text-muted)';
        }
      }

      // Enable/disable send button
      if (sendBtn) {
        sendBtn.disabled = chatInput.value.trim().length === 0;
      }
    });
  }

  // ============================================
  // SUGGESTION CARDS (Quick Prompts)
  // ============================================
  const suggestionCards = document.querySelectorAll('.suggestion-card');
  suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (chatInput) {
        chatInput.value = prompt;
        chatInput.focus();
        // Trigger input event to resize
        chatInput.dispatchEvent(new Event('input'));
      }
    });
  });

  // ============================================
// ADD MESSAGE TO CHAT UI
// ============================================
function addMessage(text, author, sentimentLabel = null, sentimentEmoji = null) {
  console.log('Adding message:', { text, author, sentimentLabel, sentimentEmoji });

  // Hide empty state
  if (chatEmptyState) {
    chatEmptyState.style.display = 'none';
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${author}`;

  const avatarContent = author === 'user' ? '👤' : '🤖';
  const authorName = author === 'user' ? 'You' : 'Wellness Mirror';
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Build sentiment indicator
  let sentimentHTML = '';
  if (sentimentLabel) {
    const emoji = sentimentEmoji || '😐';
    sentimentHTML = `
      <div class="sentiment-indicator">
        ${emoji} ${sentimentLabel}
      </div>
    `;
  }

  messageDiv.innerHTML = `
    <div class="message-avatar">${avatarContent}</div>
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${authorName}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-text">${escapeHtml(text)}</div>
      <div class="message-meta">
        ${sentimentHTML}
        <button class="voice-control" title="Read aloud" onclick="speakMessage(this)">
          <i class="fas fa-volume-up"></i>
        </button>
      </div>
    </div>
  `;

  chatBody.appendChild(messageDiv);
  chatBody.scrollTop = chatBody.scrollHeight;
}

  // ============================================
  // SEND MESSAGE TO BACKEND API
  // ============================================
  // ============================================
// SEND MESSAGE TO BACKEND API
// ============================================
async function sendChatMessage() {
  const messageText = chatInput.value.trim();
  
  if (!messageText) {
    console.log('Empty message, not sending');
    return;
  }

  if (messageText.length > 5000) {
    alert('Message is too long. Please keep it under 5000 characters.');
    return;
  }

  console.log('📤 Sending message:', messageText);

  // Add user message to UI
  addMessage(messageText, 'user');

  // Clear input and reset height
  chatInput.value = '';
  chatInput.style.height = 'auto';
  if (charCounter) charCounter.textContent = '0 / 5000';
  if (sendBtn) sendBtn.disabled = true;

  // Show typing indicator
  const typingIndicator = showTypingIndicator();

  try {
    // Make API call to backend
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: messageText,              // ✅ Changed from 'message' to 'text'
        includeContext: true             // ✅ Get context from recent entries
      })
    });

    // Remove typing indicator
    if (typingIndicator) typingIndicator.remove();

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('📥 Received response:', data);

    // Add AI response to UI
    if (data.success && data.data) {
      addMessage(
        data.data.aiResponse,           // ✅ Backend returns 'aiResponse'
        'ai',
        data.data.sentiment?.label,     // ✅ Use sentiment label
        data.data.sentiment?.emoji      // ✅ Use sentiment emoji
      );

      // Log stats for debugging
      console.log('📊 Stats:', data.data.stats);
      console.log('🎭 Sentiment:', data.data.sentiment);
      console.log('🔧 Source:', data.data.source);

    } else {
      throw new Error('Invalid response format from server');
    }

  } catch (error) {
    console.error('❌ Error sending message:', error);
    
    // Remove typing indicator if still showing
    if (typingIndicator) typingIndicator.remove();

    // Show user-friendly error message
    let errorMessage = "I'm having trouble connecting right now. ";
    
    if (error.message.includes('TEXT_TOO_SHORT')) {
      errorMessage = "Please write a bit more (at least 10 characters).";
    } else if (error.message.includes('TEXT_TOO_LONG')) {
      errorMessage = "Your message is too long. Please keep it under 5000 characters.";
    } else {
      errorMessage += "Please check that the server is running and try again.";
    }

    addMessage(errorMessage, 'ai');
  }
}

  // ============================================
  // TYPING INDICATOR
  // ============================================
  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message ai typing-indicator';
    indicator.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    chatBody.appendChild(indicator);
    chatBody.scrollTop = chatBody.scrollHeight;
    return indicator;
  }

  // ============================================
  // EVENT LISTENERS
  // ============================================
  
  // Send button click
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      console.log('Send button clicked');
      sendChatMessage();
    });
  }

  // Enter key to send (Shift+Enter for new line)
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        console.log('Enter key pressed');
        sendChatMessage();
      }
    });
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Text-to-speech (optional feature)
  window.speakMessage = function(button) {
    const messageText = button.closest('.message-content').querySelector('.message-text').textContent;
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(messageText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
      
      // Visual feedback
      button.style.color = 'var(--primary)';
      setTimeout(() => {
        button.style.color = '';
      }, 2000);
    } else {
      alert('Text-to-speech is not supported in your browser.');
    }
  };

  console.log('✅ Chat interface initialized');
});