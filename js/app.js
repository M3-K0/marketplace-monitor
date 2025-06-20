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

  openSearchModal() {
    if (this.elements.searchModal) {
      this.elements.searchModal.classList.add('active');
      console.log('Search modal opened');
    }
  }

  closeSearchModal() {
    if (this.elements.searchModal) {
      this.elements.searchModal.classList.remove('active');
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
    this.searches = [];
    this.renderSearches();
  }

  async loadRecentListings() {
    this.listings = [];
    this.renderResults();
  }

  renderSearches() {
    if (this.elements.searchList) {
      this.elements.searchList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <p>Ready to start!</p>
          <p class="help-text">Create your first search to see demo listings</p>
        </div>
      `;
    }
  }

  renderResults() {
    if (this.elements.resultsList) {
      this.elements.resultsList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p>Demo app ready</p>
          <p class="help-text">This app shows mock data for demonstration</p>
        </div>
      `;
    }
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
}

const app = new MarketplaceMonitorApp();

document.addEventListener('DOMContentLoaded', () => {
  app.init().catch(error => {
    console.error('Failed to start app:', error);
  });
});
