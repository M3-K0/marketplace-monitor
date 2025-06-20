class NotificationManager {
  constructor() {
    this.permission = Notification.permission;
    this.isSupported = 'Notification' in window;
    this.pushManager = null;
    this.vapidPublicKey = 'BEL4KPE8X_example_key_here';
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
    const soundEnabled = await storage.getSetting('enableSound', true);
    
    const options = {
      body: `${listing.price} • ${listing.location}`,
      tag: `listing-${listing.id}`,
      data: {
        listingId: listing.id,
        url: listing.url,
        searchId: search.id,
        type: 'listing'
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
        }
      ],
      silent: !soundEnabled,
      image: listing.image
    };
    
    return await this.sendLocalNotification(`New Match: ${listing.title}`, options);
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
  
  createInAppNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `toast ${type}`;
    notification.innerHTML = `
      <div class="toast-header">
        <strong>${title}</strong>
        <button type="button" class="toast-close" aria-label="Close">×</button>
      </div>
      <div class="toast-body">${message}</div>
    `;
    
    const container = document.getElementById('toastContainer');
    if (container) {
      container.appendChild(notification);
      
      notification.querySelector('.toast-close').addEventListener('click', () => {
        notification.remove();
      });
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);
    }
    
    return notification;
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