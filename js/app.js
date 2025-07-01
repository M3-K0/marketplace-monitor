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
    this.notificationManager = null;
    this.bulkMode = false;
    this.selectedListings = new Set();
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

      // Initialize notification manager
      try {
        this.notificationManager = new NotificationManager();
        await this.notificationManager.init();
        console.log('Notification manager initialized successfully');
      } catch (error) {
        console.warn('Notification manager initialization failed:', error);
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
      // Save item modal elements
      saveItemModal: document.getElementById('saveItemModal'),
      closeSaveItemModal: document.getElementById('closeSaveItemModal'),
      cancelSaveItem: document.getElementById('cancelSaveItem'),
      saveItemForm: document.getElementById('saveItemForm'),
      saveItemPreview: document.getElementById('saveItemPreview'),
      itemNotes: document.getElementById('itemNotes'),
      itemTags: document.getElementById('itemTags'),
      itemPriority: document.getElementById('itemPriority'),
      followUpDate: document.getElementById('followUpDate'),
      // Quick preview overlay elements
      quickPreviewOverlay: document.getElementById('quickPreviewOverlay'),
      closeQuickPreview: document.getElementById('closeQuickPreview'),
      quickPreviewContent: document.getElementById('quickPreviewContent'),
      previewSaveItem: document.getElementById('previewSaveItem'),
      // Search status elements
      searchStatusContainer: document.getElementById('searchStatus'),
      searchStatusText: document.getElementById('searchStatusMessage'),
      resultsTimestamp: document.getElementById('resultsTimestamp'),
      previewMarkSeen: document.getElementById('previewMarkSeen'),
      previewViewListing: document.getElementById('previewViewListing'),
      // Filter toggle elements
      toggleFilters: document.getElementById('toggleFilters'),
      // Bulk operations elements
      bulkModeToggle: document.getElementById('bulkModeToggle'),
      selectAllCheckbox: document.getElementById('selectAllCheckbox'),
      bulkActionsBar: document.getElementById('bulkActionsBar'),
      selectedCount: document.getElementById('selectedCount'),
      bulkMarkSeen: document.getElementById('bulkMarkSeen'),
      bulkSave: document.getElementById('bulkSave'),
      bulkDelete: document.getElementById('bulkDelete'),
      filtersPanel: document.getElementById('filtersPanel'),
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
      
      if (this.elements.closeSaveItemModal) {
        this.elements.closeSaveItemModal.addEventListener('click', () => this.closeSaveItemModal());
      }
      
      if (this.elements.cancelSaveItem) {
        this.elements.cancelSaveItem.addEventListener('click', () => this.closeSaveItemModal());
      }
      
      if (this.elements.saveItemForm) {
        this.elements.saveItemForm.addEventListener('submit', (e) => this.handleSaveItemSubmit(e));
      }
      
      // Quick preview overlay events
      if (this.elements.closeQuickPreview) {
        this.elements.closeQuickPreview.addEventListener('click', () => this.closeQuickPreview());
      }
      
      if (this.elements.quickPreviewOverlay) {
        this.elements.quickPreviewOverlay.addEventListener('click', (e) => {
          if (e.target === this.elements.quickPreviewOverlay) {
            this.closeQuickPreview();
          }
        });
      }
      
      if (this.elements.previewSaveItem) {
        this.elements.previewSaveItem.addEventListener('click', () => {
          if (this.currentPreviewItem) {
            this.closeQuickPreview();
            this.openSaveItemModal(this.currentPreviewItem);
          }
        });
      }
      
      if (this.elements.previewMarkSeen) {
        this.elements.previewMarkSeen.addEventListener('click', async () => {
          if (this.currentPreviewItem) {
            await this.markListingAsSeen(this.currentPreviewItem.id);
            this.closeQuickPreview();
          }
        });
      }
      
      // Filter toggle functionality
      if (this.elements.toggleFilters) {
        this.elements.toggleFilters.addEventListener('click', () => {
          this.toggleFiltersPanel();
        });
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

      // Bulk operations event listeners
      if (this.elements.bulkModeToggle) {
        this.elements.bulkModeToggle.addEventListener('click', () => {
          this.toggleBulkMode();
        });
      }

      if (this.elements.selectAllCheckbox) {
        this.elements.selectAllCheckbox.addEventListener('change', (e) => {
          this.selectAllListings(e.target.checked);
        });
      }

      if (this.elements.bulkMarkSeen) {
        this.elements.bulkMarkSeen.addEventListener('click', () => {
          this.bulkMarkAsSeen();
        });
      }

      if (this.elements.bulkSave) {
        this.elements.bulkSave.addEventListener('click', () => {
          this.bulkSaveItems();
        });
      }

      if (this.elements.bulkDelete) {
        this.elements.bulkDelete.addEventListener('click', () => {
          this.bulkHideItems();
        });
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

  openSaveItemModal(listing) {
    if (this.elements.saveItemModal) {
      this.currentSaveItem = listing;
      
      // Populate the preview
      this.renderSaveItemPreview(listing);
      
      // Reset form
      this.elements.saveItemForm.reset();
      this.elements.itemPriority.value = 'medium';
      
      this.elements.saveItemModal.classList.add('active');
      this.elements.itemNotes.focus();
      
      console.log('Save item modal opened for:', listing.title);
    }
  }

  closeSaveItemModal() {
    if (this.elements.saveItemModal) {
      this.elements.saveItemModal.classList.remove('active');
      this.currentSaveItem = null;
      this.elements.saveItemForm.reset();
      console.log('Save item modal closed');
    }
  }

  renderSaveItemPreview(listing) {
    if (!this.elements.saveItemPreview) return;
    
    this.elements.saveItemPreview.innerHTML = `
      <div class="save-item-preview-card">
        <div class="save-item-preview-image">
          ${listing.image ? `
            <img src="${listing.image}" alt="${this.escapeHtml(listing.title)}" />
          ` : `
            <div class="save-item-preview-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
          `}
        </div>
        <div class="save-item-preview-content">
          <h4 class="save-item-preview-title">${this.escapeHtml(listing.title)}</h4>
          <div class="save-item-preview-price">${listing.price ? `$${this.escapeHtml(listing.price)}` : 'Price not available'}</div>
          <div class="save-item-preview-meta">
            <span>${this.escapeHtml(listing.location || 'Location not available')}</span>
            <span>•</span>
            <span>${this.formatTimeAgo(listing.timestamp)}</span>
          </div>
        </div>
      </div>
    `;
  }

  async handleSaveItemSubmit(e) {
    e.preventDefault();
    
    if (!this.currentSaveItem) {
      this.showToast('No item selected to save', 'error');
      return;
    }
    
    try {
      const formData = new FormData(e.target);
      const notes = formData.get('itemNotes').trim();
      const tagsString = formData.get('itemTags').trim();
      const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      const priority = formData.get('itemPriority');
      const followUpDateString = formData.get('followUpDate');
      const followUpDate = followUpDateString ? new Date(followUpDateString).getTime() : null;
      
      if (this.storageReady) {
        const savedItemId = await storage.saveItem(this.currentSaveItem, notes, tags, priority, followUpDate);
        
        this.showToast(`Item saved successfully!`, 'success');
        this.closeSaveItemModal();
        
        // Update the save button to show it's saved
        this.updateSaveButtonStatus(this.currentSaveItem.id, true);
        
        console.log('Item saved with ID:', savedItemId);
      } else {
        this.showToast('Storage not available', 'error');
      }
    } catch (error) {
      console.error('Failed to save item:', error);
      this.showToast('Failed to save item', 'error');
    }
  }

  updateSaveButtonStatus(listingId, isSaved) {
    const saveBtn = document.querySelector(`[data-listing-id="${listingId}"].save-item`);
    if (saveBtn) {
      if (isSaved) {
        saveBtn.classList.remove('btn-success');
        saveBtn.classList.add('btn-warning');
        saveBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          Saved
        `;
        saveBtn.disabled = true;
      }
    }
  }

  // ===== QUICK PREVIEW OVERLAY FUNCTIONS =====
  
  openQuickPreview(listing) {
    if (this.elements.quickPreviewOverlay) {
      this.currentPreviewItem = listing;
      
      // Populate the preview content
      this.renderQuickPreviewContent(listing);
      
      // Update the View Listing button
      if (this.elements.previewViewListing) {
        this.elements.previewViewListing.href = listing.url;
      }
      
      // Show the overlay with animation
      this.elements.quickPreviewOverlay.classList.add('active');
      
      // Add escape key listener
      this.addQuickPreviewKeyListener();
      
      console.log('Quick preview opened for:', listing.title);
    }
  }

  closeQuickPreview() {
    if (this.elements.quickPreviewOverlay) {
      this.elements.quickPreviewOverlay.classList.remove('active');
      this.currentPreviewItem = null;
      
      // Remove escape key listener
      this.removeQuickPreviewKeyListener();
      
      console.log('Quick preview closed');
    }
  }

  addQuickPreviewKeyListener() {
    this.quickPreviewKeyHandler = (e) => {
      if (e.key === 'Escape') {
        this.closeQuickPreview();
      }
    };
    document.addEventListener('keydown', this.quickPreviewKeyHandler);
  }

  removeQuickPreviewKeyListener() {
    if (this.quickPreviewKeyHandler) {
      document.removeEventListener('keydown', this.quickPreviewKeyHandler);
      this.quickPreviewKeyHandler = null;
    }
  }

  toggleFiltersPanel() {
    if (this.elements.filtersPanel) {
      const isVisible = this.elements.filtersPanel.style.display !== 'none';
      this.elements.filtersPanel.style.display = isVisible ? 'none' : 'block';
      
      // Update button appearance
      if (this.elements.toggleFilters) {
        this.elements.toggleFilters.classList.toggle('btn-primary', !isVisible);
        this.elements.toggleFilters.classList.toggle('btn-secondary', isVisible);
      }
      
      console.log(`Filters panel ${isVisible ? 'hidden' : 'shown'}`);
    }
  }

  async markListingAsSeen(listingId) {
    if (!this.storageReady) {
      this.showToast('Storage not available', 'error');
      return;
    }

    try {
      await storage.markListingAsSeen(listingId);
      this.showToast('Listing hidden from results', 'success');
      
      // Update the local listings array to reflect the change
      const listing = this.listings.find(l => l.id === listingId);
      if (listing) {
        listing.seen = true;
        listing.hidden = true;
        listing.seenAt = Date.now();
        listing.hiddenAt = Date.now();
      }
      
      // Reapply filters to hide the item immediately
      this.applyFilters();
      this.renderResults();
      
      // Check for price drops after a short delay
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
      
    } catch (error) {
      console.error('Failed to mark listing as seen:', error);
      this.showToast('Failed to hide listing', 'error');
    }
  }

  renderQuickPreviewContent(listing) {
    if (!this.elements.quickPreviewContent) return;
    
    const badges = this.generateListingBadges(listing);
    const formattedPrice = listing.price ? `$${listing.price}` : 'Price not available';
    const priceClass = listing.price ? 'quick-preview-price' : 'quick-preview-price quick-preview-price--unavailable';
    
    this.elements.quickPreviewContent.innerHTML = `
      <div class="quick-preview-item">
        <div class="quick-preview-image">
          ${listing.image ? `
            <img src="${listing.image}" alt="${this.escapeHtml(listing.title)}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="quick-preview-image-fallback" style="display: none;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
          ` : `
            <div class="quick-preview-image-fallback">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
              </svg>
            </div>
          `}
        </div>
        
        <div class="quick-preview-details">
          <h2 class="quick-preview-item-title">${this.escapeHtml(listing.title)}</h2>
          <div class="${priceClass}">${formattedPrice}</div>
          
          ${badges ? `<div class="quick-preview-badges">${badges}</div>` : ''}
          
          ${listing.description ? `
            <div class="quick-preview-description">
              <p>${this.escapeHtml(listing.description)}</p>
            </div>
          ` : ''}
          
          <div class="quick-preview-meta">
            <div class="quick-preview-meta-item">
              <div class="quick-preview-meta-label">Location</div>
              <div class="quick-preview-meta-value">${this.escapeHtml(listing.location || 'Not specified')}</div>
            </div>
            <div class="quick-preview-meta-item">
              <div class="quick-preview-meta-label">Posted</div>
              <div class="quick-preview-meta-value">${this.formatTimeAgo(listing.timestamp)}</div>
            </div>
            <div class="quick-preview-meta-item">
              <div class="quick-preview-meta-label">Category</div>
              <div class="quick-preview-meta-value">${this.detectCategory(listing)}</div>
            </div>
            ${listing.originalPrice && listing.originalPrice !== listing.price ? `
              <div class="quick-preview-meta-item">
                <div class="quick-preview-meta-label">Original Price</div>
                <div class="quick-preview-meta-value">$${listing.originalPrice}</div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    
    // Update button states
    if (this.elements.previewMarkSeen) {
      this.elements.previewMarkSeen.disabled = listing.hidden || listing.seen;
      this.elements.previewMarkSeen.innerHTML = listing.hidden || listing.seen ? 
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Already Seen` :
        `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        Mark as Seen`;
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
        
        // DEBUG: Count hidden vs visible listings
        const hiddenCount = this.listings.filter(l => l.hidden).length;
        const visibleCount = this.listings.length - hiddenCount;
        console.log(`🔍 HIDDEN LISTINGS DEBUG: ${visibleCount} visible, ${hiddenCount} hidden in loaded data`);
        
        // DEBUG: Log first few listings with their status
        this.listings.slice(0, 5).forEach((listing, index) => {
          console.log(`  ${index + 1}. ${listing.title} (ID: ${listing.id}, hidden: ${listing.hidden}, seen: ${listing.seen})`);
        });
        
        // DEBUG: Show all hidden listings
        const hiddenListings = this.listings.filter(l => l.hidden);
        if (hiddenListings.length > 0) {
          console.log(`🚫 HIDDEN LISTINGS (${hiddenListings.length}):`);
          hiddenListings.forEach((listing, index) => {
            console.log(`  ${index + 1}. ${listing.title} (hidden: ${listing.hidden}, seen: ${listing.seen})`);
          });
        }
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
          <input type="checkbox" class="listing-checkbox" data-listing-id="${listing.id}">
          <div class="listing-thumbnail">
            ${listing.image ? `
              <img src="${listing.image}" alt="${this.escapeHtml(listing.title)}" class="listing-image" loading="lazy" onerror="this.style.display='none'">
            ` : `
              <div class="listing-image-placeholder">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            `}
            <div class="listing-badge">
              ${listing.priceDropDetected ? '<span class="badge badge-price-drop">Drop</span>' : 
                !listing.seen ? '<span class="badge badge-new">New</span>' : 
                '<span class="badge badge-seen">Seen</span>'}
            </div>
          </div>
          <div class="listing-details">
            <div class="listing-main">
              <h4 class="listing-title">${this.escapeHtml(listing.title || 'Untitled Listing')}</h4>
              <div class="listing-price ${listing.price ? '' : 'listing-price--unavailable'}">
                ${listing.price ? `${this.escapeHtml(listing.price)}` : 'Price not available'}
                ${listing.priceDropDetected && listing.originalPrice ? `
                  <span class="price-drop-indicator">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 14l5-5 5 5z"/>
                    </svg>
                    was ${listing.originalPrice}
                  </span>
                ` : ''}
              </div>
            </div>
            <div class="listing-info">
              <div class="listing-location">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                ${this.escapeHtml(listing.location || 'Location not available')}
              </div>
              <div class="listing-time">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z"/>
                </svg>
                ${this.formatTimeAgo(listing.timestamp)}
              </div>
            </div>
          </div>
          <div class="listing-actions">
            <button class="btn btn-primary quick-preview" data-listing-id="${listing.id}" title="Quick preview of this item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              Quick Preview
            </button>
            <button class="btn btn-success save-item" data-listing-id="${listing.id}" title="Save item to your list">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
              </svg>
              Save
            </button>
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
    // Quick preview listeners
    document.querySelectorAll('.quick-preview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.target.closest('.quick-preview');
        const listingId = button.dataset.listingId;
        
        if (!listingId) {
          console.error('No listing ID found on quick preview button');
          return;
        }
        
        // Find the listing data
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) {
          this.showToast('Listing not found', 'error');
          return;
        }
        
        // Open quick preview overlay
        this.openQuickPreview(listing);
      });
    });

    // Save item listeners
    document.querySelectorAll('.save-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const button = e.target.closest('.save-item');
        const listingId = button.dataset.listingId;
        
        if (!listingId) {
          console.error('No listing ID found on save button');
          return;
        }
        
        // Find the listing data
        const listing = this.listings.find(l => l.id === listingId);
        if (!listing) {
          this.showToast('Listing not found', 'error');
          return;
        }
        
        // Open save item modal
        this.openSaveItemModal(listing);
      });
    });

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
          
          // Use the unified mark as seen function
          await this.markListingAsSeen(listingId);
        } catch (error) {
          console.error('Failed to mark listing as seen:', error);
          this.showToast('Failed to hide listing', 'error');
          
          // Reset button state on error
          button.disabled = false;
          button.textContent = 'Hide';
        }
      });
    });

    // Bulk selection checkbox listeners
    document.querySelectorAll('.listing-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const listingId = e.target.dataset.listingId;
        this.handleListingCheckboxChange(listingId, e.target.checked);
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
      // Show search status
      this.showSearchStatus(`Searching "${search.keywords}"...`);
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
        
        let listingsToSave = listingsWithSearchId; // Default value
        
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
          const filteredListings = listingsWithSearchId.filter(newListing => {
            const oldListingById = oldListingsMap.get(newListing.id);
            const oldListingByUrl = oldListingsByUrl.get(newListing.url);
            
            // Check for exact ID match first
            if (oldListingById && oldListingById.hidden) {
              console.log(`🚫 Filtering out hidden listing by ID: ${newListing.title}`);
              return false;
            }
            
            // Check for URL match
            if (oldListingByUrl && oldListingByUrl.hidden) {
              console.log(`🚫 Filtering out hidden listing by URL: ${newListing.title}`);
              return false;
            }
            
            // Check for title + price match (same item with different ID/URL)
            const similarHiddenListing = oldListings.find(old => 
              old.hidden && 
              old.title === newListing.title && 
              old.price === newListing.price
            );
            
            if (similarHiddenListing) {
              console.log(`🚫 Filtering out hidden listing by title+price match: ${newListing.title}`);
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
          
          listingsToSave = filteredListings; // Update the variable
          
          // FIXED: Don't delete old listings - just save the new/updated ones
          // The storage.saveListings() function will handle updating existing and adding new
          console.log(`💾 Saving ${listingsToSave.length} listings (filtered out hidden reappearances)`);
          await storage.saveListings(listingsToSave);
          
          // Clean up old listings that are no longer in the search results (but preserve hidden ones)
          const newListingIds = new Set(listingsToSave.map(l => l.id));
          const staleListings = oldListings.filter(old => 
            !newListingIds.has(old.id) && !old.hidden // Only delete non-hidden stale listings
          );
          
          if (staleListings.length > 0) {
            console.log(`🗑️ Removing ${staleListings.length} stale visible listings (preserving hidden ones)`);
            for (const staleListing of staleListings) {
              await storage.deleteListing(staleListing.id);
            }
          }
        }
        await this.loadRecentListings();
        
        console.log(`📋 Total listings after loading: ${this.listings.length}`);

        // Trigger notifications for new listings
        if (this.notificationManager && listings && listings.length > 0) {
          try {
            const newListings = listings.filter(listing => !listing.seen);
            if (newListings.length > 0) {
              await this.processNewListingNotifications(newListings, search);
            }
          } catch (error) {
            console.warn('Failed to process notifications:', error);
          }
        }
        
        this.showToast(`Found ${listings.length} listings for "${search.keywords}"`, 'success');
      } else {
        this.showToast('No listings found', 'info');
      }
      
      // Hide search status and update timestamp
      this.hideSearchStatus();
      this.updateResultsTimestamp();
    } catch (error) {
      console.error('Search failed:', error);
      this.showToast(`Search failed: ${error.message}`, 'error');
      this.hideSearchStatus();
    }
  }

  async runAllSearches() {
    const activeSearches = this.searches.filter(s => s.enabled);
    if (activeSearches.length === 0) {
      this.showToast('No active searches found', 'warning');
      return;
    }

    this.showSearchStatus(`Running ${activeSearches.length} searches...`, 0, activeSearches.length);
    
    for (let i = 0; i < activeSearches.length; i++) {
      const search = activeSearches[i];
      try {
        this.updateSearchProgress(`Searching "${search.keywords}"...`, i + 1, activeSearches.length);
        await this.runSingleSearch(search.id);
        // Add delay between searches
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to run search ${search.keywords}:`, error);
      }
    }
    
    this.hideSearchStatus();
    this.updateResultsTimestamp();
  }

  // ===== SEARCH STATUS INDICATORS =====
  showSearchStatus(message, current = 0, total = 0) {
    if (!this.elements.searchStatusContainer) return;
    
    this.elements.searchStatusContainer.style.display = 'block';
    this.elements.searchStatusText.textContent = message;
    
    // Update progress if provided
    if (total > 0) {
      const progressBar = document.querySelector('#searchProgress .search-progress-bar');
      if (progressBar) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
      }
    }
  }

  updateSearchProgress(message, current, total) {
    if (!this.elements.searchStatusContainer) return;
    
    this.elements.searchStatusText.textContent = message;
    
    const progressBar = document.querySelector('#searchProgress .search-progress-bar');
    if (progressBar) {
      const percentage = (current / total) * 100;
      progressBar.style.width = `${percentage}%`;
    }
  }

  hideSearchStatus() {
    if (!this.elements.searchStatusContainer) return;
    
    // Add a small delay before hiding to show completion
    setTimeout(() => {
      this.elements.searchStatusContainer.style.display = 'none';
    }, 1000);
  }

  updateResultsTimestamp() {
    const timestampElement = document.getElementById('lastUpdatedText');
    const containerElement = this.elements.resultsTimestamp;
    
    if (!timestampElement || !containerElement) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    timestampElement.textContent = `Last updated: ${timeString}`;
    containerElement.style.display = 'block';
  }

  // ===== NOTIFICATION PROCESSING =====
  async processNewListingNotifications(listings, search) {
    if (!this.notificationManager) return;

    for (const listing of listings) {
      try {
        // Check if this is truly a new listing (not just an update)
        const existingListing = await storage.getListingsBySearch(search.id)
          .then(oldListings => oldListings.find(old => old.id === listing.id));
        
        if (!existingListing) {
          // This is a brand new listing - trigger notification
          await this.notificationManager.checkAndSendNotification(listing, {
            searchKeywords: search.keywords,
            searchId: search.id,
            alertType: 'new'
          });
        } else if (listing.priceDropDetected) {
          // Price drop detected - trigger urgent notification
          await this.notificationManager.checkAndSendNotification(listing, {
            searchKeywords: search.keywords,
            searchId: search.id,
            alertType: 'price-drop',
            originalPrice: existingListing.originalPrice
          });
        }
      } catch (error) {
        console.warn(`Failed to process notification for listing ${listing.id}:`, error);
      }
    }
  }

  // ===== BULK OPERATIONS =====
  toggleBulkMode() {
    this.bulkMode = !this.bulkMode;
    const body = document.body;
    
    if (this.bulkMode) {
      body.classList.add('bulk-mode');
      this.elements.bulkModeToggle.classList.add('active');
      this.showToast('Bulk selection mode enabled', 'info');
    } else {
      body.classList.remove('bulk-mode');
      this.elements.bulkModeToggle.classList.remove('active');
      this.selectedListings.clear();
      this.updateBulkActionsBar();
      this.clearCheckboxes();
      this.showToast('Bulk selection mode disabled', 'info');
    }
  }

  handleListingCheckboxChange(listingId, checked) {
    if (checked) {
      this.selectedListings.add(listingId);
    } else {
      this.selectedListings.delete(listingId);
    }
    
    // Update card visual state
    const card = document.querySelector(`[data-listing-id="${listingId}"]`);
    if (card) {
      card.classList.toggle('selected', checked);
    }
    
    this.updateBulkActionsBar();
    this.updateSelectAllCheckbox();
  }

  selectAllListings(checked) {
    const checkboxes = document.querySelectorAll('.listing-checkbox');
    
    checkboxes.forEach(checkbox => {
      checkbox.checked = checked;
      const listingId = checkbox.dataset.listingId;
      this.handleListingCheckboxChange(listingId, checked);
    });
  }

  updateBulkActionsBar() {
    const count = this.selectedListings.size;
    
    if (this.elements.selectedCount) {
      this.elements.selectedCount.textContent = count;
    }
    
    if (this.elements.bulkActionsBar) {
      this.elements.bulkActionsBar.classList.toggle('visible', count > 0);
    }
  }

  updateSelectAllCheckbox() {
    if (!this.elements.selectAllCheckbox) return;
    
    const allCheckboxes = document.querySelectorAll('.listing-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.listing-checkbox:checked');
    
    if (checkedCheckboxes.length === 0) {
      this.elements.selectAllCheckbox.indeterminate = false;
      this.elements.selectAllCheckbox.checked = false;
    } else if (checkedCheckboxes.length === allCheckboxes.length) {
      this.elements.selectAllCheckbox.indeterminate = false;
      this.elements.selectAllCheckbox.checked = true;
    } else {
      this.elements.selectAllCheckbox.indeterminate = true;
    }
  }

  clearCheckboxes() {
    document.querySelectorAll('.listing-checkbox').forEach(checkbox => {
      checkbox.checked = false;
    });
    document.querySelectorAll('.listing-card').forEach(card => {
      card.classList.remove('selected');
    });
  }

  async bulkMarkAsSeen() {
    if (this.selectedListings.size === 0) {
      this.showToast('No items selected', 'warning');
      return;
    }

    try {
      const selectedIds = Array.from(this.selectedListings);
      this.showToast(`Marking ${selectedIds.length} items as seen...`, 'info');

      for (const listingId of selectedIds) {
        await storage.markListingAsSeen(listingId);
      }

      await this.loadRecentListings();
      this.selectedListings.clear();
      this.updateBulkActionsBar();
      this.clearCheckboxes();
      
      this.showToast(`${selectedIds.length} items marked as seen`, 'success');
    } catch (error) {
      console.error('Bulk mark as seen failed:', error);
      this.showToast('Failed to mark items as seen', 'error');
    }
  }

  async bulkSaveItems() {
    if (this.selectedListings.size === 0) {
      this.showToast('No items selected', 'warning');
      return;
    }

    try {
      const selectedIds = Array.from(this.selectedListings);
      let savedCount = 0;

      for (const listingId of selectedIds) {
        const listing = this.listings.find(l => l.id === listingId);
        if (listing) {
          const isAlreadySaved = await storage.isItemSaved(listingId);
          if (!isAlreadySaved) {
            await storage.saveItem(listing, `Bulk saved on ${new Date().toLocaleDateString()}`, ['bulk-save'], 'medium');
            savedCount++;
          }
        }
      }

      this.selectedListings.clear();
      this.updateBulkActionsBar();
      this.clearCheckboxes();
      
      this.showToast(`${savedCount} new items saved (${selectedIds.length - savedCount} already saved)`, 'success');
    } catch (error) {
      console.error('Bulk save failed:', error);
      this.showToast('Failed to save items', 'error');
    }
  }

  async bulkHideItems() {
    if (this.selectedListings.size === 0) {
      this.showToast('No items selected', 'warning');
      return;
    }

    try {
      const selectedIds = Array.from(this.selectedListings);
      this.showToast(`Hiding ${selectedIds.length} items...`, 'info');

      for (const listingId of selectedIds) {
        await storage.markListingAsSeen(listingId); // This also hides the item
      }

      await this.loadRecentListings();
      this.selectedListings.clear();
      this.updateBulkActionsBar();
      this.clearCheckboxes();
      
      this.showToast(`${selectedIds.length} items hidden`, 'success');
    } catch (error) {
      console.error('Bulk hide failed:', error);
      this.showToast('Failed to hide items', 'error');
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
    console.log(`🔍 FILTER DEBUG: Starting with ${this.listings.length} total listings`);
    
    const hiddenInSource = this.listings.filter(l => l.hidden).length;
    console.log(`🔍 FILTER DEBUG: ${hiddenInSource} listings are marked as hidden in source data`);
    
    this.filteredListings = this.listings.filter(listing => {
      // Base filter: exclude hidden items unless "seen" status is explicitly requested
      if (listing.hidden && !this.filters.status.includes('seen')) {
        console.log(`❌ Hidden filter: ${listing.title} is hidden (hidden: ${listing.hidden}, seen in filters: ${this.filters.status.includes('seen')})`);
        return false;
      }
      
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
    
    const hiddenInFiltered = this.filteredListings.filter(l => l.hidden).length;
    console.log(`✅ Filtered ${this.filteredListings.length} of ${this.listings.length} listings`);
    console.log(`🔍 FILTER RESULT: ${hiddenInFiltered} hidden listings passed through filter (should be 0 unless 'seen' status selected)`);
    
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
  
  async showKeywordSuggestions(value) {
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
    
    // Get intelligent suggestions based on search history and smart patterns
    const suggestions = await this.getIntelligentSuggestions(lastKeyword);
    
    // Update the suggestions container with dynamic content
    this.renderDynamicSuggestions(suggestions, keywordsSuggestions, value);
  }

  async getIntelligentSuggestions(keyword) {
    const suggestions = [];
    
    // 1. Get suggestions from search history
    if (this.storageReady) {
      const historicalKeywords = await this.getSearchHistoryKeywords();
      const matchingHistory = historicalKeywords.filter(item => 
        item.keyword.toLowerCase().includes(keyword) && 
        item.keyword.toLowerCase() !== keyword
      );
      suggestions.push(...matchingHistory.map(item => ({
        text: item.keyword,
        type: 'history',
        frequency: item.frequency,
        icon: 'history'
      })));
    }
    
    // 2. Smart category-based suggestions
    const categorySuggestions = this.getCategorySuggestions(keyword);
    suggestions.push(...categorySuggestions);
    
    // 3. Popular marketplace items
    const popularSuggestions = this.getPopularSuggestions(keyword);
    suggestions.push(...popularSuggestions);
    
    // Sort by relevance: history frequency > category match > popularity
    return suggestions
      .sort((a, b) => {
        if (a.type === 'history' && b.type !== 'history') return -1;
        if (b.type === 'history' && a.type !== 'history') return 1;
        if (a.frequency && b.frequency) return b.frequency - a.frequency;
        return 0;
      })
      .slice(0, 8); // Limit to 8 suggestions
  }

  async getSearchHistoryKeywords() {
    try {
      const searches = await storage.getAllSearches();
      const keywordMap = new Map();
      
      searches.forEach(search => {
        const keywords = search.keywords.split(',').map(k => k.trim());
        keywords.forEach(keyword => {
          if (keyword.length > 1) {
            const existing = keywordMap.get(keyword.toLowerCase()) || { keyword, frequency: 0 };
            existing.frequency++;
            keywordMap.set(keyword.toLowerCase(), existing);
          }
        });
      });
      
      return Array.from(keywordMap.values());
    } catch (error) {
      console.error('Failed to get search history:', error);
      return [];
    }
  }

  getCategorySuggestions(keyword) {
    const categoryMap = {
      'phone': ['iPhone', 'Samsung Galaxy', 'Google Pixel', 'phone case', 'phone charger'],
      'laptop': ['MacBook', 'Dell XPS', 'ThinkPad', 'gaming laptop', 'laptop bag'],
      'car': ['Toyota', 'Honda', 'Ford', 'BMW', 'car parts', 'car accessories'],
      'bike': ['mountain bike', 'road bike', 'electric bike', 'bike helmet', 'bike accessories'],
      'furniture': ['desk', 'chair', 'table', 'sofa', 'bed', 'bookshelf'],
      'gaming': ['PlayStation', 'Xbox', 'Nintendo', 'gaming chair', 'gaming headset'],
      'clothing': ['t-shirt', 'jeans', 'dress', 'jacket', 'shoes', 'sneakers']
    };
    
    const suggestions = [];
    Object.entries(categoryMap).forEach(([category, items]) => {
      if (category.includes(keyword)) {
        items.forEach(item => {
          if (item.toLowerCase().includes(keyword)) {
            suggestions.push({
              text: item,
              type: 'category',
              category: category,
              icon: 'category'
            });
          }
        });
      }
    });
    
    return suggestions;
  }

  getPopularSuggestions(keyword) {
    const popular = [
      'iPhone 15', 'MacBook Pro', 'PlayStation 5', 'Nintendo Switch',
      'Samsung Galaxy', 'iPad', 'AirPods', 'gaming chair', 'desk setup',
      'car parts', 'bike accessories', 'furniture', 'vintage items'
    ];
    
    return popular
      .filter(item => item.toLowerCase().includes(keyword))
      .map(item => ({
        text: item,
        type: 'popular',
        icon: 'trending'
      }));
  }

  renderDynamicSuggestions(suggestions, container, currentValue) {
    if (suggestions.length === 0) {
      container.style.display = 'none';
      return;
    }
    
    const getIcon = (type) => {
      switch (type) {
        case 'history':
          return '<path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>';
        case 'category':
          return '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>';
        case 'popular':
          return '<path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>';
        default:
          return '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>';
      }
    };
    
    const suggestionHTML = suggestions.map(suggestion => `
      <div class="suggestion-item suggestion-item--${suggestion.type}" data-suggestion="${suggestion.text}">
        <svg class="suggestion-icon" viewBox="0 0 24 24" fill="currentColor">
          ${getIcon(suggestion.type)}
        </svg>
        <span class="suggestion-text">${suggestion.text}</span>
        ${suggestion.frequency ? `<span class="suggestion-frequency">${suggestion.frequency}</span>` : ''}
        <span class="suggestion-type">${suggestion.type}</span>
      </div>
    `).join('');
    
    container.innerHTML = suggestionHTML;
    container.style.display = 'block';
    
    // Re-attach click listeners for new suggestions
    container.querySelectorAll('.suggestion-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const suggestion = e.currentTarget.dataset.suggestion;
        if (suggestion && this.elements.keywords) {
          const currentValue = this.elements.keywords.value;
          const keywords = currentValue ? currentValue + ', ' + suggestion : suggestion;
          this.elements.keywords.value = keywords;
          this.validateKeywords(keywords);
          container.style.display = 'none';
        }
      });
    });
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
