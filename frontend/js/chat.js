/**
 * Chat Interface - Mental Wellness Mirror
 * UPDATED: Requires authentication
 */
/**
 * Chat Interface - Mental Wellness Mirror
 * UPDATED: Requires authentication and correct structure
 */

document.addEventListener('DOMContentLoaded', async () => {
  
  // Wait for authManager to finish loading from storage
  await new Promise(resolve => setTimeout(resolve, 0));
  
  // ============================================
  // AUTHENTICATION CHECK
  // ============================================
  if (!window.authManager || !window.authManager.requireAuth()) {
    // This will redirect to login if not authenticated
    return;
  }
  
  console.log('✅ Chat.js loaded successfully');
  
  // ============================================
  // 1. ELEMENT REFERENCES (DEFINE EVERYTHING FIRST)
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

  // Debug: Check if elements exist
  console.log('Elements found:', {
    chatInput: !!chatInput,
    sendBtn: !!sendBtn,
    chatBody: !!chatBody
  });

  // ============================================
  // 2. LOAD USER INFO
  // ============================================
  const currentUser = window.authManager.getCurrentUser();
  if (currentUser) {
    console.log('✅ Chat loaded for user:', currentUser.email);
    
    // Update user info in sidebar
    const userName = document.querySelector('.user-name');
    const userEmail = document.querySelector('.user-email');
    
    if (userName) userName.textContent = currentUser.fullName || currentUser.username || 'User';
    if (userEmail) userEmail.textContent = currentUser.email;
  }
  
  // ============================================
  // 3. DEFINE FUNCTIONS
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
    
    if (chatEmptyState) {
      chatEmptyState.style.display = 'none';
    }

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
    if (!messageText) return;
    if (messageText.length > 5000) {
      alert('Message is too long. Please keep it under 5000 characters.');
      return;
    }

    console.log('📤 Sending message:', messageText);

    addMessage(messageText, 'user');

    chatInput.value = '';
    chatInput.style.height = 'auto';
    if (charCounter) charCounter.textContent = '0 / 5000';
    if (sendBtn) sendBtn.disabled = true;

    const typingIndicator = showTypingIndicator();

    try {
      const data = await window.api.sendChatMessage(messageText, true);

      if (typingIndicator) typingIndicator.remove();

      if (data.success && data.data) {
        addMessage(data.data.aiResponse, 'ai', data.data.sentiment?.label, data.data.sentiment?.emoji);
        console.log('📊 Stats:', data.data.stats);
        console.log('🎭 Sentiment:', data.data.sentiment);
        console.log('🔧 Source:', data.data.source);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('❌ Error sending message:', error);
      if (typingIndicator) typingIndicator.remove();

      let errorMessage = "I'm having trouble connecting right now. ";
      if (error.message?.includes('TEXT_TOO_SHORT')) {
        errorMessage = "Please write a bit more (at least 10 characters).";
      } else if (error.message?.includes('TEXT_TOO_LONG')) {
        errorMessage = "Your message is too long. Please keep it under 5000 characters.";
      } else if (error.statusCode === 401) {
        errorMessage = "Your session has expired. Please log in again.";
        setTimeout(() => window.location.href = '/pages/login.html', 2000);
      } else {
        errorMessage += "Please try again.";
      }
      addMessage(errorMessage, 'ai');
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
  // ============================================
  // TEXT-TO-SPEECH FUNCTION (UPDATED)
  // ============================================
  let currentAudio = null; // Variable to hold the current audio object
  let currentlyPlayingButton = null;

  async function speakMessage(text, button) {
    if (!text) return;

    const playIcon = '<i class="fas fa-volume-up"></i>';
    const pauseIcon = '<i class="fas fa-pause"></i>';

    // If clicking the same button that is currently playing, pause/resume
    if (currentlyPlayingButton === button && currentAudio) {
      if (currentAudio.paused) {
        currentAudio.play();
        button.innerHTML = pauseIcon;
      } else {
        currentAudio.pause();
        button.innerHTML = playIcon;
      }
      return;
    }

    // If another audio is playing, stop it
    if (currentAudio) {
      currentAudio.pause();
      if (currentlyPlayingButton) {
        currentlyPlayingButton.innerHTML = playIcon;
        currentlyPlayingButton.disabled = false;
        currentlyPlayingButton.style.color = '';
      }
    }

    // Set the new button and audio
    currentlyPlayingButton = button;

    try {
      // Show loading/playing state on the button
      button.innerHTML = pauseIcon;
      button.style.color = 'var(--primary)';
      button.disabled = true;

      // Get gender preference from localStorage
      const preferredGender = localStorage.getItem('voiceGender') || 'female';
      console.log(`🎤 Generating voice with gender: ${preferredGender}`);

      // Use APIClient to call your authenticated TTS endpoint
      const response = await window.api.generateVoice(text, 'en', false, preferredGender);
      
      button.disabled = false; // Enable button once audio is ready to play

      if (response.success && response.data.audioUrl) {
        currentAudio = new Audio(response.data.audioUrl);
        currentAudio.play();
        
        currentAudio.onended = () => {
          // Reset button state when audio finishes
          button.innerHTML = playIcon;
          button.style.color = '';
          currentAudio = null;
          currentlyPlayingButton = null;
        };
        
        currentAudio.onerror = () => {
          console.error('Error playing TTS audio.');
          button.innerHTML = playIcon;
          button.style.color = '';
          currentAudio = null;
          currentlyPlayingButton = null;
        };
        
      } else {
        throw new Error('Failed to get audio URL');
      }
      
    } catch (error) {
      console.error('Error generating or playing voice:', error);
      alert('Could not play audio. Please try again.');
      
      // Reset button state on error
      button.innerHTML = playIcon;
      button.style.color = '';
      currentAudio = null;
      currentlyPlayingButton = null;
    }
  }

  // ============================================
  // 4. ATTACH EVENT LISTENERS
  // ============================================

  // Sidebar
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

  // Textarea
  if (chatInput) {
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto';
      chatInput.style.height = `${Math.min(chatInput.scrollHeight, 200)}px`;
      if (charCounter) {
        const length = chatInput.value.length;
        charCounter.textContent = `${length} / 5000`;
        charCounter.style.color = length > 5000 ? 'var(--error)' : (length > 4500 ? 'var(--warning)' : 'var(--text-muted)');
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