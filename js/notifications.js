class NotificationManager {
  constructor() {
    this.permission = Notification.permission;
    this.isSupported = 'Notification' in window;
    this.pushManager = null;
    this.vapidPublicKey = 'BEL4KPE8X_example_key_here';
    this.soundCache = new Map();
    this.emailAlertQueue = [];
    this.alertConditions = {
      priceDropThreshold: 10, // percentage
      maxDailyAlerts: 50,
      quietHoursStart: 22, // 10 PM
      quietHoursEnd: 8, // 8 AM
      enableBundleAlerts: true,
      alertCooldown: 300000 // 5 minutes in ms
    };
    this.lastAlertTime = new Map();
    this.dailyAlertCount = 0;
    this.lastAlertDate = new Date().toDateString();
  }
  
  async initialize() {
    if (!this.isSupported) {
      console.warn('Notifications not supported in this browser');
      return false;
    }
    
    try {
      await this.requestPermission();
      await this.setupPushNotifications();
      this.setupNotificationHandlers();
      
      console.log('Notification manager initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }
  
  async requestPermission() {
    if (this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }
    
    console.log('Notification permission:', this.permission);
    return this.permission === 'granted';
  }
  
  async setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      this.pushManager = registration.pushManager;
      
      const existingSubscription = await this.pushManager.getSubscription();
      
      if (!existingSubscription) {
        console.log('Creating new push subscription...');
        const subscription = await this.subscribeToNotifications();
        if (subscription) {
          await this.savePushSubscription(subscription);
        }
      } else {
        console.log('Using existing push subscription');
        await this.savePushSubscription(existingSubscription);
      }
    } catch (error) {
      console.error('Failed to setup push notifications:', error);
    }
  }
  
  async subscribeToNotifications() {
    try {
      const subscription = await this.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });
      
      console.log('Push subscription created:', subscription);
      return subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }
  
  async savePushSubscription(subscription) {
    try {
      await storage.setSetting('pushSubscription', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.getKey('p256dh') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))) : null,
          auth: subscription.getKey('auth') ? btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))) : null
        }
      });
      
      console.log('Push subscription saved');
    } catch (error) {
      console.error('Failed to save push subscription:', error);
    }
  }
  
  setupNotificationHandlers() {
    if (!this.isSupported) return;
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.markVisibleNotificationsAsRead();
      }
    });
    
    window.addEventListener('focus', () => {
      this.markVisibleNotificationsAsRead();
    });
  }
  
  async sendLocalNotification(title, options = {}) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }
    
    const defaultOptions = {
      icon: '/images/icons/icon-192x192.png',
      badge: '/images/icons/icon-72x72.png',
      requireInteraction: true,
      silent: false,
      tag: 'marketplace-notification',
      timestamp: Date.now()
    };
    
    const notificationOptions = { ...defaultOptions, ...options };
    
    try {
      const notification = new Notification(title, notificationOptions);
      
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        if (notificationOptions.data?.url) {
          window.open(notificationOptions.data.url, '_blank');
        }
        
        if (notificationOptions.data?.listingId) {
          this.markNotificationAsRead(notificationOptions.data.listingId);
        }
        
        notification.close();
      };
      
      notification.onclose = () => {
        if (notificationOptions.data?.listingId) {
          this.markNotificationAsRead(notificationOptions.data.listingId);
        }
      };
      
      console.log('Local notification sent:', title);
      return notification;
    } catch (error) {
      console.error('Failed to send local notification:', error);
      return null;
    }
  }
  
  async sendListingNotification(listing, search) {
    // Check alert conditions
    if (!await this.shouldSendAlert(listing, search)) {
      return null;
    }
    
    const soundEnabled = await storage.getSetting('enableSound', true);
    const alertType = this.determineAlertType(listing);
    
    const options = {
      body: `${listing.price} • ${listing.location}`,
      tag: `listing-${listing.id}`,
      data: {
        listingId: listing.id,
        url: listing.url,
        searchId: search.id,
        type: 'listing',
        alertType: alertType,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View Listing',
          icon: '/images/icons/icon-72x72.png'
        },
        {
          action: 'dismiss',
          title: 'Mark as Seen',
          icon: '/images/icons/icon-72x72.png'
        },
        {
          action: 'snooze',
          title: 'Snooze 1hr',
          icon: '/images/icons/icon-72x72.png'
        }
      ],
      silent: !soundEnabled,
      image: listing.image,
      urgency: alertType === 'urgent' ? 'high' : 'normal'
    };
    
    // Play custom sound based on alert type
    if (soundEnabled) {
      this.playAlertSound(alertType);
    }
    
    // Send email alert if enabled
    if (await this.shouldSendEmailAlert(listing, search)) {
      this.queueEmailAlert(listing, search, alertType);
    }
    
    // Update alert tracking
    this.updateAlertTracking(listing.id);
    
    return await this.sendLocalNotification(`${this.getAlertPrefix(alertType)}${listing.title}`, options);
  }
  
  async sendBulkNotification(listings, search) {
    if (listings.length === 0) return;
    
    if (listings.length === 1) {
      return await this.sendListingNotification(listings[0], search);
    }
    
    const options = {
      body: `${listings.length} new matches found for "${search.keywords}"`,
      tag: `bulk-${search.id}`,
      data: {
        searchId: search.id,
        type: 'bulk',
        listingIds: listings.map(l => l.id)
      },
      actions: [
        {
          action: 'view-all',
          title: 'View All',
          icon: '/images/icons/icon-72x72.png'
        },
        {
          action: 'dismiss-all',
          title: 'Dismiss All',
          icon: '/images/icons/icon-72x72.png'
        }
      ]
    };
    
    return await this.sendLocalNotification('Multiple New Matches', options);
  }
  
  async sendTestNotification() {
    const options = {
      body: 'Notifications are working correctly!',
      tag: 'test-notification',
      data: { type: 'test' },
      requireInteraction: false
    };
    
    return await this.sendLocalNotification('Test Notification', options);
  }
  
  async sendSearchErrorNotification(searchKeywords, error) {
    const options = {
      body: `Error checking for new listings: ${error.message}`,
      tag: 'error-notification',
      data: { type: 'error' },
      icon: '/images/icons/icon-192x192.png',
      badge: '/images/icons/icon-72x72.png'
    };
    
    return await this.sendLocalNotification(`Search Error: ${searchKeywords}`, options);
  }
  
  async markNotificationAsRead(listingId) {
    try {
      await storage.markListingAsSeen(listingId);
      console.log('Notification marked as read:', listingId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }
  
  async markVisibleNotificationsAsRead() {
    try {
      const unreadNotifications = await storage.getUnreadNotifications();
      
      for (const notification of unreadNotifications) {
        await storage.markNotificationAsRead(notification.id);
      }
      
      if (unreadNotifications.length > 0) {
        console.log(`Marked ${unreadNotifications.length} notifications as read`);
      }
    } catch (error) {
      console.error('Failed to mark visible notifications as read:', error);
    }
  }
  
  async clearAllNotifications() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const notifications = await registration.getNotifications();
        
        notifications.forEach(notification => {
          notification.close();
        });
        
        console.log(`Cleared ${notifications.length} notifications`);
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }
  
  async getNotificationStatus() {
    const status = {
      supported: this.isSupported,
      permission: this.permission,
      enabled: await storage.getSetting('enableNotifications', true),
      soundEnabled: await storage.getSetting('enableSound', true),
      pushSupported: 'serviceWorker' in navigator && 'PushManager' in window
    };
    
    if (status.pushSupported) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        status.pushSubscribed = !!subscription;
      } catch (error) {
        status.pushSubscribed = false;
      }
    }
    
    return status;
  }
  
  async enableNotifications() {
    try {
      const granted = await this.requestPermission();
      if (granted) {
        await storage.setSetting('enableNotifications', true);
        await this.setupPushNotifications();
        console.log('Notifications enabled');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      return false;
    }
  }
  
  async disableNotifications() {
    try {
      await storage.setSetting('enableNotifications', false);
      await this.clearAllNotifications();
      
      if (this.pushManager) {
        const subscription = await this.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          console.log('Unsubscribed from push notifications');
        }
      }
      
      console.log('Notifications disabled');
      return true;
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      return false;
    }
  }
  
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
  
  async scheduleNotificationCheck() {
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      return false;
    }
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await registration.sync.register('notification-check');
        console.log('Background sync registered for notifications');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to schedule notification check:', error);
      return false;
    }
  }
  
  createInAppNotification(title, message, type = 'info', options = {}) {
    const notification = document.createElement('div');
    notification.className = `toast ${type} ${options.priority === 'high' ? 'toast-priority' : ''}`;
    
    const actions = options.actions || [];
    const actionsHtml = actions.length > 0 ? `
      <div class="toast-actions">
        ${actions.map(action => `
          <button type="button" class="btn btn-sm btn-${action.style || 'secondary'}" data-action="${action.id}">
            ${action.icon ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">${action.icon}</svg>` : ''}
            ${action.label}
          </button>
        `).join('')}
      </div>
    ` : '';
    
    notification.innerHTML = `
      <div class="toast-header">
        <div class="toast-title">
          ${options.icon ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">${options.icon}</svg>` : ''}
          <strong>${title}</strong>
        </div>
        <button type="button" class="toast-close" aria-label="Close">×</button>
      </div>
      <div class="toast-body">
        ${message}
        ${options.metadata ? `<div class="toast-metadata">${options.metadata}</div>` : ''}
        ${actionsHtml}
      </div>
    `;
    
    const container = document.getElementById('toastContainer');
    if (container) {
      container.appendChild(notification);
      
      // Handle action clicks
      actions.forEach(action => {
        const button = notification.querySelector(`[data-action="${action.id}"]`);
        if (button && action.handler) {
          button.addEventListener('click', action.handler);
        }
      });
      
      notification.querySelector('.toast-close').addEventListener('click', () => {
        notification.remove();
      });
      
      const autoClose = options.autoClose !== false;
      const duration = options.duration || (type === 'error' ? 8000 : 5000);
      
      if (autoClose) {
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, duration);
      }
    }
    
    return notification;
  }
  
  async shouldSendAlert(listing, search) {
    // Check daily limit
    const today = new Date().toDateString();
    if (this.lastAlertDate !== today) {
      this.dailyAlertCount = 0;
      this.lastAlertDate = today;
    }
    
    if (this.dailyAlertCount >= this.alertConditions.maxDailyAlerts) {
      console.warn('Daily alert limit reached');
      return false;
    }
    
    // Check quiet hours
    if (await this.isQuietHours()) {
      console.log('In quiet hours, skipping alert');
      return false;
    }
    
    // Check cooldown
    const lastAlert = this.lastAlertTime.get(search.id);
    if (lastAlert && (Date.now() - lastAlert) < this.alertConditions.alertCooldown) {
      console.log('Alert in cooldown period');
      return false;
    }
    
    // Check if already seen
    if (listing.seen) {
      return false;
    }
    
    return true;
  }
  
  async isQuietHours() {
    const quietHoursEnabled = await storage.getSetting('enableQuietHours', true);
    if (!quietHoursEnabled) return false;
    
    const now = new Date();
    const hour = now.getHours();
    
    const start = this.alertConditions.quietHoursStart;
    const end = this.alertConditions.quietHoursEnd;
    
    if (start > end) {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return hour >= start || hour < end;
    } else {
      // Same day quiet hours (e.g., 14:00 to 16:00)
      return hour >= start && hour < end;
    }
  }
  
  determineAlertType(listing) {
    // Price drop detection
    if (listing.priceHistory && listing.priceHistory.length > 1) {
      const currentPrice = listing.priceHistory[listing.priceHistory.length - 1].price;
      const previousPrice = listing.priceHistory[listing.priceHistory.length - 2].price;
      const dropPercentage = ((previousPrice - currentPrice) / previousPrice) * 100;
      
      if (dropPercentage >= this.alertConditions.priceDropThreshold) {
        return 'urgent'; // Significant price drop
      }
    }
    
    // Check for high-value items
    if (listing.price > 5000) {
      return 'important';
    }
    
    // Check posting age (new listings)
    const listingAge = Date.now() - new Date(listing.postedAt).getTime();
    if (listingAge < 3600000) { // Less than 1 hour old
      return 'new';
    }
    
    return 'normal';
  }
  
  getAlertPrefix(alertType) {
    switch (alertType) {
      case 'urgent': return '🚨 URGENT: ';
      case 'important': return '⭐ IMPORTANT: ';
      case 'new': return '🆕 NEW: ';
      default: return '📍 ';
    }
  }
  
  async playAlertSound(alertType) {
    try {
      const soundEnabled = await storage.getSetting('enableSound', true);
      if (!soundEnabled) return;
      
      let soundFile;
      switch (alertType) {
        case 'urgent':
          soundFile = '/sounds/urgent-alert.mp3';
          break;
        case 'important':
          soundFile = '/sounds/important-alert.mp3';
          break;
        case 'new':
          soundFile = '/sounds/new-alert.mp3';
          break;
        default:
          soundFile = '/sounds/default-alert.mp3';
      }
      
      // Use cached audio if available
      if (!this.soundCache.has(soundFile)) {
        const audio = new Audio(soundFile);
        audio.volume = await storage.getSetting('alertVolume', 0.7);
        this.soundCache.set(soundFile, audio);
      }
      
      const audio = this.soundCache.get(soundFile);
      await audio.play();
    } catch (error) {
      console.warn('Failed to play alert sound:', error);
    }
  }
  
  async shouldSendEmailAlert(listing, search) {
    const emailEnabled = await storage.getSetting('enableEmailAlerts', false);
    if (!emailEnabled) return false;
    
    const emailSettings = await storage.getSetting('emailAlertSettings', {});
    if (!emailSettings.enabled || !emailSettings.address) return false;
    
    // Check email alert conditions
    const alertType = this.determineAlertType(listing);
    const emailConditions = emailSettings.conditions || {};
    
    switch (alertType) {
      case 'urgent':
        return emailConditions.urgentAlerts !== false;
      case 'important':
        return emailConditions.importantAlerts === true;
      default:
        return emailConditions.allAlerts === true;
    }
  }
  
  queueEmailAlert(listing, search, alertType) {
    this.emailAlertQueue.push({
      listing,
      search,
      alertType,
      timestamp: Date.now()
    });
    
    // Process queue with debouncing to avoid spam
    this.debounceEmailProcessing();
  }
  
  debounceEmailProcessing() {
    if (this.emailProcessingTimeout) {
      clearTimeout(this.emailProcessingTimeout);
    }
    
    this.emailProcessingTimeout = setTimeout(async () => {
      await this.processEmailQueue();
    }, 30000); // 30 second delay to batch emails
  }
  
  async processEmailQueue() {
    if (this.emailAlertQueue.length === 0) return;
    
    try {
      const emailSettings = await storage.getSetting('emailAlertSettings', {});
      const alerts = [...this.emailAlertQueue];
      this.emailAlertQueue = [];
      
      // Group alerts by type for better email formatting
      const groupedAlerts = alerts.reduce((acc, alert) => {
        if (!acc[alert.alertType]) acc[alert.alertType] = [];
        acc[alert.alertType].push(alert);
        return acc;
      }, {});
      
      const emailData = {
        to: emailSettings.address,
        subject: this.generateEmailSubject(alerts),
        body: this.generateEmailBody(groupedAlerts),
        timestamp: Date.now()
      };
      
      // Store email in queue for backend processing
      await storage.queueEmail(emailData);
      
      console.log(`Queued ${alerts.length} alerts for email delivery`);
    } catch (error) {
      console.error('Failed to process email queue:', error);
    }
  }
  
  generateEmailSubject(alerts) {
    const urgentCount = alerts.filter(a => a.alertType === 'urgent').length;
    const totalCount = alerts.length;
    
    if (urgentCount > 0) {
      return `🚨 ${urgentCount} Urgent Marketplace Alert${urgentCount > 1 ? 's' : ''} + ${totalCount - urgentCount} more`;
    }
    
    return `📍 ${totalCount} New Marketplace Alert${totalCount > 1 ? 's' : ''}`;
  }
  
  generateEmailBody(groupedAlerts) {
    let body = '<h2>Marketplace Monitor Alerts</h2>';
    
    Object.entries(groupedAlerts).forEach(([type, alerts]) => {
      body += `<h3>${this.getAlertTypeTitle(type)} (${alerts.length})</h3>`;
      body += '<ul>';
      
      alerts.forEach(alert => {
        const { listing, search } = alert;
        body += `
          <li>
            <strong>${listing.title}</strong><br>
            Price: ${listing.price}<br>
            Location: ${listing.location}<br>
            Search: "${search.keywords}"<br>
            <a href="${listing.url}" target="_blank">View Listing</a>
          </li>
        `;
      });
      
      body += '</ul>';
    });
    
    body += '<p><small>Generated by Marketplace Monitor</small></p>';
    return body;
  }
  
  getAlertTypeTitle(type) {
    switch (type) {
      case 'urgent': return '🚨 Urgent Alerts';
      case 'important': return '⭐ Important Alerts';
      case 'new': return '🆕 New Listings';
      default: return '📍 Regular Alerts';
    }
  }
  
  updateAlertTracking(listingId) {
    this.dailyAlertCount++;
    this.lastAlertTime.set(listingId, Date.now());
  }
  
  async updateAlertConditions(newConditions) {
    this.alertConditions = { ...this.alertConditions, ...newConditions };
    await storage.setSetting('alertConditions', this.alertConditions);
    console.log('Alert conditions updated:', this.alertConditions);
  }
  
  async loadAlertConditions() {
    try {
      const saved = await storage.getSetting('alertConditions', {});
      this.alertConditions = { ...this.alertConditions, ...saved };
    } catch (error) {
      console.warn('Failed to load alert conditions:', error);
    }
  }
  
  async getNotificationHistory(limit = 50) {
    try {
      return await storage.getUnreadNotifications();
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return [];
    }
  }
}

const notificationManager = new NotificationManager();

// Initialize enhanced notifications
notificationManager.loadAlertConditions();