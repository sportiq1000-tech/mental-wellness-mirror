/**
 * History Page Logic
 * Fetches and displays chat history
 */

// ============================================
// AUTHENTICATION CHECK
// ============================================
if (!window.authManager || !window.authManager.requireAuth()) {
  throw new Error('Authentication required');
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ History.js loaded successfully');
  
  // ============================================
  // ELEMENT REFERENCES
  // ============================================
  const historyList = document.getElementById('historyList');
  const loadingSpinner = document.getElementById('loadingSpinner');
  const emptyState = document.getElementById('emptyState');
  const searchInput = document.getElementById('searchInput');
  const sidebar = document.getElementById('sidebar');
  const toggleSidebarBtn = document.getElementById('toggleSidebar');

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  let state = {
    entries: [],
    isLoading: false,
    hasMore: true,
    offset: 0,
    limit: 20,
    searchTerm: ''
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  
  // Auth Check
  if (!window.authManager || !window.authManager.requireAuth()) {
    return;
  }

  // Load user info
 
  
  // Initial fetch
  fetchAndRenderHistory(true);
  
  // ============================================
  // EVENT LISTENERS
  // ============================================
  
  // Sidebar toggle
  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !toggleSidebarBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Infinite scroll
  const scrollWrapper = document.querySelector('.main-content');
  scrollWrapper.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = scrollWrapper;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      if (!state.isLoading && state.hasMore) {
        fetchAndRenderHistory();
      }
    }
  });

  // Search input
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.searchTerm = e.target.value.toLowerCase();
      fetchAndRenderHistory(true);
    }, 300);
  });

  // Delegated click for delete button
  historyList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
      e.preventDefault(); // Prevent navigation if delete is clicked
      e.stopPropagation(); // Stop event from bubbling to the link
      const entryId = deleteBtn.dataset.entryId;
      handleDelete(entryId);
    }
  });

  // ============================================
  // CORE FUNCTIONS
  // ============================================
  
  async function fetchAndRenderHistory(isInitialLoad = false) {
    if (state.isLoading) return;
    
    state.isLoading = true;
    loadingSpinner.style.display = 'flex';
    if (isInitialLoad) {
      state.offset = 0;
      state.hasMore = true;
      historyList.innerHTML = '';
    }

    try {
      // NOTE: For simplicity, this fetches all and filters client-side.
      // For large datasets, the backend should handle search.
      if (isInitialLoad && state.entries.length === 0) {
        let allEntries = [];
        let tempOffset = 0;
        let keepFetching = true;
        while (keepFetching) {
          const response = await window.api.getChatHistory(100, tempOffset);
          if (response.success && response.data.entries.length > 0) {
            allEntries.push(...response.data.entries);
            tempOffset += 100;
            keepFetching = response.data.pagination.hasMore;
          } else {
            keepFetching = false;
          }
        }
        state.entries = allEntries;
      }
      
      const filteredEntries = state.entries.filter(entry => 
        entry.user_text.toLowerCase().includes(state.searchTerm) || 
        entry.ai_response.toLowerCase().includes(state.searchTerm)
      );

      renderEntries(filteredEntries);

    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      state.isLoading = false;
      loadingSpinner.style.display = 'none';
      checkEmptyState();
    }
  }

  function renderEntries(entries) {
    historyList.innerHTML = '';
    
    entries.forEach(entry => {
      const li = document.createElement('li');
      li.className = 'history-item';
      
      const title = entry.user_text.split(' ').slice(0, 5).join(' ') + '...';
      const snippet = entry.user_text.substring(0, 150) + (entry.user_text.length > 150 ? '...' : '');
      const date = new Date(entry.timestamp).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
      
      // ⭐ CHANGE: Wrap content in an <a> tag
      li.innerHTML = `
        <a href="chat.html?entry=${entry.id}" class="history-item-link">
          <div class="item-content">
            <div class="item-header">
              <h3 class="item-title">${escapeHtml(title)}</h3>
              <span class="item-date">${date}</span>
            </div>
            <p class="item-snippet">${escapeHtml(snippet)}</p>
          </div>
          <div class="item-actions">
            <button class="delete-btn" data-entry-id="${entry.id}" title="Delete Entry">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </a>
      `;
      historyList.appendChild(li);
    });
  }

  function checkEmptyState() {
    if (historyList.children.length === 0) {
      emptyState.style.display = 'block';
    } else {
      emptyState.style.display = 'none';
    }
  }

  async function handleDelete(entryId) {
    if (!confirm('Are you sure you want to delete this conversation? This cannot be undone.')) {
      return;
    }

    try {
      await window.api.deleteChatEntry(entryId);
      
      const itemToRemove = historyList.querySelector(`.history-item-link[href="chat.html?entry=${entryId}"]`)?.closest('li');
      if (itemToRemove) {
        itemToRemove.remove();
      }
      
      state.entries = state.entries.filter(entry => entry.id !== parseInt(entryId));
      
      checkEmptyState();
      
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Failed to delete entry. Please try again.');
    }
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});