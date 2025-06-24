class MarketplaceMonitorApp {
  constructor() {
    this.isOnline = navigator.onLine;
    this.deferredPrompt = null;
    this.elements = {};
    this.currentEditId = null;
    this.searches = [];
    this.listings = [];
    this.storageReady = false;
    this.filteredListings = [];
    this.savedFilters = [];
    this.automaticSearchTimer = null;
    this.automaticSearchInterval = 30; // minutes
    this.filters = {
      minPrice: null,
      maxPrice: null,
      categories: [],
      status: ['new', 'price-drop']
    };
  }

  async init() {
    console.log('Initializing Marketplace Monitor App...');
    
    // Wait for DOM to be fully ready (Edge compatibility)
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    try {
      this.initElements();
      this.setupEventListeners();
      this.setupFilterListeners();
      this.setupFormValidation();
      this.setupEnhancedAlerts();
      
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
          await this.loadSavedFilters();
          this.updateDashboardMetrics();
        } catch (error) {
          console.warn('Failed to load data, using mock data:', error);
          this.renderBasicUI();
        }
      } else {
        this.renderBasicUI();
      }
      
      this.setupNetworkListeners();
      this.handleInstallPrompt();
      
      // Initialize automatic search scheduler
      if (this.storageReady) {
        await this.initializeAutomaticSearch();
      }
      
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
      dateListed: document.getElementById('dateListed'),
      // location and radius are now fixed, no longer needed
      enabled: document.getElementById('enabled'),
      // Dashboard elements
      activeSearchesCount: document.getElementById('activeSearchesCount'),
      recentMatchesCount: document.getElementById('recentMatchesCount'),
      successRate: document.getElementById('successRate'),
      priceDropsCount: document.getElementById('priceDropsCount'),
      // Filter elements
      filterMinPrice: document.getElementById('filterMinPrice'),
      filterMaxPrice: document.getElementById('filterMaxPrice'),
      clearFilters: document.getElementById('clearFilters'),
      saveCurrentFilter: document.getElementById('saveCurrentFilter'),
      savedFiltersContainer: document.getElementById('savedFiltersContainer'),
      cancelBtn: document.getElementById('cancelBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      startTime: document.getElementById('startTime'),
      endTime: document.getElementById('endTime'),
      checkInterval: document.getElementById('checkInterval'),
      enableNotifications: document.getElementById('enableNotifications'),
      enableSound: document.getElementById('enableSound'),
      // Enhanced alert elements
      testNotifications: document.getElementById('testNotifications'),
      enableQuietHours: document.getElementById('enableQuietHours'),
      alertVolume: document.getElementById('alertVolume'),
      volumeDisplay: document.getElementById('volumeDisplay'),
      enableEmailAlerts: document.getElementById('enableEmailAlerts'),
      emailSettings: document.getElementById('emailSettings'),
      emailAddress: document.getElementById('emailAddress'),
      testEmail: document.getElementById('testEmail'),
      maxDailyAlerts: document.getElementById('maxDailyAlerts'),
      priceDropThreshold: document.getElementById('priceDropThreshold'),
      exportData: document.getElementById('exportData'),
      importData: document.getElementById('importData'),
      clearData: document.getElementById('clearData'),
      toastContainer: document.getElementById('toastContainer')
    };
  }

  setupEventListeners() {
    try {
      if (this.elements.addSearchBtn) {
        console.log('Setting up Add Search button listener');
        this.elements.addSearchBtn.addEventListener('click', () => {
          console.log('Add Search button clicked');
          this.openSearchModal();
        });
      } else {
        console.error('Add Search button not found!');
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
      
      // Radius is now fixed at 20km, no longer needed
      
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
        this.elements.dateListed.value = editSearch.dateListed || 'all';
        // Location and radius are now fixed - no form fields to update
        this.elements.enabled.checked = editSearch.enabled !== false;
      } else {
        this.elements.modalTitle.textContent = 'Add New Search';
        this.elements.searchForm.reset();
        this.elements.enabled.checked = true;
        this.elements.dateListed.value = 'all';
      }
      
      this.elements.searchModal.classList.add('active');
      this.elements.keywords.focus();
      
      // Set up suggestion listeners now that the modal is open
      if (this.setupSuggestionListeners) {
        this.setupSuggestionListeners();
      }
      
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
      this.updateDashboardMetrics();
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
        console.log(`📥 Loaded ${this.listings.length} recent listings from storage`);
        this.listings.forEach((listing, index) => {
          console.log(`  ${index + 1}. ${listing.title} (ID: ${listing.id}, SearchID: ${listing.searchId})`);
        });
      } else {
        this.listings = [];
        console.log('❌ Storage not ready, using empty listings array');
      }
      this.filteredListings = [...this.listings];
      this.renderResults();
      this.updateDashboardMetrics();
    } catch (error) {
      console.error('Failed to load listings:', error);
      this.listings = [];
      this.filteredListings = [];
      this.renderResults();
      this.updateDashboardMetrics();
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

    // Group searches by status
    const activeSearches = this.searches.filter(s => s.enabled);
    const disabledSearches = this.searches.filter(s => !s.enabled);

    const renderSearchGroup = (searches, title) => {
      if (searches.length === 0) return '';
      
      const searchItems = searches.map(search => `
        <div class="search-item ${search.enabled ? 'enabled' : 'disabled'}" data-search-id="${search.id}">
          <div class="search-info">
            <div class="search-title">${this.escapeHtml(search.keywords)}</div>
            <div class="search-meta">
              ${this.formatPriceRange(search.minPrice, search.maxPrice) ? `<span>$${this.formatPriceRange(search.minPrice, search.maxPrice)}</span>` : ''}
              <span>${search.radius || 30}km radius</span>
              ${search.dateListed && search.dateListed !== 'all' ? `<span>${this.formatDateFilter(search.dateListed)}</span>` : ''}
              ${search.lastChecked ? `<span>Last: ${this.formatTimeAgo(search.lastChecked)}</span>` : ''}
            </div>
          </div>
          <div class="search-actions">
            <div class="search-status ${search.enabled ? 'enabled' : 'disabled'}">
              ${search.enabled ? 'Active' : 'Disabled'}
            </div>
            <button class="icon-btn run-search" title="Run Search" data-search-id="${search.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
            <button class="icon-btn edit-search" title="Edit Search" data-search-id="${search.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="icon-btn delete-search" title="Delete Search" data-search-id="${search.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('');

      return `
        <div class="search-group">
          <div class="search-group-header">
            <span>${title}</span>
            <span class="search-group-count">${searches.length}</span>
          </div>
          ${searchItems}
        </div>
      `;
    };

    const searchListHTML = `
      <div class="search-container animate-fade-in">
        ${renderSearchGroup(activeSearches, 'Active Searches')}
        ${renderSearchGroup(disabledSearches, 'Disabled Searches')}
      </div>
    `;

    this.elements.searchList.innerHTML = searchListHTML;
    this.attachSearchCardListeners();
  }

  renderResults() {
    if (!this.elements.resultsList) return;
    
    const displayListings = this.filteredListings || this.listings;
    
    if (displayListings.length === 0) {
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

    // Group listings by search
    const listingsBySearch = {};
    console.log(`🎯 Rendering ${displayListings.length} total listings (${this.listings.length} total, ${displayListings.length} filtered)`);
    
    displayListings.forEach(listing => {
      const searchId = listing.searchId || 'unknown';
      if (!listingsBySearch[searchId]) {
        listingsBySearch[searchId] = [];
      }
      listingsBySearch[searchId].push(listing);
    });
    
    console.log('📊 Listings grouped by search:', Object.entries(listingsBySearch).map(([id, listings]) => `${id}: ${listings.length}`));

    // Render grouped results
    const searchGroups = Object.entries(listingsBySearch).map(([searchId, listings]) => {
      const search = this.searches.find(s => s.id == searchId) || { keywords: 'Unknown Search', id: searchId };
      
      console.log(`🎨 Rendering group for search ${searchId} (${search.keywords}): ${listings.length} listings`);
      
      const listingCards = listings.map((listing, index) => {
        console.log(`  🏷️ Rendering listing ${index + 1}: ${listing.title} (ID: ${listing.id})`);
        console.log(`  📊 Listing data:`, {
          title: listing.title,
          price: listing.price, 
          description: listing.description,
          location: listing.location,
          image: listing.image
        });
        return `<div class="listing-card ${listing.seen ? 'seen' : ''} animate-scale-in" data-listing-id="${listing.id}">
          <div class="listing-image-container">
            ${listing.image ? `
              <img src="${listing.image}" alt="${this.escapeHtml(listing.title)}" class="listing-image" loading="lazy" onerror="this.style.display='none'">
            ` : `
              <div class="listing-image" style="display: flex; align-items: center; justify-content: center; background: var(--surface-tertiary); color: var(--text-tertiary);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            `}
            <div class="listing-image-overlay">
              <div class="listing-badge-group">
                ${listing.priceDropDetected ? '<span class="badge badge-price-drop">Price Drop!</span>' : 
                  !listing.seen ? '<span class="badge badge-new">New</span>' : 
                  '<span class="badge badge-seen">Seen</span>'}
              </div>
            </div>
          </div>
          <div class="listing-content">
            <div class="listing-header">
              <h4 class="listing-title">${this.escapeHtml(listing.title || 'Untitled Listing')}</h4>
              <div class="listing-price">${listing.price ? `$${this.escapeHtml(listing.price)}` : 'Price not available'}</div>
              ${listing.priceDropDetected && listing.originalPrice ? `
                <div class="listing-price-change">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 14l5-5 5 5z"/>
                  </svg>
                  Was $${listing.originalPrice}
                </div>
              ` : ''}
            </div>
            ${listing.description ? `
              <div class="listing-description">
                <p>${this.escapeHtml(listing.description)}</p>
              </div>
            ` : ''}
            <div class="listing-meta">
              <div class="listing-meta-item">
                <svg class="listing-meta-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                ${this.escapeHtml(listing.location || 'Location not available')}
              </div>
              <div class="listing-meta-item">
                <svg class="listing-meta-icon" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
                </svg>
                ${this.formatTimeAgo(listing.timestamp)}
              </div>
            </div>
          </div>
          <div class="listing-actions">
            ${listing.url ? `
              <a href="${listing.url}" target="_blank" class="btn btn-primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
                View Listing
              </a>
            ` : ''}
            <button class="btn btn-secondary mark-seen" data-listing-id="${listing.id}" ${listing.hidden ? 'disabled' : ''}>
              ${listing.hidden ? 'Hidden ✓' : 'Hide'}
            </button>
          </div>
        </div>`;
      }).join('');

      const groupHtml = `
        <div class="results-group animate-slide-up" data-search-id="${search.id}">
          <div class="results-group-header" data-toggle="collapse">
            <div class="results-group-header-left">
              <svg class="collapse-toggle" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.41 8.58L12 13.17l4.59-4.59L18 10l-6 6-6-6 1.41-1.42z"/>
              </svg>
              <h3 class="results-group-title">Results for "${this.escapeHtml(search.keywords)}" (${listings.length})</h3>
            </div>
            <div class="results-group-actions">
              <button class="btn btn-secondary btn-sm run-search-again" data-search-id="${search.id}" onclick="event.stopPropagation()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>
          <div class="results-grid">
            ${listingCards}
          </div>
        </div>
      `;
      
      console.log(`✅ Generated HTML for search ${searchId}: ${groupHtml.length} characters`);
      return groupHtml;
    }).join('');

    console.log(`🖼️ Final HTML for all groups: ${searchGroups.length} characters`);
    console.log(`📝 Setting innerHTML for resultsList...`);
    
    this.elements.resultsList.innerHTML = searchGroups;
    
    console.log(`🔍 After setting innerHTML, DOM contains ${document.querySelectorAll('.listing-card').length} listing cards`);
    
    this.attachListingListeners();
    this.attachSearchResultsListeners();
  }

  attachListingListeners() {
    document.querySelectorAll('.mark-seen').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.target.closest('.mark-seen');
        const listingId = button.dataset.listingId;
        
        if (!listingId) {
          console.error('No listing ID found on button');
          return;
        }
        
        try {
          // Disable button and show loading state
          button.disabled = true;
          button.textContent = 'Hiding...';
          
          if (this.storageReady) {
            await storage.markListingAsSeen(listingId);
            this.showToast('Listing hidden from results', 'success');
            
            // Check for price drops on hidden listings
            setTimeout(async () => {
              try {
                const unhiddenCount = await storage.checkForPriceDrops();
                if (unhiddenCount > 0) {
                  this.showToast(`${unhiddenCount} listing(s) unhidden due to price drops`, 'info');
                  await this.loadRecentListings();
                }
              } catch (error) {
                console.error('Failed to check price drops:', error);
              }
            }, 1000);
          } else {
            this.showToast('Storage not available', 'error');
          }
          
          await this.loadRecentListings();
        } catch (error) {
          console.error('Failed to mark listing as seen:', error);
          this.showToast('Failed to hide listing', 'error');
          
          // Reset button state on error
          button.disabled = false;
          button.textContent = 'Hide';
        }
      });
    });
  }

  attachSearchResultsListeners() {
    // Handle refresh button clicks
    document.querySelectorAll('.run-search-again').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const searchId = parseInt(e.target.closest('[data-search-id]').dataset.searchId);
        await this.runSingleSearch(searchId);
      });
    });

    // Handle collapse/expand functionality
    document.querySelectorAll('[data-toggle="collapse"]').forEach(header => {
      header.addEventListener('click', (e) => {
        const group = header.closest('.results-group');
        if (group) {
          group.classList.toggle('collapsed');
          
          console.log('Toggled collapse for group:', group.dataset.searchId, 'Collapsed:', group.classList.contains('collapsed'));
          
          // Store collapse state in localStorage
          const searchId = group.dataset.searchId;
          const isCollapsed = group.classList.contains('collapsed');
          const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');
          collapsedGroups[searchId] = isCollapsed;
          localStorage.setItem('collapsedGroups', JSON.stringify(collapsedGroups));
        }
      });
    });

    // Restore previously collapsed states
    const collapsedGroups = JSON.parse(localStorage.getItem('collapsedGroups') || '{}');
    Object.entries(collapsedGroups).forEach(([searchId, isCollapsed]) => {
      if (isCollapsed) {
        const group = document.querySelector(`.results-group[data-search-id="${searchId}"]`);
        if (group) {
          group.classList.add('collapsed');
        }
      }
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

  formatDateFilter(dateListed) {
    switch (dateListed) {
      case '24h': return 'Last 24h';
      case '7d': return 'Last 7 days';
      case '30d': return 'Last 30 days';
      default: return '';
    }
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
      dateListed: formData.get('dateListed') || 'all',
      location: 'Hillbank, South Australia', // Fixed location
      radius: 20, // Fixed 20km radius
      enabled: formData.get('enabled') === 'on'
    };

    if (!searchData.keywords) {
      this.showToast('Keywords are required', 'error');
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
      
      // Add searchId to search params for backend
      const searchWithId = { ...search, id: searchId };
      
      // Log the search parameters including date filter
      console.log(`🔍 Search parameters:`, {
        keywords: searchWithId.keywords,
        dateListed: searchWithId.dateListed,
        minPrice: searchWithId.minPrice,
        maxPrice: searchWithId.maxPrice
      });
      
      // Use the scraper to get listings
      const listings = await marketplaceScraper.scrapeMarketplace(searchWithId);
      
      if (listings.length > 0) {
        console.log(`🔍 Backend returned ${listings.length} listings for "${search.keywords}"`);
        
        // Ensure all listings have the correct searchId
        const listingsWithSearchId = listings.map(listing => ({
          ...listing,
          searchId: searchId
        }));
        
        if (this.storageReady) {
          // Get old listings to preserve seen/hidden status
          const oldListings = await storage.getListingsBySearch(searchId);
          console.log(`🔍 Found ${oldListings.length} existing listings for this search`);
          
          // Create maps for matching both by ID and by URL (to catch same listings with different IDs)
          const oldListingsMap = new Map();
          const oldListingsByUrl = new Map();
          oldListings.forEach(listing => {
            oldListingsMap.set(listing.id, listing);
            if (listing.url) {
              oldListingsByUrl.set(listing.url, listing);
            }
          });
          
          // Filter out new listings that match hidden items (prevent reappearing)
          const listingsToSave = listingsWithSearchId.filter(newListing => {
            const oldListingById = oldListingsMap.get(newListing.id);
            const oldListingByUrl = oldListingsByUrl.get(newListing.url);
            
            // If we find a match by URL and it was hidden, skip this new listing
            if (oldListingByUrl && oldListingByUrl.hidden) {
              console.log(`🚫 Filtering out hidden listing that reappeared: ${newListing.title}`);
              return false;
            }
            
            return true;
          }).map(newListing => {
            // Preserve status for exact ID matches
            const oldListing = oldListingsMap.get(newListing.id);
            if (oldListing) {
              // Preserve important status fields from old listing
              return {
                ...newListing,
                seen: oldListing.seen,
                seenAt: oldListing.seenAt,
                hidden: oldListing.hidden,
                hiddenAt: oldListing.hiddenAt,
                originalPrice: oldListing.originalPrice,
                priceDropDetected: oldListing.priceDropDetected,
                priceDropAt: oldListing.priceDropAt
              };
            }
            return newListing; // New listing, keep as is
          });
          
          // Delete old listings for this search
          console.log(`🗑️ Removing ${oldListings.length} old listings for search refresh`);
          for (const oldListing of oldListings) {
            await storage.deleteListing(oldListing.id);
          }
          
          // Save updated listings (preserving status for existing ones)
          console.log(`💾 Saving ${listingsToSave.length} listings (filtered out hidden reappearances)`);
          await storage.saveListings(listingsToSave);
        }
        await this.loadRecentListings();
        
        console.log(`📋 Total listings after loading: ${this.listings.length}`);
        
        this.showToast(`Found ${listings.length} listings for "${search.keywords}"`, 'success');
      } else {
        this.showToast('No listings found', 'info');
      }
    } catch (error) {
      console.error('Search failed:', error);
      this.showToast(`Search failed: ${error.message}`, 'error');
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

  async initializeAutomaticSearch() {
    try {
      // Load interval setting from storage
      const interval = await storage.getSetting('checkInterval', 30);
      this.automaticSearchInterval = parseInt(interval);
      
      console.log(`🔄 Initializing automatic search with ${this.automaticSearchInterval} minute interval`);
      
      // Start the automatic search timer if interval > 0
      if (this.automaticSearchInterval > 0) {
        this.startAutomaticSearch();
      } else {
        console.log('📴 Automatic searches disabled (interval = 0)');
      }
      
      // Set up settings change listener
      this.setupAutomaticSearchSettings();
    } catch (error) {
      console.error('Failed to initialize automatic search:', error);
    }
  }

  startAutomaticSearch() {
    // Clear existing timer if any
    this.stopAutomaticSearch();
    
    if (this.automaticSearchInterval <= 0) {
      console.log('📴 Automatic search disabled');
      return;
    }
    
    const intervalMs = this.automaticSearchInterval * 60 * 1000; // Convert to milliseconds
    console.log(`⏰ Starting automatic search timer: ${this.automaticSearchInterval} minutes (${intervalMs}ms)`);
    
    this.automaticSearchTimer = setInterval(async () => {
      if (this.isWithinActiveHours()) {
        console.log('🔍 Running automatic search...');
        try {
          await this.runAllSearches();
          console.log('✅ Automatic search completed');
        } catch (error) {
          console.error('❌ Automatic search failed:', error);
        }
      } else {
        console.log('😴 Skipping automatic search (outside active hours)');
      }
    }, intervalMs);
    
    this.showToast(`Automatic searches every ${this.automaticSearchInterval} minutes`, 'success');
    this.updateAutomaticSearchStatus();
  }

  stopAutomaticSearch() {
    if (this.automaticSearchTimer) {
      clearInterval(this.automaticSearchTimer);
      this.automaticSearchTimer = null;
      console.log('⏹️ Automatic search timer stopped');
    }
    this.updateAutomaticSearchStatus();
  }

  updateAutomaticSearchStatus() {
    const statusElement = document.getElementById('automaticSearchInterval');
    if (statusElement) {
      if (this.automaticSearchInterval <= 0) {
        statusElement.textContent = 'Manual';
        statusElement.parentElement.parentElement.style.opacity = '0.6';
      } else {
        statusElement.textContent = `${this.automaticSearchInterval}min`;
        statusElement.parentElement.parentElement.style.opacity = '1';
      }
    }
  }

  async isWithinActiveHours() {
    try {
      const startTime = await storage.getSetting('startTime', '08:00');
      const endTime = await storage.getSetting('endTime', '22:00');
      
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      const startTimeMin = startHour * 60 + startMin;
      const endTimeMin = endHour * 60 + endMin;
      
      return currentTime >= startTimeMin && currentTime <= endTimeMin;
    } catch (error) {
      console.error('Error checking active hours:', error);
      return true; // Default to allow searches if check fails
    }
  }

  setupAutomaticSearchSettings() {
    // Function to setup interval listener
    const setupIntervalListener = () => {
      const checkIntervalElement = document.getElementById('checkInterval');
      if (checkIntervalElement) {
        console.log('✅ Found checkInterval element, setting up listener');
        
        checkIntervalElement.addEventListener('change', async (e) => {
          const newInterval = parseInt(e.target.value);
          await storage.setSetting('checkInterval', newInterval);
          this.automaticSearchInterval = newInterval;
          
          console.log(`🔄 Interval changed to ${newInterval} minutes`);
          
          // Restart automatic search with new interval
          if (newInterval > 0) {
            this.startAutomaticSearch();
            this.showToast(`Automatic searches now every ${newInterval} minutes`, 'info');
          } else {
            this.stopAutomaticSearch();
            this.showToast('Automatic searches disabled', 'info');
          }
          this.updateAutomaticSearchStatus();
        });
        
        // Load current setting
        storage.getSetting('checkInterval', 30).then(interval => {
          checkIntervalElement.value = interval;
          console.log(`📝 Loaded checkInterval setting: ${interval}`);
        });
        
        return true;
      } else {
        console.warn('❌ checkInterval element not found');
        return false;
      }
    };
    
    // Try to setup immediately
    if (!setupIntervalListener()) {
      // If element not found, try again when settings modal is opened
      const settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
          setTimeout(setupIntervalListener, 100); // Small delay to ensure modal is rendered
        });
      }
    }
    
    // Setup active hours listeners (using same approach as interval)
    const setupTimeListeners = () => {
      const startTimeElement = document.getElementById('startTime');
      const endTimeElement = document.getElementById('endTime');
      
      if (startTimeElement) {
        startTimeElement.addEventListener('change', async (e) => {
          await storage.setSetting('startTime', e.target.value);
          this.showToast('Active hours updated', 'info');
        });
        
        storage.getSetting('startTime', '08:00').then(time => {
          startTimeElement.value = time;
        });
      }
      
      if (endTimeElement) {
        endTimeElement.addEventListener('change', async (e) => {
          await storage.setSetting('endTime', e.target.value);
          this.showToast('Active hours updated', 'info');
        });
        
        storage.getSetting('endTime', '22:00').then(time => {
          endTimeElement.value = time;
        });
      }
    };
    
    // Setup time listeners
    setupTimeListeners();
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
    console.log('🔄 Setting up PWA install prompt listener...');
    
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('✅ beforeinstallprompt event fired - PWA is installable!');
      e.preventDefault();
      this.deferredPrompt = e;
      
      // Delay showing prompt to let app load fully
      setTimeout(() => {
        this.showInstallPrompt();
      }, 2000);
    });
    
    // Also listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA was installed successfully!');
      this.deferredPrompt = null;
    });
    
    // Add manual install button to settings
    this.addManualInstallButton();
  }

  showInstallPrompt() {
    console.log('📱 Showing PWA install prompt...');
    
    // Remove any existing prompt
    const existingPrompt = document.querySelector('.install-prompt');
    if (existingPrompt) {
      existingPrompt.remove();
    }
    
    const installPrompt = document.createElement('div');
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
      <div class="install-prompt-content">
        <div class="install-prompt-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M5 20h14v-2H5v2zm7-18L5.5 8.5l1.41 1.41L11 5.83V17h2V5.83l4.09 4.08L18.5 8.5 12 2z"/>
          </svg>
        </div>
        <div class="install-prompt-text">
          <div class="install-prompt-title">Install Marketplace Monitor</div>
          <div class="install-prompt-subtitle">Get faster access and automatic background monitoring</div>
        </div>
        <div class="install-prompt-actions">
          <button class="install-prompt-btn install-prompt-btn--secondary" id="dismissInstall">Not now</button>
          <button class="install-prompt-btn install-prompt-btn--primary" id="installApp">Install</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(installPrompt);
    
    // Add event listeners with unique IDs
    const installBtn = installPrompt.querySelector('#installApp');
    const dismissBtn = installPrompt.querySelector('#dismissInstall');
    
    installBtn.addEventListener('click', async () => {
      console.log('🚀 User clicked Install button');
      if (this.deferredPrompt) {
        try {
          this.deferredPrompt.prompt();
          const result = await this.deferredPrompt.userChoice;
          console.log('📊 Install choice result:', result.outcome);
          
          if (result.outcome === 'accepted') {
            console.log('✅ User accepted PWA installation');
            this.showToast('App installing...', 'success');
          } else {
            console.log('❌ User dismissed PWA installation');
          }
          this.deferredPrompt = null;
        } catch (error) {
          console.error('❌ Error during PWA install:', error);
        }
      }
      installPrompt.remove();
    });
    
    dismissBtn.addEventListener('click', () => {
      console.log('⏭️ User dismissed install prompt');
      installPrompt.remove();
    });
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (document.body.contains(installPrompt)) {
        console.log('⏰ Auto-dismissing install prompt after 30s');
        installPrompt.remove();
      }
    }, 30000);
  }

  addManualInstallButton() {
    // Add install button to settings modal for browsers that don't show the prompt
    const setupManualInstall = () => {
      const settingsModal = document.getElementById('settingsModal');
      if (settingsModal && !settingsModal.querySelector('.manual-install-section')) {
        const installSection = document.createElement('div');
        installSection.className = 'manual-install-section';
        installSection.innerHTML = `
          <div class="form-group">
            <label class="form-label">App Installation</label>
            <button type="button" id="manualInstallBtn" class="btn btn-primary">
              📱 Install App on Device
            </button>
            <p class="form-help">Install for faster access and offline functionality</p>
          </div>
        `;
        
        // Add to settings modal
        const alertSettings = settingsModal.querySelector('.alert-settings');
        if (alertSettings) {
          alertSettings.parentNode.insertBefore(installSection, alertSettings);
          
          // Add click handler
          const manualBtn = installSection.querySelector('#manualInstallBtn');
          manualBtn.addEventListener('click', () => {
            if (this.deferredPrompt) {
              this.showInstallPrompt();
            } else {
              this.showToast('App installation not available in this browser', 'warning');
              console.log('⚠️ No deferred prompt available for manual install');
            }
          });
        }
      }
    };
    
    // Try to add immediately, or wait for modal to be ready
    setTimeout(setupManualInstall, 1000);
  }

  updateDashboardMetrics() {
    const activeSearches = this.searches.filter(s => s.enabled).length;
    const recentMatches = this.listings.length;
    const priceDrops = this.listings.filter(l => l.priceHistory && l.priceHistory.length > 1).length;
    const successRate = this.searches.length > 0 ? Math.round((activeSearches / this.searches.length) * 100) : 0;

    if (this.elements.activeSearchesCount) {
      this.elements.activeSearchesCount.textContent = activeSearches;
    }
    if (this.elements.recentMatchesCount) {
      this.elements.recentMatchesCount.textContent = recentMatches;
    }
    if (this.elements.successRate) {
      this.elements.successRate.textContent = `${successRate}%`;
    }
    if (this.elements.priceDropsCount) {
      this.elements.priceDropsCount.textContent = priceDrops;
    }
  }

  applyFilters() {
    console.log('🔍 Applying filters:', this.filters);
    this.filteredListings = this.listings.filter(listing => {
      // Price range filter - convert price to number for comparison
      const price = parseFloat(listing.price) || 0;
      if (this.filters.minPrice !== null && price < this.filters.minPrice) {
        console.log(`❌ Price filter: ${price} < ${this.filters.minPrice}`);
        return false;
      }
      if (this.filters.maxPrice !== null && price > this.filters.maxPrice) {
        console.log(`❌ Price filter: ${price} > ${this.filters.maxPrice}`);
        return false;
      }
      
      // Category filter with smart detection
      if (this.filters.categories.length > 0) {
        const detectedCategory = this.detectCategory(listing);
        const matchesCategory = this.filters.categories.includes(detectedCategory);
        if (!matchesCategory) {
          console.log(`❌ Category filter: detected="${detectedCategory}", required=${this.filters.categories}`);
          return false;
        }
      }
      
      // Status filter
      if (this.filters.status.length > 0) {
        const isNew = !listing.seen && !listing.hidden;
        const isPriceDrop = this.detectPriceDrop(listing);
        const isSeen = listing.seen || listing.hidden; // Include both seen and hidden items
        
        const matchesStatus = (
          (this.filters.status.includes('new') && isNew) ||
          (this.filters.status.includes('price-drop') && isPriceDrop) ||
          (this.filters.status.includes('seen') && isSeen)
        );
        
        if (!matchesStatus) {
          console.log(`❌ Status filter: new=${isNew}, priceDrop=${isPriceDrop}, seen=${isSeen}, required=${this.filters.status}`);
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`✅ Filtered ${this.filteredListings.length} of ${this.listings.length} listings`);
    
    // Re-render filtered results
    this.renderResults();
  }

  detectCategory(listing) {
    const title = (listing.title || '').toLowerCase();
    const description = (listing.description || '').toLowerCase();
    const text = title + ' ' + description;
    
    // Electronics keywords
    const electronicsKeywords = [
      'iphone', 'phone', 'laptop', 'computer', 'ipad', 'tablet', 'tv', 'television',
      'xbox', 'playstation', 'gaming', 'headphones', 'speaker', 'camera', 'drone',
      'macbook', 'imac', 'android', 'samsung', 'apple', 'dell', 'hp', 'sony',
      'nintendo', 'keyboard', 'mouse', 'monitor', 'printer', 'router', 'electronics'
    ];
    
    // Furniture keywords
    const furnitureKeywords = [
      'chair', 'table', 'desk', 'bed', 'mattress', 'sofa', 'couch', 'dresser',
      'bookshelf', 'cabinet', 'wardrobe', 'nightstand', 'dining', 'furniture',
      'ottoman', 'bench', 'stool', 'shelving', 'storage', 'drawer'
    ];
    
    // Vehicle keywords
    const vehicleKeywords = [
      'car', 'truck', 'motorcycle', 'bike', 'van', 'suv', 'sedan', 'hatchback',
      'toyota', 'honda', 'ford', 'bmw', 'mercedes', 'audi', 'nissan', 'mazda',
      'vehicle', 'auto', 'wheels', 'tires', 'engine', 'parts'
    ];
    
    // Clothing keywords
    const clothingKeywords = [
      'shirt', 'pants', 'dress', 'shoes', 'jacket', 'coat', 'jeans', 'shorts',
      'skirt', 'blouse', 'sweater', 'hoodie', 'sneakers', 'boots', 'sandals',
      'clothing', 'apparel', 'fashion', 'brand', 'size', 'outfit'
    ];
    
    // Check each category
    if (electronicsKeywords.some(keyword => text.includes(keyword))) {
      return 'electronics';
    }
    if (furnitureKeywords.some(keyword => text.includes(keyword))) {
      return 'furniture';
    }
    if (vehicleKeywords.some(keyword => text.includes(keyword))) {
      return 'vehicles';
    }
    if (clothingKeywords.some(keyword => text.includes(keyword))) {
      return 'clothing';
    }
    
    // Default category if no match
    return 'other';
  }

  detectPriceDrop(listing) {
    // Check for explicit price drop detection
    if (listing.priceDropDetected) {
      return true;
    }
    
    // Check price history array
    if (listing.priceHistory && listing.priceHistory.length > 1) {
      const latestPrice = parseFloat(listing.priceHistory[listing.priceHistory.length - 1]) || 0;
      const previousPrice = parseFloat(listing.priceHistory[listing.priceHistory.length - 2]) || 0;
      return latestPrice < previousPrice;
    }
    
    // Check originalPrice vs current price
    if (listing.originalPrice && listing.price) {
      const currentPrice = parseFloat(listing.price) || 0;
      const originalPrice = parseFloat(listing.originalPrice) || 0;
      return currentPrice < originalPrice;
    }
    
    // Check if it was previously hidden but now shown (indicating price drop unhiding)
    if (listing.priceDropAt && !listing.hidden) {
      return true;
    }
    
    return false;
  }

  setupFormValidation() {
    const keywordsInput = document.getElementById('keywords');
    const minPriceInput = document.getElementById('minPrice');
    const maxPriceInput = document.getElementById('maxPrice');
    const keywordsSuggestions = document.getElementById('keywordsSuggestions');
    const validationSummary = document.getElementById('validationSummary');
    
    if (!keywordsInput) return;
    
    // Show validation summary when modal opens
    document.getElementById('addSearchBtn')?.addEventListener('click', () => {
      if (validationSummary) {
        validationSummary.style.display = 'block';
      }
    });
    
    // Keywords validation and suggestions
    keywordsInput.addEventListener('input', (e) => {
      this.validateKeywords(e.target.value);
      this.showKeywordSuggestions(e.target.value);
    });
    
    keywordsInput.addEventListener('focus', () => {
      if (keywordsInput.value.length > 0) {
        this.showKeywordSuggestions(keywordsInput.value);
      }
    });
    
    keywordsInput.addEventListener('blur', () => {
      // Delay hiding suggestions to allow clicking
      setTimeout(() => {
        if (keywordsSuggestions) {
          keywordsSuggestions.style.display = 'none';
        }
      }, 200);
    });
    
    // Suggestion clicks (set up when modal opens)
    this.setupSuggestionListeners = () => {
      document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const suggestion = e.currentTarget.dataset.suggestion;
          if (suggestion && keywordsInput) {
            const currentValue = keywordsInput.value;
            const keywords = currentValue ? currentValue + ', ' + suggestion : suggestion;
            keywordsInput.value = keywords;
            this.validateKeywords(keywords);
            if (keywordsSuggestions) {
              keywordsSuggestions.style.display = 'none';
            }
          }
        });
      });
    };
    
    // Price range validation
    [minPriceInput, maxPriceInput].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.validatePriceRange();
          this.updatePriceRangePreview();
        });
      }
    });
    
    // Form submission validation
    document.getElementById('searchForm')?.addEventListener('submit', (e) => {
      if (!this.validateForm()) {
        e.preventDefault();
        this.showFormErrors();
      }
    });
  }
  
  validateKeywords(value) {
    const keywordsError = document.getElementById('keywordsError');
    const keywordsSuccess = document.getElementById('keywordsSuccess');
    const keywordsValidation = document.getElementById('keywordsValidation');
    
    if (!value || value.trim().length === 0) {
      this.showValidationState('keywords', 'pending', 'Enter search keywords');
      return false;
    }
    
    if (value.trim().length < 2) {
      this.showValidationState('keywords', 'error', 'Keywords must be at least 2 characters');
      if (keywordsError) {
        keywordsError.style.display = 'flex';
        keywordsError.querySelector('span').textContent = 'Keywords must be at least 2 characters';
      }
      return false;
    }
    
    if (value.length > 200) {
      this.showValidationState('keywords', 'error', 'Keywords too long (max 200 characters)');
      if (keywordsError) {
        keywordsError.style.display = 'flex';
        keywordsError.querySelector('span').textContent = 'Keywords too long (max 200 characters)';
      }
      return false;
    }
    
    const keywords = value.split(',').map(k => k.trim()).filter(k => k.length > 0);
    if (keywords.length === 0) {
      this.showValidationState('keywords', 'error', 'Please enter valid keywords');
      return false;
    }
    
    // Success state
    this.showValidationState('keywords', 'valid', `${keywords.length} keyword${keywords.length > 1 ? 's' : ''} ready`);
    if (keywordsError) keywordsError.style.display = 'none';
    if (keywordsSuccess) {
      keywordsSuccess.style.display = 'flex';
      keywordsSuccess.querySelector('span').textContent = `${keywords.length} keyword${keywords.length > 1 ? 's' : ''} configured`;
    }
    return true;
  }
  
  validatePriceRange() {
    const minPrice = parseFloat(document.getElementById('minPrice')?.value || 0);
    const maxPrice = parseFloat(document.getElementById('maxPrice')?.value || 0);
    const priceError = document.getElementById('priceError');
    
    if (minPrice < 0 || maxPrice < 0) {
      this.showValidationState('price', 'error', 'Prices cannot be negative');
      if (priceError) {
        priceError.style.display = 'flex';
        priceError.querySelector('span').textContent = 'Prices cannot be negative';
      }
      return false;
    }
    
    if (minPrice > 0 && maxPrice > 0 && minPrice >= maxPrice) {
      this.showValidationState('price', 'error', 'Maximum price must be higher than minimum');
      if (priceError) {
        priceError.style.display = 'flex';
        priceError.querySelector('span').textContent = 'Maximum price must be higher than minimum';
      }
      return false;
    }
    
    // Success state
    if (minPrice > 0 || maxPrice > 0) {
      this.showValidationState('price', 'valid', 'Price range configured');
    } else {
      this.showValidationState('price', 'valid', 'No price limit (searching all prices)');
    }
    
    if (priceError) priceError.style.display = 'none';
    return true;
  }
  
  showValidationState(field, state, message) {
    const validationItem = document.getElementById(`${field}Validation`);
    if (!validationItem) return;
    
    const icon = validationItem.querySelector('.validation-icon');
    const text = validationItem.querySelector('span');
    
    // Reset classes
    icon.classList.remove('validation-valid', 'validation-invalid', 'validation-pending');
    
    switch (state) {
      case 'valid':
        icon.classList.add('validation-valid');
        icon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
        break;
      case 'error':
        icon.classList.add('validation-invalid');
        icon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>';
        break;
      case 'pending':
      default:
        icon.classList.add('validation-pending');
        icon.innerHTML = '<circle cx="12" cy="12" r="10" opacity="0.3"/>';
        break;
    }
    
    if (text) text.textContent = message;
  }
  
  showKeywordSuggestions(value) {
    const keywordsSuggestions = document.getElementById('keywordsSuggestions');
    if (!keywordsSuggestions || !value || value.length < 2) {
      if (keywordsSuggestions) keywordsSuggestions.style.display = 'none';
      return;
    }
    
    const lastKeyword = value.split(',').pop().trim().toLowerCase();
    if (lastKeyword.length < 2) {
      keywordsSuggestions.style.display = 'none';
      return;
    }
    
    // Show suggestions that match the current input
    const suggestions = keywordsSuggestions.querySelectorAll('.suggestion-item');
    let hasVisibleSuggestions = false;
    
    suggestions.forEach(suggestion => {
      const text = suggestion.dataset.suggestion.toLowerCase();
      if (text.includes(lastKeyword) && !value.toLowerCase().includes(text)) {
        suggestion.style.display = 'flex';
        hasVisibleSuggestions = true;
      } else {
        suggestion.style.display = 'none';
      }
    });
    
    keywordsSuggestions.style.display = hasVisibleSuggestions ? 'block' : 'none';
  }
  
  updatePriceRangePreview() {
    const minPrice = document.getElementById('minPrice')?.value;
    const maxPrice = document.getElementById('maxPrice')?.value;
    const preview = document.getElementById('priceRangePreview');
    const previewText = document.getElementById('priceRangeText');
    
    if (!preview || !previewText) return;
    
    if (!minPrice && !maxPrice) {
      preview.style.display = 'none';
      return;
    }
    
    let text = 'Searching for items ';
    if (minPrice && maxPrice) {
      text += `between $${minPrice} and $${maxPrice}`;
    } else if (minPrice) {
      text += `$${minPrice} and above`;
    } else if (maxPrice) {
      text += `up to $${maxPrice}`;
    }
    
    previewText.textContent = text;
    preview.style.display = 'flex';
  }
  
  validateForm() {
    const keywordsValid = this.validateKeywords(document.getElementById('keywords')?.value || '');
    const priceValid = this.validatePriceRange();
    return keywordsValid && priceValid;
  }
  
  showFormErrors() {
    this.showToast('Please fix the form errors before saving', 'error');
  }

  setupEnhancedAlerts() {
    // Test notifications button
    if (this.elements.testNotifications) {
      this.elements.testNotifications.addEventListener('click', async () => {
        try {
          await notificationManager.sendTestNotification();
          this.showToast('Test notification sent!', 'success');
        } catch (error) {
          this.showToast('Failed to send test notification', 'error');
        }
      });
    }
    
    // Volume control
    if (this.elements.alertVolume && this.elements.volumeDisplay) {
      this.elements.alertVolume.addEventListener('input', async (e) => {
        const volume = parseFloat(e.target.value);
        const percentage = Math.round(volume * 100);
        this.elements.volumeDisplay.textContent = `${percentage}%`;
        await storage.setSetting('alertVolume', volume);
      });
    }
    
    // Email alerts toggle
    if (this.elements.enableEmailAlerts && this.elements.emailSettings) {
      this.elements.enableEmailAlerts.addEventListener('change', (e) => {
        this.elements.emailSettings.style.display = e.target.checked ? 'grid' : 'none';
      });
    }
    
    // Test email button
    if (this.elements.testEmail) {
      this.elements.testEmail.addEventListener('click', async () => {
        const emailAddress = this.elements.emailAddress?.value;
        if (!emailAddress) {
          this.showToast('Please enter an email address first', 'warning');
          return;
        }
        
        try {
          // Create enhanced test notification
          notificationManager.createInAppNotification(
            'Test Email Queued',
            `Test email will be sent to ${emailAddress}`,
            'success',
            {
              icon: '<path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>',
              metadata: 'Email alerts are now configured',
              actions: [
                {
                  id: 'view-settings',
                  label: 'View Settings',
                  style: 'primary',
                  handler: () => console.log('View email settings')
                }
              ]
            }
          );
        } catch (error) {
          this.showToast('Failed to queue test email', 'error');
        }
      });
    }
    
    // Alert condition updates
    [this.elements.maxDailyAlerts, this.elements.priceDropThreshold].forEach(element => {
      if (element) {
        element.addEventListener('change', async () => {
          await this.updateAlertConditions();
        });
      }
    });
    
    // Load current settings
    this.loadAlertSettings();
  }
  
  async updateAlertConditions() {
    try {
      const conditions = {
        maxDailyAlerts: parseInt(this.elements.maxDailyAlerts?.value || 50),
        priceDropThreshold: parseFloat(this.elements.priceDropThreshold?.value || 10)
      };
      
      await notificationManager.updateAlertConditions(conditions);
      this.showToast('Alert settings updated', 'success');
    } catch (error) {
      console.error('Failed to update alert conditions:', error);
      this.showToast('Failed to update alert settings', 'error');
    }
  }
  
  async loadAlertSettings() {
    try {
      // Load volume setting
      const volume = await storage.getSetting('alertVolume', 0.7);
      if (this.elements.alertVolume) {
        this.elements.alertVolume.value = volume;
      }
      if (this.elements.volumeDisplay) {
        this.elements.volumeDisplay.textContent = `${Math.round(volume * 100)}%`;
      }
      
      // Load email settings
      const emailSettings = await storage.getSetting('emailAlertSettings', {});
      if (this.elements.emailAddress && emailSettings.address) {
        this.elements.emailAddress.value = emailSettings.address;
      }
      
      if (this.elements.enableEmailAlerts) {
        this.elements.enableEmailAlerts.checked = emailSettings.enabled || false;
        if (this.elements.emailSettings) {
          this.elements.emailSettings.style.display = emailSettings.enabled ? 'grid' : 'none';
        }
      }
      
      // Load alert conditions
      const conditions = await storage.getSetting('alertConditions', {});
      if (this.elements.maxDailyAlerts && conditions.maxDailyAlerts) {
        this.elements.maxDailyAlerts.value = conditions.maxDailyAlerts;
      }
      if (this.elements.priceDropThreshold && conditions.priceDropThreshold) {
        this.elements.priceDropThreshold.value = conditions.priceDropThreshold;
      }
      
    } catch (error) {
      console.warn('Failed to load alert settings:', error);
    }
  }

  setupFilterListeners() {
    // Price range filters
    if (this.elements.filterMinPrice) {
      this.elements.filterMinPrice.addEventListener('input', (e) => {
        this.filters.minPrice = e.target.value ? parseFloat(e.target.value) : null;
        this.applyFilters();
      });
    }
    
    if (this.elements.filterMaxPrice) {
      this.elements.filterMaxPrice.addEventListener('input', (e) => {
        this.filters.maxPrice = e.target.value ? parseFloat(e.target.value) : null;
        this.applyFilters();
      });
    }
    
    // Clear filters button
    if (this.elements.clearFilters) {
      this.elements.clearFilters.addEventListener('click', () => {
        this.filters = {
          minPrice: null,
          maxPrice: null,
          categories: [],
          status: ['new', 'price-drop']
        };
        
        // Reset form fields
        if (this.elements.filterMinPrice) this.elements.filterMinPrice.value = '';
        if (this.elements.filterMaxPrice) this.elements.filterMaxPrice.value = '';
        
        // Reset checkboxes
        document.querySelectorAll('.category-filter').forEach(cb => cb.checked = false);
        document.querySelectorAll('.status-filter').forEach(cb => {
          cb.checked = cb.value === 'new' || cb.value === 'price-drop';
        });
        
        this.applyFilters();
      });
    }
    
    // Save current filter button
    if (this.elements.saveCurrentFilter) {
      this.elements.saveCurrentFilter.addEventListener('click', () => {
        this.showSaveFilterDialog();
      });
    }
    
    // Category and status filters (set up immediately since they're in the sidebar)
    this.setupCategoryStatusFilters = () => {
      // Category filters
      document.querySelectorAll('.category-filter').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            this.filters.categories.push(e.target.value);
          } else {
            this.filters.categories = this.filters.categories.filter(cat => cat !== e.target.value);
          }
          this.applyFilters();
        });
      });
      
      // Status filters
      document.querySelectorAll('.status-filter').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          if (e.target.checked) {
            if (!this.filters.status.includes(e.target.value)) {
              this.filters.status.push(e.target.value);
            }
          } else {
            this.filters.status = this.filters.status.filter(status => status !== e.target.value);
          }
          this.applyFilters();
        });
      });
    };
    
    // Set up category and status filters since they're in the sidebar
    this.setupCategoryStatusFilters();
    
    // Price preset buttons (set up when filters are rendered)
    this.setupPresetListeners = () => {
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const range = e.target.dataset.range;
          if (range) {
            const [min, max] = range.split('-').map(v => parseInt(v));
            this.filters.minPrice = min;
            this.filters.maxPrice = max === 99999 ? null : max;
            
            if (this.elements.filterMinPrice) this.elements.filterMinPrice.value = min;
            if (this.elements.filterMaxPrice) this.elements.filterMaxPrice.value = max === 99999 ? '' : max;
            
            // Update button states
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            this.applyFilters();
          }
        });
      });
    };
    
    // Set up preset listeners immediately since they're in the sidebar
    this.setupPresetListeners();
  }
  
  // Save filter functionality
  showSaveFilterDialog() {
    const filterName = prompt('Enter a name for this filter:', this.generateFilterName());
    if (filterName && filterName.trim()) {
      this.saveFilter(filterName.trim());
    }
  }
  
  generateFilterName() {
    const parts = [];
    if (this.filters.minPrice !== null || this.filters.maxPrice !== null) {
      if (this.filters.minPrice !== null && this.filters.maxPrice !== null) {
        parts.push(`$${this.filters.minPrice}-${this.filters.maxPrice}`);
      } else if (this.filters.minPrice !== null) {
        parts.push(`Over $${this.filters.minPrice}`);
      } else {
        parts.push(`Under $${this.filters.maxPrice}`);
      }
    }
    if (this.filters.categories.length > 0) {
      parts.push(this.filters.categories.join(', '));
    }
    if (this.filters.status.length > 0 && this.filters.status.length < 3) {
      parts.push(this.filters.status.map(s => s.replace('-', ' ')).join(', '));
    }
    return parts.length > 0 ? parts.join(' | ') : 'Custom Filter';
  }
  
  async saveFilter(name) {
    try {
      const filter = {
        name: name,
        filters: { ...this.filters },
        createdAt: Date.now()
      };
      
      if (this.storageReady) {
        await storage.saveFilter(filter);
      }
      
      this.renderSavedFilters();
      this.showToast(`Filter "${name}" saved!`, 'success');
    } catch (error) {
      console.error('Failed to save filter:', error);
      this.showToast('Failed to save filter', 'error');
    }
  }
  
  async loadSavedFilters() {
    try {
      if (this.storageReady) {
        this.savedFilters = await storage.getSavedFilters();
        this.renderSavedFilters();
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
      this.savedFilters = [];
    }
  }
  
  renderSavedFilters() {
    if (!this.elements.savedFiltersContainer) return;
    
    const savedFilterButtons = (this.savedFilters || []).map(filter => 
      `<button class="saved-filter-btn" data-filter-id="${filter.id}">${this.escapeHtml(filter.name)}</button>`
    ).join('');
    
    this.elements.savedFiltersContainer.innerHTML = 
      savedFilterButtons + 
      '<button class="btn btn-ghost btn-sm" id="saveCurrentFilter">+ Save Current</button>';
    
    // Re-attach event listeners
    if (this.elements.saveCurrentFilter) {
      document.getElementById('saveCurrentFilter').addEventListener('click', () => {
        this.showSaveFilterDialog();
      });
    }
    
    // Add event listeners for saved filter buttons
    document.querySelectorAll('.saved-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const filterId = e.target.dataset.filterId;
        this.applySavedFilter(filterId);
      });
    });
  }
  
  async applySavedFilter(filterId) {
    const filter = this.savedFilters.find(f => f.id == filterId);
    if (filter) {
      this.filters = { ...filter.filters };
      this.updateFilterUI();
      this.applyFilters();
      this.showToast(`Applied filter "${filter.name}"`, 'success');
    }
  }
  
  updateFilterUI() {
    // Update price inputs
    if (this.elements.filterMinPrice) {
      this.elements.filterMinPrice.value = this.filters.minPrice || '';
    }
    if (this.elements.filterMaxPrice) {
      this.elements.filterMaxPrice.value = this.filters.maxPrice || '';
    }
    
    // Update category checkboxes
    document.querySelectorAll('.category-filter').forEach(cb => {
      cb.checked = this.filters.categories.includes(cb.value);
    });
    
    // Update status checkboxes
    document.querySelectorAll('.status-filter').forEach(cb => {
      cb.checked = this.filters.status.includes(cb.value);
    });
  }
}

// App instance will be created below after DOM is ready

// Debug function to check database contents
window.debugDatabase = async function() {
  console.log('=== DATABASE DEBUG ===');
  if (window.app.storageReady) {
    const allListings = await storage.db.listings.toArray();
    const allSearches = await storage.db.searches.toArray();
    
    console.log(`📊 Total searches: ${allSearches.length}`);
    allSearches.forEach(search => {
      console.log(`  Search ${search.id}: "${search.keywords}"`);
    });
    
    console.log(`📊 Total listings: ${allListings.length}`);
    allListings.forEach(listing => {
      console.log(`  Listing: ${listing.title} (ID: ${listing.id}, SearchID: ${listing.searchId})`);
    });
    
    // Group by search
    const groups = {};
    allListings.forEach(listing => {
      const searchId = listing.searchId || 'unknown';
      if (!groups[searchId]) groups[searchId] = [];
      groups[searchId].push(listing);
    });
    
    console.log('📊 Grouped by search:');
    Object.entries(groups).forEach(([searchId, listings]) => {
      console.log(`  Search ${searchId}: ${listings.length} listings`);
    });
  } else {
    console.log('❌ Storage not ready');
  }
  console.log('=== END DEBUG ===');
};

// Reset database function
window.resetDatabase = async function() {
  console.log('🔄 Resetting database...');
  try {
    await storage.db.delete();
    console.log('✅ Database deleted');
    
    // Reinitialize
    await storage.init();
    console.log('✅ Database recreated');
    
    // Reload app data
    await window.app.loadSearches();
    await window.app.loadRecentListings();
    console.log('✅ App data reloaded');
    
    console.log('🎉 Database reset complete! You can now create searches.');
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
  }
};

// Create app instance
window.app = new MarketplaceMonitorApp();

document.addEventListener('DOMContentLoaded', () => {
  window.app.init().catch(error => {
    console.error('Failed to start app:', error);
  });
});
