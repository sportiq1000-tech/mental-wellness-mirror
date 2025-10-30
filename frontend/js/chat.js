document.addEventListener('DOMContentLoaded', () => {
    // Sidebar toggle functionality
    const sidebar = document.getElementById('sidebar');
    const sidebarOpenBtn = document.getElementById('sidebarOpen');
    const sidebarCloseBtn = document.getElementById('sidebarClose');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    sidebarOpenBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    });

    sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    });

    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    });

    // Auto-resizing textarea
    const chatInput = document.getElementById('chatInput');
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    // Suggestion card prompts
    const suggestionCards = document.querySelectorAll('.suggestion-card');
    suggestionCards.forEach(card => {
        card.addEventListener('click', () => {
            const prompt = card.dataset.prompt;
            chatInput.value = prompt;
            chatInput.focus();
        });
    });

    // Mock chat functionality
    const sendBtn = document.getElementById('sendBtn');
    const chatBody = document.getElementById('chatBody');
    const chatEmptyState = document.getElementById('chatEmptyState');

    function addMessage(text, author, sentiment = null) {
        // Hide empty state
        if (chatEmptyState) chatEmptyState.style.display = 'none';

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${author}`;

        const avatarInitial = author === 'user' ? 'DH' : 'AI';
        const authorName = author === 'user' ? 'Dhara' : 'Wellness Mirror';

        let sentimentHTML = '';
        if (sentiment) {
            const emoji = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😔' : '😐';
            sentimentHTML = `<div class="sentiment-indicator">${emoji} ${sentiment}</div>`;
        }

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatarInitial}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${authorName}</span>
                </div>
                <div class="message-text">${text}</div>
                <div class="message-meta">
                    ${sentimentHTML}
                    <button class="voice-control" title="Play audio">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>
        `;
        chatBody.appendChild(messageDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function sendChatMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';
        chatInput.style.height = 'auto';

        // Mock bot reply
        setTimeout(() => {
            const replies = [
                "Thanks for sharing. It's brave to open up about your feelings.",
                "I hear you. Let's explore that a bit more. What's one word you'd use to describe that feeling?",
                "That sounds like a lot to handle. Remember to be kind to yourself.",
                "Noted. Have you noticed any patterns when this feeling comes up?"
            ];
            const botReply = replies[Math.floor(Math.random() * replies.length)];
            const sentiment = ['positive', 'negative', 'neutral'][Math.floor(Math.random() * 3)];
            addMessage(botReply, 'ai', sentiment);
        }, 1000);
    }

    sendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });

});