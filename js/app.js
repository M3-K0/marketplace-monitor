class MarketplaceMonitorApp {
  constructor() {
    this.isOnline = navigator.onLine;
    this.deferredPrompt = null;
    this.elements = {};
    this.currentEditId = null;
    this.searches = [];
    this.listings = [];
    this.storageReady = false;
  }

  async init() {
    console.log('Initializing Marketplace Monitor App...');
    
    try {
      this.initElements();
      this.setupEventListeners();
      
      try {
        await storage.init();
        this.storageReady = true;
        console.log('Storage initialized successfully');
      } catch (error) {
        console.warn('Storage initialization failed, using fallback mode:', error);
        this.storageReady = false;
      }
      
      try {
        await this.registerServiceWorker();
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
      
      if (this.storageReady) {
        try {
          await this.loadSearches();
          await this.loadRecentListings();
        } catch (error) {
          console.warn('Failed to load data, using mock data:', error);
          this.renderBasicUI();
        }
      } else {
        this.renderBasicUI();
      }
      
      this.setupNetworkListeners();
      this.handleInstallPrompt();
      
      console.log('App initialized successfully');
      this.showToast('App ready!', 'success');
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showToast('App started with limited functionality', 'warning');
      this.renderBasicUI();
    }
  }

  initElements() {
    this.elements = {
      searchList: document.getElementById('searchList'),
      addSearchBtn: document.getElementById('addSearchBtn'),
      runAllSearchesBtn: document.getElementById('runAllSearchesBtn'),
      resultsList: document.getElementById('resultsList'),
      searchModal: document.getElementById('searchModal'),
      settingsModal: document.getElementById('settingsModal'),
      closeModal: document.getElementById('closeModal'),
      closeSettingsModal: document.getElementById('closeSettingsModal'),
      modalTitle: document.getElementById('modalTitle'),
      searchForm: document.getElementById('searchForm'),
      keywords: document.getElementById('keywords'),
      minPrice: document.getElementById('minPrice'),
      maxPrice: document.getElementById('maxPrice'),
      location: document.getElementById('location'),
      radius: document.getElementById('radius'),
      radiusValue: document.getElementById('radiusValue'),
      enabled: document.getElementById('enabled'),
      cancelBtn: document.getElementById('cancelBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      startTime: document.getElementById('startTime'),
      endTime: document.getElementById('endTime'),
      checkInterval: document.getElementById('checkInterval'),
      enableNotifications: document.getElementById('enableNotifications'),
      enableSound: document.getElementById('enableSound'),
      exportData: document.getElementById('exportData'),
      importData: document.getElementById('importData'),
      clearData: document.getElementById('clearData'),
      toastContainer: document.getElementById('toastContainer')
    };
  }

  setupEventListeners() {
    try {
      if (this.elements.addSearchBtn) {
        this.elements.addSearchBtn.addEventListener('click', () => {
          console.log('Add Search button clicked');
          this.openSearchModal();
        });
      }
      
      if (this.elements.runAllSearchesBtn) {
        this.elements.runAllSearchesBtn.addEventListener('click', () => {
          console.log('Run All Searches button clicked');
          this.runAllSearches();
        });
      }
      
      if (this.elements.settingsBtn) {
        this.elements.settingsBtn.addEventListener('click', () => {
          console.log('Settings button clicked');
          this.openSettingsModal();
        });
      }
      
      if (this.elements.closeModal) {
        this.elements.closeModal.addEventListener('click', () => this.closeSearchModal());
      }
      
      if (this.elements.closeSettingsModal) {
        this.elements.closeSettingsModal.addEventListener('click', () => this.closeSettingsModal());
      }
      
      if (this.elements.cancelBtn) {
        this.elements.cancelBtn.addEventListener('click', () => this.closeSearchModal());
      }
      
      if (this.elements.searchForm) {
        this.elements.searchForm.addEventListener('submit', (e) => this.handleSearchSubmit(e));
      }
      
      if (this.elements.radius) {
        this.elements.radius.addEventListener('input', (e) => {
          if (this.elements.radiusValue) {
            this.elements.radiusValue.textContent = e.target.value;
          }
        });
      }
      
      if (this.elements.exportData) {
        this.elements.exportData.addEventListener('click', () => this.exportData());
      }
      
      if (this.elements.importData) {
        this.elements.importData.addEventListener('click', () => this.importData());
      }
      
      if (this.elements.clearData) {
        this.elements.clearData.addEventListener('click', () => this.clearAllData());
      }
      
      document.addEventListener('click', (e) => {
        if (e.target.closest('.modal') && !e.target.closest('.modal-content')) {
          this.closeSearchModal();
          this.closeSettingsModal();
        }
      });
      
      console.log('Event listeners setup complete');
    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const swPath = location.pathname.endsWith('/') 
          ? location.pathname + 'sw.js' 
          : location.pathname + '/sw.js';
        
        const registration = await navigator.serviceWorker.register(swPath);
        console.log('Service Worker registered:', registration);
        return registration;
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        throw error;
      }
    }
  }

  openSearchModal(editSearch = null) {
    if (this.elements.searchModal) {
      this.currentEditId = editSearch ? editSearch.id : null;
      
      if (editSearch) {
        this.elements.modalTitle.textContent = 'Edit Search';
        this.elements.keywords.value = editSearch.keywords || '';
        this.elements.minPrice.value = editSearch.minPrice || '';
        this.elements.maxPrice.value = editSearch.maxPrice || '';
        this.elements.location.value = editSearch.location || '';
        this.elements.radius.value = editSearch.radius || 30;
        this.elements.radiusValue.textContent = editSearch.radius || 30;
        this.elements.enabled.checked = editSearch.enabled !== false;
      } else {
        this.elements.modalTitle.textContent = 'Add New Search';
        this.elements.searchForm.reset();
        this.elements.radiusValue.textContent = '30';
        this.elements.enabled.checked = true;
      }
      
      this.elements.searchModal.classList.add('active');
      this.elements.keywords.focus();
      console.log('Search modal opened');
    }
  }

  closeSearchModal() {
    if (this.elements.searchModal) {
      this.elements.searchModal.classList.remove('active');
      this.currentEditId = null;
      this.elements.searchForm.reset();
      console.log('Search modal closed');
    }
  }

  openSettingsModal() {
    if (this.elements.settingsModal) {
      this.elements.settingsModal.classList.add('active');
      console.log('Settings modal opened');
    }
  }

  closeSettingsModal() {
    if (this.elements.settingsModal) {
      this.elements.settingsModal.classList.remove('active');
      console.log('Settings modal closed');
    }
  }

  async loadSearches() {
    try {
      if (this.storageReady) {
        this.searches = await storage.getAllSearches();
      } else {
        this.searches = [];
      }
      this.renderSearches();
    } catch (error) {
      console.error('Failed to load searches:', error);
      this.searches = [];
      this.renderSearches();
    }
  }

  async loadRecentListings() {
    try {
      if (this.storageReady) {
        this.listings = await storage.getRecentListings(24);
      } else {
        this.listings = [];
      }
      this.renderResults();
    } catch (error) {
      console.error('Failed to load listings:', error);
      this.listings = [];
      this.renderResults();
    }
  }

  renderSearches() {
    if (!this.elements.searchList) return;
    
    if (this.searches.length === 0) {
      this.elements.searchList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <p>Ready to start!</p>
          <p class="help-text">Create your first search to see demo listings</p>
        </div>
      `;
      return;
    }

    const searchCards = this.searches.map(search => `
      <div class="search-card ${search.enabled ? 'enabled' : 'disabled'}" data-search-id="${search.id}">
        <div class="search-header">
          <h3 class="search-title">${this.escapeHtml(search.keywords)}</h3>
          <div class="search-actions">
            <button class="icon-btn run-search" title="Run Search" data-search-id="${search.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button class="icon-btn edit-search" title="Edit Search" data-search-id="${search.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="icon-btn delete-search" title="Delete Search" data-search-id="${search.id}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="search-details">
          <div class="search-detail">
            <span class="label">Location:</span>
            <span class="value">${this.escapeHtml(search.location)}</span>
          </div>
          ${this.formatPriceRange(search.minPrice, search.maxPrice) ? `
            <div class="search-detail">
              <span class="label">Price:</span>
              <span class="value">${this.formatPriceRange(search.minPrice, search.maxPrice)}</span>
            </div>
          ` : ''}
          <div class="search-detail">
            <span class="label">Radius:</span>
            <span class="value">${search.radius || 30}km</span>
          </div>
          ${search.lastChecked ? `
            <div class="search-detail">
              <span class="label">Last checked:</span>
              <span class="value">${this.formatTimeAgo(search.lastChecked)}</span>
            </div>
          ` : ''}
        </div>
        <div class="search-status ${search.enabled ? 'enabled' : 'disabled'}">
          ${search.enabled ? 'Active' : 'Disabled'}
        </div>
      </div>
    `).join('');

    this.elements.searchList.innerHTML = searchCards;
    this.attachSearchCardListeners();
  }

  renderResults() {
    if (!this.elements.resultsList) return;
    
    if (this.listings.length === 0) {
      this.elements.resultsList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p>No matches yet</p>
          <p class="help-text">Run searches to see listings here</p>
        </div>
      `;
      return;
    }

    const listingCards = this.listings.map(listing => `
      <div class="listing-card ${listing.seen ? 'seen' : 'unseen'}" data-listing-id="${listing.id}">
        <div class="listing-image">
          ${listing.image ? `
            <img src="${listing.image}" alt="${this.escapeHtml(listing.title)}" loading="lazy" onerror="this.src='/images/placeholder.jpg'">
          ` : `
            <div class="placeholder-image">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
          `}
        </div>
        <div class="listing-content">
          <h3 class="listing-title">${this.escapeHtml(listing.title)}</h3>
          <div class="listing-price">${this.escapeHtml(listing.price)}</div>
          <div class="listing-location">${this.escapeHtml(listing.location)}</div>
          <div class="listing-meta">
            <span class="listing-time">${this.formatTimeAgo(listing.timestamp)}</span>
            ${!listing.seen ? '<span class="new-badge">New</span>' : ''}
          </div>
        </div>
        <div class="listing-actions">
          ${listing.url ? `
            <a href="${listing.url}" target="_blank" class="btn btn-primary btn-sm">View</a>
          ` : ''}
          <button class="btn btn-secondary btn-sm mark-seen" data-listing-id="${listing.id}">
            ${listing.seen ? 'Seen' : 'Mark Seen'}
          </button>
        </div>
      </div>
    `).join('');

    this.elements.resultsList.innerHTML = listingCards;
    this.attachListingListeners();
  }

  attachListingListeners() {
    document.querySelectorAll('.mark-seen').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const listingId = e.target.dataset.listingId;
        try {
          if (this.storageReady) {
            await storage.markListingAsSeen(parseInt(listingId));
          }
          await this.loadRecentListings();
        } catch (error) {
          console.error('Failed to mark listing as seen:', error);
        }
      });
    });
  }

  renderBasicUI() {
    this.renderSearches();
    this.renderResults();
  }

  setupNetworkListeners() {
    // Network status listeners
  }

  handleInstallPrompt() {
    // PWA install prompt handler
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    if (this.elements.toastContainer) {
      this.elements.toastContainer.appendChild(toast);
      setTimeout(() => toast.remove(), 5000);
    }
  }

  formatPriceRange(min, max) {
    if (min && max) return `$${min} - $${max}`;
    if (min) return `$${min}+`;
    if (max) return `Up to $${max}`;
    return null;
  }

  formatTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async handleSearchSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const searchData = {
      keywords: formData.get('keywords').trim(),
      minPrice: formData.get('minPrice') ? parseInt(formData.get('minPrice')) : null,
      maxPrice: formData.get('maxPrice') ? parseInt(formData.get('maxPrice')) : null,
      location: formData.get('location').trim(),
      radius: parseInt(formData.get('radius')) || 30,
      enabled: formData.get('enabled') === 'on'
    };

    if (!searchData.keywords) {
      this.showToast('Keywords are required', 'error');
      return;
    }

    if (!searchData.location) {
      this.showToast('Location is required', 'error');
      return;
    }

    try {
      if (this.currentEditId) {
        await storage.updateSearch(this.currentEditId, searchData);
        this.showToast('Search updated successfully', 'success');
      } else {
        await storage.saveSearch(searchData);
        this.showToast('Search created successfully', 'success');
      }
      
      await this.loadSearches();
      this.closeSearchModal();
    } catch (error) {
      console.error('Failed to save search:', error);
      this.showToast('Failed to save search', 'error');
    }
  }

  attachSearchCardListeners() {
    document.querySelectorAll('.run-search').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const searchId = parseInt(e.target.closest('[data-search-id]').dataset.searchId);
        this.runSingleSearch(searchId);
      });
    });

    document.querySelectorAll('.edit-search').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const searchId = parseInt(e.target.closest('[data-search-id]').dataset.searchId);
        const search = this.searches.find(s => s.id === searchId);
        if (search) {
          this.openSearchModal(search);
        }
      });
    });

    document.querySelectorAll('.delete-search').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const searchId = parseInt(e.target.closest('[data-search-id]').dataset.searchId);
        this.deleteSearch(searchId);
      });
    });
  }

  async runSingleSearch(searchId) {
    const search = this.searches.find(s => s.id === searchId);
    if (!search) {
      this.showToast('Search not found', 'error');
      return;
    }

    try {
      this.showToast(`Running search: ${search.keywords}`, 'info');
      
      // Use the scraper to get listings
      const listings = await marketplaceScraper.scrapeMarketplace(search);
      
      if (listings.length > 0) {
        if (this.storageReady) {
          await storage.saveListings(listings);
        }
        await this.loadRecentListings();
        this.showToast(`Found ${listings.length} listings`, 'success');
      } else {
        this.showToast('No new listings found', 'info');
      }
    } catch (error) {
      console.error('Search failed:', error);
      this.showToast('Search failed', 'error');
    }
  }

  async runAllSearches() {
    const activeSearches = this.searches.filter(s => s.enabled);
    if (activeSearches.length === 0) {
      this.showToast('No active searches found', 'warning');
      return;
    }

    this.showToast(`Running ${activeSearches.length} searches...`, 'info');
    
    for (const search of activeSearches) {
      try {
        await this.runSingleSearch(search.id);
        // Add delay between searches
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to run search ${search.keywords}:`, error);
      }
    }
  }

  async deleteSearch(searchId) {
    const search = this.searches.find(s => s.id === searchId);
    if (!search) return;

    if (!confirm(`Are you sure you want to delete the search "${search.keywords}"?`)) {
      return;
    }

    try {
      if (this.storageReady) {
        await storage.deleteSearch(searchId);
      }
      await this.loadSearches();
      await this.loadRecentListings();
      this.showToast('Search deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete search:', error);
      this.showToast('Failed to delete search', 'error');
    }
  }

  async exportData() {
    try {
      if (!this.storageReady) {
        this.showToast('Storage not available', 'error');
        return;
      }

      const data = await storage.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `marketplace-monitor-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.showToast('Data exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showToast('Failed to export data', 'error');
    }
  }

  async importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        await storage.importData(text);
        await this.loadSearches();
        await this.loadRecentListings();
        this.showToast('Data imported successfully', 'success');
      } catch (error) {
        console.error('Failed to import data:', error);
        this.showToast('Failed to import data', 'error');
      }
    };
    
    input.click();
  }

  async clearAllData() {
    if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      return;
    }
    
    try {
      if (this.storageReady) {
        await storage.clearAllData();
      }
      await this.loadSearches();
      await this.loadRecentListings();
      this.showToast('All data cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showToast('Failed to clear data', 'error');
    }
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showToast('Back online', 'success');
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showToast('You are offline', 'warning');
    });
  }

  handleInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });
  }

  showInstallPrompt() {
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
      <div class="install-prompt-header">
        <div class="install-prompt-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 20h14v-2H5v2zm7-18L5.5 8.5l1.41 1.41L11 5.83V17h2V5.83l4.09 4.08L18.5 8.5 12 2z"/>
          </svg>
        </div>
        <div class="install-prompt-text">
          <h4>Install Marketplace Monitor</h4>
          <p>Install this app for faster access and background monitoring</p>
        </div>
      </div>
      <div class="install-prompt-actions">
        <button class="btn btn-secondary" id="dismissInstall">Not now</button>
        <button class="btn btn-primary" id="installApp">Install</button>
      </div>
    `;
    
    document.body.appendChild(installPrompt);
    
    setTimeout(() => installPrompt.classList.add('show'), 100);
    
    document.getElementById('installApp').addEventListener('click', async () => {
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        const result = await this.deferredPrompt.userChoice;
        if (result.outcome === 'accepted') {
          console.log('PWA installed');
        }
        this.deferredPrompt = null;
      }
      installPrompt.remove();
    });
    
    document.getElementById('dismissInstall').addEventListener('click', () => {
      installPrompt.remove();
    });
  }
}

const app = new MarketplaceMonitorApp();

document.addEventListener('DOMContentLoaded', () => {
  app.init().catch(error => {
    console.error('Failed to start app:', error);
  });
});
