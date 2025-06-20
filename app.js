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
      await storage.clearAllData();
      await this.loadSearches();
      await this.loadRecentListings();
      this.showToast('All data cleared successfully', 'success');
    } catch (error) {
      console.error('Failed to clear data:', error);
      this.showToast('Failed to clear data', 'error');
    }
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
  
  showUpdateAvailable() {
    const banner = document.createElement('div');
    banner.className = 'notification-banner';
    banner.innerHTML = `
      New version available! 
      <button onclick="location.reload()" style="background: none; border: none; color: white; text-decoration: underline; cursor: pointer; margin-left: 8px;">
        Refresh to update
      </button>
    `;
    
    document.body.insertBefore(banner, document.body.firstChild);
    setTimeout(() => banner.classList.add('show'), 100);
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
  
  renderBasicUI() {
    this.elements.searchList.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <p>Ready to start!</p>
        <p class="help-text">Create your first search to see demo listings</p>
      </div>
    `;
    
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
  
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    this.elements.toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, 5000);
  }
  
  formatPriceRange(min, max) {
    if (min && max) {
      return `$${min} - $${max}`;
    } else if (min) {
      return `$${min}+`;
    } else if (max) {
      return `Up to $${max}`;
    }
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