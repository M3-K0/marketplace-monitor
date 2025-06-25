class StorageManager {
  constructor() {
    this.dbName = 'MarketplaceMonitorV2';
    this.dbVersion = 1;
    this.db = new Dexie(this.dbName);
    
    // Use string IDs for listings to match backend
    this.db.version(1).stores({
      searches: '++id, keywords, location, enabled, createdAt',
      listings: 'id, searchId, title, price, url, timestamp, seen, seenAt, hidden, hiddenAt, originalPrice',
      settings: 'key, value',
      notifications: '++id, listingId, timestamp, read',
      savedFilters: '++id, name, filters, createdAt',
      savedItems: '++id, listingId, title, price, url, image, notes, tags, followUpDate, priority, savedAt, status'
    });
    
    this.db.listings.hook('creating', (primKey, obj, trans) => {
      obj.timestamp = obj.timestamp || Date.now();
      obj.seen = obj.seen || false;
      obj.hidden = obj.hidden || false;
      obj.originalPrice = obj.originalPrice || obj.price;
    });
    
    this.db.searches.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = obj.createdAt || Date.now();
      obj.enabled = obj.enabled !== undefined ? obj.enabled : true;
    });
  }
  
  async init() {
    try {
      if (this.db.isOpen()) {
        console.log('Database already open');
        return true;
      }
      
      await this.db.open();
      console.log('Database initialized successfully');
      
      await this.setDefaultSettings();
      await this.cleanupOldData();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      
      if (error.name === 'VersionError' || error.name === 'InvalidStateError' || 
          error.name === 'DatabaseClosedError' || error.message.includes('UpgradeError')) {
        console.log('🔄 Database schema conflict detected, recreating database...');
        try {
          await this.db.delete();
          this.db = new Dexie(this.dbName);
          
          // Recreate with correct schema
          this.db.version(1).stores({
            searches: '++id, keywords, location, enabled, createdAt',
            listings: 'id, searchId, title, price, url, timestamp, seen, seenAt, hidden, hiddenAt, originalPrice',
            settings: 'key, value',
            notifications: '++id, listingId, timestamp, read',
            savedFilters: '++id, name, filters, createdAt'
          });
          
          // Re-add hooks
          this.db.listings.hook('creating', (primKey, obj, trans) => {
            obj.timestamp = obj.timestamp || Date.now();
            obj.seen = obj.seen || false;
          });
          
          this.db.searches.hook('creating', (primKey, obj, trans) => {
            obj.createdAt = obj.createdAt || Date.now();
            obj.enabled = obj.enabled !== undefined ? obj.enabled : true;
          });
          
          await this.db.open();
          await this.setDefaultSettings();
          console.log('✅ Database recreated successfully with new schema');
          return true;
        } catch (recreateError) {
          console.error('❌ Failed to recreate database:', recreateError);
          throw recreateError;
        }
      }
      
      throw error;
    }
  }
  
  async setDefaultSettings() {
    const defaultSettings = {
      activeHours: { start: 8, end: 22 },
      checkInterval: 30,
      enableNotifications: true,
      enableSound: true,
      theme: 'auto',
      maxListings: 1000,
      retentionDays: 7
    };
    
    for (const [key, value] of Object.entries(defaultSettings)) {
      const existing = await this.db.settings.get(key);
      if (!existing) {
        await this.db.settings.put({ key, value });
      }
    }
  }
  
  async cleanupOldData() {
    const retentionDays = await this.getSetting('retentionDays', 7);
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    try {
      const oldListings = await this.db.listings.where('timestamp').below(cutoffTime).toArray();
      const oldNotifications = await this.db.notifications.where('timestamp').below(cutoffTime).toArray();
      
      if (oldListings.length > 0) {
        await this.db.listings.where('timestamp').below(cutoffTime).delete();
      }
      
      if (oldNotifications.length > 0) {
        await this.db.notifications.where('timestamp').below(cutoffTime).delete();
      }
      
      console.log('Old data cleaned up');
    } catch (error) {
      console.warn('Cleanup failed, continuing anyway:', error);
    }
  }
  
  async saveSearch(searchData) {
    try {
      const id = await this.db.searches.add(searchData);
      console.log('Search saved with ID:', id);
      return id;
    } catch (error) {
      console.error('Failed to save search:', error);
      throw error;
    }
  }
  
  async updateSearch(id, updates) {
    try {
      await this.db.searches.update(id, updates);
      console.log('Search updated:', id);
      return true;
    } catch (error) {
      console.error('Failed to update search:', error);
      throw error;
    }
  }
  
  async deleteSearch(id) {
    try {
      await this.db.transaction('rw', this.db.searches, this.db.listings, async () => {
        await this.db.searches.delete(id);
        await this.db.listings.where('searchId').equals(id).delete();
      });
      console.log('Search and related listings deleted:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete search:', error);
      throw error;
    }
  }
  
  async getSearch(id) {
    try {
      return await this.db.searches.get(id);
    } catch (error) {
      console.error('Failed to get search:', error);
      throw error;
    }
  }
  
  async getAllSearches() {
    try {
      return await this.db.searches.orderBy('createdAt').reverse().toArray();
    } catch (error) {
      console.error('Failed to get searches:', error);
      throw error;
    }
  }
  
  async getActiveSearches() {
    try {
      return await this.db.searches.where('enabled').equals(true).toArray();
    } catch (error) {
      console.error('Failed to get active searches:', error);
      throw error;
    }
  }
  
  async saveListing(listingData) {
    try {
      const id = await this.db.listings.add(listingData);
      console.log('Listing saved with ID:', id);
      return id;
    } catch (error) {
      console.error('Failed to save listing:', error);
      throw error;
    }
  }
  
  async saveListings(listings) {
    try {
      console.log(`💾 Attempting to save ${listings.length} listings:`);
      listings.forEach((listing, index) => {
        console.log(`  ${index + 1}. ${listing.title} (ID: ${listing.id}, SearchID: ${listing.searchId})`);
      });
      
      // Process each listing to preserve existing status
      const processedListings = await Promise.all(listings.map(async (newListing) => {
        // Check if listing already exists
        const existingListing = await this.db.listings.where('id').equals(newListing.id).first();
        
        if (existingListing) {
          // Preserve important status fields from existing listing
          const preservedListing = {
            ...newListing,
            seen: existingListing.seen || false,
            seenAt: existingListing.seenAt,
            hidden: existingListing.hidden || false,
            hiddenAt: existingListing.hiddenAt,
            originalPrice: existingListing.originalPrice || newListing.price,
            priceDropDetected: existingListing.priceDropDetected,
            priceDropAt: existingListing.priceDropAt
          };
          
          // Check for price changes
          if (existingListing.price && newListing.price && 
              parseFloat(newListing.price) < parseFloat(existingListing.price)) {
            preservedListing.priceDropDetected = true;
            preservedListing.priceDropAt = Date.now();
            preservedListing.hidden = false; // Unhide on price drop
            preservedListing.hiddenAt = null;
            console.log(`💰 Price drop detected for ${newListing.title}: $${existingListing.price} → $${newListing.price}`);
          }
          
          console.log(`🔄 Updating existing listing: ${newListing.title} (seen: ${preservedListing.seen}, hidden: ${preservedListing.hidden})`);
          return preservedListing;
        } else {
          // New listing, use defaults
          console.log(`✨ New listing: ${newListing.title}`);
          return {
            ...newListing,
            seen: false,
            hidden: false,
            originalPrice: newListing.price
          };
        }
      }));
      
      // Use bulkPut to save all processed listings
      const ids = await this.db.listings.bulkPut(processedListings);
      console.log(`✅ Successfully saved ${ids.length} listings to database`);
      
      // Count hidden vs visible
      const hiddenCount = processedListings.filter(l => l.hidden).length;
      const visibleCount = processedListings.length - hiddenCount;
      console.log(`📊 Status: ${visibleCount} visible, ${hiddenCount} hidden`);
      
      return ids;
    } catch (error) {
      console.error('❌ Failed to save listings:', error);
      throw error;
    }
  }
  
  async updateListing(id, updates) {
    try {
      await this.db.listings.update(id, updates);
      console.log('Listing updated:', id);
      return true;
    } catch (error) {
      console.error('Failed to update listing:', error);
      throw error;
    }
  }
  
  async deleteListing(id) {
    try {
      await this.db.listings.delete(id);
      console.log('Listing deleted:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete listing:', error);
      throw error;
    }
  }
  
  async markListingAsSeen(id) {
    try {
      // Convert to string if it's a number
      const listingId = String(id);
      
      // Get the listing first to store original price
      const listing = await this.db.listings.where('id').equals(listingId).first();
      if (!listing) {
        console.error('Listing not found in database:', listingId);
        throw new Error('Listing not found');
      }
      
      const result = await this.db.listings.update(listingId, {
        seen: true,
        seenAt: Date.now(),
        hidden: true,
        hiddenAt: Date.now(),
        originalPrice: listing.originalPrice || listing.price
      });
      
      if (result === 0) {
        console.warn('No listing updated with ID:', listingId);
        throw new Error('Failed to update listing');
      }
      
      console.log('Listing marked as seen and hidden:', listingId);
      return true;
    } catch (error) {
      console.error('Failed to mark listing as seen:', error);
      throw error;
    }
  }

  async checkForPriceDrops() {
    try {
      const hiddenListings = await this.db.listings.where('hidden').equals(true).toArray();
      let unhiddenCount = 0;
      
      for (const listing of hiddenListings) {
        if (listing.originalPrice && listing.price < listing.originalPrice) {
          // Price dropped, unhide the listing
          await this.db.listings.update(listing.id, {
            hidden: false,
            hiddenAt: null,
            priceDropDetected: true,
            priceDropAt: Date.now()
          });
          console.log(`Price drop detected for listing ${listing.id}: $${listing.originalPrice} → $${listing.price}`);
          unhiddenCount++;
        }
      }
      
      return unhiddenCount;
    } catch (error) {
      console.error('Failed to check for price drops:', error);
      return 0;
    }
  }
  
  async getAllListings(limit = 100) {
    try {
      return await this.db.listings
        .orderBy('timestamp')
        .reverse()
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('Failed to get listings:', error);
      throw error;
    }
  }
  
  async getListingsBySearch(searchId, limit = 50) {
    try {
      // FIXED: Get all listings for search, then sort manually
      const allListings = await this.db.listings
        .where('searchId')
        .equals(searchId)
        .toArray();
      
      return allListings
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to get listings by search:', error);
      throw error;
    }
  }
  
  async getUnseenListings() {
    try {
      return await this.db.listings
        .where('seen')
        .equals(false)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error('Failed to get unseen listings:', error);
      throw error;
    }
  }
  
  async getRecentListings(hours = 24) {
    try {
      const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
      
      // FIXED: Get all listings and filter manually to avoid Dexie query chain issues
      const allListings = await this.db.listings.toArray();
      
      return allListings
        .filter(listing => listing.timestamp > cutoffTime && !listing.hidden)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
    } catch (error) {
      console.error('Failed to get recent listings:', error);
      throw error;
    }
  }
  
  async isDuplicateListing(listingId, searchId) {
    try {
      // FIXED: Simplified to just check by ID
      const existing = await this.db.listings
        .where('id')
        .equals(listingId)
        .first();
      return !!existing;
    } catch (error) {
      console.error('Failed to check for duplicate listing:', error);
      return false;
    }
  }
  
  async getSetting(key, defaultValue = null) {
    try {
      const setting = await this.db.settings.get(key);
      return setting ? setting.value : defaultValue;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return defaultValue;
    }
  }
  
  async setSetting(key, value) {
    try {
      await this.db.settings.put({ key, value });
      console.log('Setting saved:', key);
      return true;
    } catch (error) {
      console.error('Failed to save setting:', error);
      throw error;
    }
  }
  
  async getAllSettings() {
    try {
      const settings = await this.db.settings.toArray();
      return settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});
    } catch (error) {
      console.error('Failed to get all settings:', error);
      throw error;
    }
  }
  
  async getStats() {
    try {
      const [
        totalSearches,
        activeSearches,
        totalListings,
        unseenListings,
        recentListings
      ] = await Promise.all([
        this.db.searches.count(),
        this.db.searches.where('enabled').equals(true).count(),
        this.db.listings.count(),
        this.db.listings.where('seen').equals(false).count(),
        this.getRecentListings(24).then(listings => listings.length)
      ]);
      
      return {
        totalSearches,
        activeSearches,
        totalListings,
        unseenListings,
        recentListings
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      throw error;
    }
  }
  
  async exportData() {
    try {
      const [searches, listings, settings] = await Promise.all([
        this.db.searches.toArray(),
        this.db.listings.toArray(),
        this.db.settings.toArray()
      ]);
      
      const exportData = {
        version: this.dbVersion,
        timestamp: Date.now(),
        searches,
        listings,
        settings
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }
  
  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.version || !data.searches || !data.listings || !data.settings) {
        throw new Error('Invalid data format');
      }
      
      await this.db.transaction('rw', this.db.searches, this.db.listings, this.db.settings, async () => {
        if (data.searches.length > 0) {
          await this.db.searches.bulkPut(data.searches);
        }
        
        if (data.listings.length > 0) {
          await this.db.listings.bulkPut(data.listings);
        }
        
        if (data.settings.length > 0) {
          for (const setting of data.settings) {
            await this.db.settings.put(setting);
          }
        }
      });
      
      console.log('Data imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }
  
  async clearAllData() {
    try {
      await this.db.transaction('rw', this.db.searches, this.db.listings, this.db.settings, this.db.notifications, this.db.savedFilters, async () => {
        await this.db.searches.clear();
        await this.db.listings.clear();
        await this.db.settings.clear();
        await this.db.notifications.clear();
        await this.db.savedFilters.clear();
      });
      
      await this.setDefaultSettings();
      
      console.log('All data cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear data:', error);
      throw error;
    }
  }
  
  async saveNotification(notificationData) {
    try {
      const id = await this.db.notifications.add({
        ...notificationData,
        timestamp: Date.now(),
        read: false
      });
      console.log('Notification saved with ID:', id);
      return id;
    } catch (error) {
      console.error('Failed to save notification:', error);
      throw error;
    }
  }
  
  async markNotificationAsRead(id) {
    try {
      await this.db.notifications.update(id, { read: true });
      console.log('Notification marked as read:', id);
      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }
  
  async getUnreadNotifications() {
    try {
      return await this.db.notifications
        .where('read')
        .equals(false)
        .reverse()
        .sortBy('timestamp');
    } catch (error) {
      console.error('Failed to get unread notifications:', error);
      throw error;
    }
  }
  
  // Saved filter methods
  async saveFilter(filterData) {
    try {
      const id = await this.db.savedFilters.add({
        ...filterData,
        createdAt: Date.now()
      });
      console.log('Filter saved with ID:', id);
      return id;
    } catch (error) {
      console.error('Failed to save filter:', error);
      throw error;
    }
  }
  
  async getSavedFilters() {
    try {
      return await this.db.savedFilters.orderBy('createdAt').reverse().toArray();
    } catch (error) {
      console.error('Failed to get saved filters:', error);
      throw error;
    }
  }
  
  async deleteSavedFilter(id) {
    try {
      await this.db.savedFilters.delete(id);
      console.log('Saved filter deleted:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete saved filter:', error);
      throw error;
    }
  }

  // ===== SAVED ITEMS MANAGEMENT ===== 
  async saveItem(listingData, notes = '', tags = [], priority = 'medium', followUpDate = null) {
    try {
      const savedItem = {
        listingId: listingData.id,
        title: listingData.title,
        price: listingData.price,
        url: listingData.url,
        image: listingData.image,
        notes: notes,
        tags: Array.isArray(tags) ? tags : [],
        followUpDate: followUpDate,
        priority: priority, // 'low', 'medium', 'high', 'urgent'
        savedAt: Date.now(),
        status: 'active' // 'active', 'contacted', 'purchased', 'archived'
      };

      const id = await this.db.savedItems.add(savedItem);
      console.log('Item saved with ID:', id);
      return id;
    } catch (error) {
      console.error('Failed to save item:', error);
      throw error;
    }
  }

  async getSavedItems(status = null) {
    try {
      let query = this.db.savedItems.orderBy('savedAt').reverse();
      
      if (status) {
        query = query.filter(item => item.status === status);
      }
      
      return await query.toArray();
    } catch (error) {
      console.error('Failed to get saved items:', error);
      return [];
    }
  }

  async updateSavedItem(id, updates) {
    try {
      await this.db.savedItems.update(id, {
        ...updates,
        updatedAt: Date.now()
      });
      console.log('Saved item updated:', id);
      return true;
    } catch (error) {
      console.error('Failed to update saved item:', error);
      throw error;
    }
  }

  async deleteSavedItem(id) {
    try {
      await this.db.savedItems.delete(id);
      console.log('Saved item deleted:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete saved item:', error);
      throw error;
    }
  }

  async isItemSaved(listingId) {
    try {
      const savedItem = await this.db.savedItems
        .where('listingId')
        .equals(listingId)
        .first();
      return !!savedItem;
    } catch (error) {
      console.error('Failed to check if item is saved:', error);
      return false;
    }
  }

  async getSavedItemsByTag(tag) {
    try {
      return await this.db.savedItems
        .filter(item => item.tags.includes(tag))
        .toArray();
    } catch (error) {
      console.error('Failed to get saved items by tag:', error);
      return [];
    }
  }

  async getSavedItemsDueForFollowUp() {
    try {
      const now = Date.now();
      return await this.db.savedItems
        .filter(item => item.followUpDate && item.followUpDate <= now && item.status === 'active')
        .toArray();
    } catch (error) {
      console.error('Failed to get items due for follow-up:', error);
      return [];
    }
  }
}

const storage = new StorageManager();