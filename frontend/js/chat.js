/**
 * Chat Interface - Mental Wellness Mirror
 * UPDATED: Authentication, conversation history loading, and continue chat
 */

document.addEventListener('DOMContentLoaded', async () => {
  
  // Wait for authManager to finish loading from storage
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // ============================================
  // AUTHENTICATION CHECK
  // ============================================
  if (!window.authManager || !window.authManager.requireAuth()) {
    return; // This will redirect to login if not authenticated
  }
  
  console.log('✅ Chat.js loaded successfully');
  
  // ============================================
  // 1. ELEMENT REFERENCES
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
  const suggestionCards = document.querySelectorAll('.suggestion-card');

  // ============================================
  // 2. STATE MANAGEMENT
  // ============================================
  let activeConversationId = null;
  let currentAudio = null;
  let currentlyPlayingButton = null;

  // Debug: Check if elements exist
  console.log('Elements found:', {
    chatInput: !!chatInput,
    sendBtn: !!sendBtn,
    chatBody: !!chatBody
  });

  // ============================================
  // 3. INITIALIZATION
  // ============================================


  
  // Check for an entry ID in the URL to load a past conversation
  const urlParams = new URLSearchParams(window.location.search);
  const entryId = urlParams.get('entry');
  if (entryId) {
    activeConversationId = parseInt(entryId);
    loadConversationHistory(activeConversationId);
  }
  
  // ============================================
  // 4. FUNCTION DEFINITIONS
  // ============================================

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Add message to UI
  function addMessage(text, author, sentimentLabel = null, sentimentEmoji = null) {
    if (!chatBody) return;
    if (chatEmptyState) chatEmptyState.style.display = 'none';

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${author}`;

    const avatarContent = author === 'user' ? '👤' : '🤖';
    const authorName = author === 'user' ? 'You' : 'Wellness Mirror';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let sentimentHTML = '';
    if (sentimentLabel) {
      const emoji = sentimentEmoji || '😐';
      sentimentHTML = `<div class="sentiment-indicator">${emoji} ${sentimentLabel}</div>`;
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
          <button class="voice-control" title="Read aloud">
            <i class="fas fa-volume-up"></i>
          </button>
        </div>
      </div>
    `;

    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // Send message to backend
  async function sendChatMessage() {
    const messageText = chatInput.value.trim();
    if (!messageText || messageText.length > 5000) {
      alert(messageText ? 'Message is too long.' : 'Message cannot be empty.');
      return;
    }

    addMessage(messageText, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';
    if (charCounter) charCounter.textContent = '0 / 5000';
    if (sendBtn) sendBtn.disabled = true;

    const typingIndicator = showTypingIndicator();

    try {
      // If we are in an existing conversation, includeContext will be true
      const data = await window.api.sendChatMessage(messageText, !!activeConversationId);
      if (typingIndicator) typingIndicator.remove();

      if (data.success && data.data) {
        addMessage(data.data.aiResponse, 'ai', data.data.sentiment?.label, data.data.sentiment?.emoji);
        activeConversationId = data.data.entryId; // Continue the thread
      } else {
        throw new Error('Invalid response');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (typingIndicator) typingIndicator.remove();
      addMessage("I'm having trouble connecting right now. Please try again.", 'ai');
    }
  }

  // Typing indicator
  function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message ai typing-indicator';
    indicator.innerHTML = `
      <div class="message-avatar">🤖</div>
      <div class="message-content">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    `;
    chatBody.appendChild(indicator);
    chatBody.scrollTop = chatBody.scrollHeight;
    return indicator;
  }

  // Text-to-speech
  async function speakMessage(text, button) {
    if (!text) return;

    const playIcon = '<i class="fas fa-volume-up"></i>';
    const pauseIcon = '<i class="fas fa-pause"></i>';

    if (currentlyPlayingButton === button && currentAudio) {
      if (currentAudio.paused) currentAudio.play(), button.innerHTML = pauseIcon;
      else currentAudio.pause(), button.innerHTML = playIcon;
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
      if (currentlyPlayingButton) {
        currentlyPlayingButton.innerHTML = playIcon;
        currentlyPlayingButton.disabled = false;
        currentlyPlayingButton.style.color = '';
      }
    }

    currentlyPlayingButton = button;

    try {
      button.innerHTML = pauseIcon;
      button.style.color = 'var(--primary)';
      button.disabled = true;

      const preferredGender = localStorage.getItem('voiceGender') || 'female';
      const response = await window.api.generateVoice(text, 'en', false, preferredGender);
      button.disabled = false;

      if (response.success && response.data.audioUrl) {
        currentAudio = new Audio(response.data.audioUrl);
        currentAudio.play();
        currentAudio.onended = () => {
          button.innerHTML = playIcon;
          button.style.color = '';
          currentAudio = null;
          currentlyPlayingButton = null;
        };
        currentAudio.onerror = () => {
          console.error('Error playing TTS audio.');
          button.innerHTML = playIcon;
        };
      } else {
        throw new Error('Failed to get audio URL');
      }
    } catch (error) {
      console.error('Error generating or playing voice:', error);
      alert('Could not play audio.');
      button.innerHTML = playIcon;
      button.style.color = '';
    }
  }

  // ⭐ NEW FUNCTION to load history
  async function loadConversationHistory(targetEntryId) {
    if (chatEmptyState) chatEmptyState.style.display = 'none';
    chatBody.innerHTML = '<div class="spinner" style="margin: auto;"></div>';
    chatInput.disabled = true;

    try {
      let allEntries = [];
      let tempOffset = 0;
      let keepFetching = true;
      let targetEntryIndex = -1;

      while (keepFetching) {
        const response = await window.api.getChatHistory(100, tempOffset);
        if (response.success && response.data.entries.length > 0) {
          const entries = response.data.entries;
          allEntries.push(...entries);
          
          if (targetEntryIndex === -1) {
            const foundIndex = entries.findIndex(e => e.id === targetEntryId);
            if (foundIndex !== -1) {
              targetEntryIndex = tempOffset + foundIndex;
            }
          }
          
          tempOffset += 100;
          keepFetching = response.data.pagination.hasMore;
        } else {
          keepFetching = false;
        }
      }
      
      chatBody.innerHTML = '';

      if (targetEntryIndex !== -1) {
        // Since API returns newest first, slice from the target entry onwards, then reverse
        const conversationThread = allEntries.slice(targetEntryIndex).reverse();
        
        conversationThread.forEach(entry => {
          addMessage(entry.user_text, 'user');
          addMessage(entry.ai_response, 'ai', entry.sentiment_label);
        });
      } else {
        addMessage('Conversation not found.', 'ai');
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      addMessage('Failed to load conversation.', 'ai');
    } finally {
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  // ============================================
  // 5. ATTACH EVENT LISTENERS
  // ============================================

  // Sidebar
  if (sidebarOpenBtn) {
    sidebarOpenBtn.addEventListener('click', () => sidebar.classList.add('open'));
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => sidebar.classList.remove('open'));
  }

  // Textarea
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
      if (charCounter) {
        const length = chatInput.value.length;
        charCounter.textContent = `${length} / 5000`;
        charCounter.style.color = length > 5000 ? 'var(--error)' : 'var(--text-muted)';
      }
      if (sendBtn) {
        sendBtn.disabled = chatInput.value.trim().length === 0;
      }
    });
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  // Send button
  if (sendBtn) {
    sendBtn.addEventListener('click', sendChatMessage);
  }

  // Suggestion cards
  suggestionCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (chatInput) {
        chatInput.value = prompt;
        chatInput.focus();
        chatInput.dispatchEvent(new Event('input'));
      }
    });
  });

  // Voice playback (Event Delegation)
  if (chatBody) {
    chatBody.addEventListener('click', (e) => {
      const voiceButton = e.target.closest('.voice-control');
      if (voiceButton) {
        const messageText = voiceButton.closest('.message-content').querySelector('.message-text').textContent;
        if (messageText) {
          speakMessage(messageText, voiceButton);
        }
      }
    });
  }

  console.log('✅ Chat interface initialized');
});