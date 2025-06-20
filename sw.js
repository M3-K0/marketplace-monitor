const CACHE_NAME = 'marketplace-monitor-v1';
const urlsToCache = [
  './',
  './index.html',
  './css/styles.css',
  './css/components.css',
  './js/app.js',
  './js/search.js',
  './js/notifications.js',
  './js/storage.js',
  './js/scraper.js',
  './manifest.json',
  'https://unpkg.com/dexie@3.2.4/dist/dexie.js'
];

const MONITORING_INTERVAL = 30 * 60 * 1000; // 30 minutes
const ACTIVE_HOURS = {
  start: 8, // 8 AM
  end: 22   // 10 PM
};

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache.map(url => new Request(url, {cache: 'reload'})));
      })
      .catch(error => {
        console.error('Failed to cache resources:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  // Only handle same-origin requests and skip external resources
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request).catch(() => {
            // Return a fallback response for offline scenarios
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
        })
    );
  }
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  const data = event.notification.data || {};
  
  if (event.action === 'mark-seen') {
    event.waitUntil(markListingAsSeen(data.listingId));
  } else if (event.action === 'open-listing') {
    event.waitUntil(
      clients.openWindow(data.url || './')
    );
  } else {
    event.waitUntil(
      clients.matchAll().then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('./');
      })
    );
  }
});

self.addEventListener('push', event => {
  console.log('Push event received:', event);
  
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body,
        icon: './images/icons/icon-192x192.png',
        badge: './images/icons/icon-72x72.png',
        tag: data.tag || 'marketplace-notification',
        data: data.data || {},
        actions: [
          {
            action: 'open-listing',
            title: 'View Listing'
          },
          {
            action: 'mark-seen',
            title: 'Mark as Seen'
          }
        ],
        requireInteraction: true,
        silent: false
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      );
    } catch (error) {
      console.error('Error processing push event:', error);
    }
  }
});

async function performBackgroundSync() {
  try {
    console.log('Starting background sync...');
    
    if (!isWithinActiveHours()) {
      console.log('Outside active hours, skipping sync');
      return;
    }
    
    const searches = await getActiveSearches();
    if (!searches.length) {
      console.log('No active searches found');
      return;
    }
    
    for (const search of searches) {
      try {
        await processSearch(search);
        // Add delay between searches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 60000));
      } catch (error) {
        console.error(`Error processing search ${search.id}:`, error);
      }
    }
    
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

function isWithinActiveHours() {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= ACTIVE_HOURS.start && currentHour < ACTIVE_HOURS.end;
}

async function getActiveSearches() {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('MarketplaceMonitor', 1);
      
      request.onerror = () => {
        console.error('Failed to open database for background sync');
        resolve([]);
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['searches'], 'readonly');
        const store = transaction.objectStore('searches');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => {
          const searches = getAllRequest.result.filter(search => search.enabled);
          resolve(searches);
        };
        
        getAllRequest.onerror = () => {
          console.error('Failed to get searches from database');
          resolve([]);
        };
      };
    } catch (error) {
      console.error('Error accessing database:', error);
      resolve([]);
    }
  });
}

async function processSearch(search) {
  try {
    console.log(`Processing search: ${search.keywords}`);
    
    // In a real implementation, this would scrape Facebook Marketplace
    // For demo purposes, we'll generate mock listings occasionally
    const shouldGenerateMock = Math.random() < 0.1; // 10% chance
    
    if (shouldGenerateMock) {
      const mockListings = generateMockListings(search);
      
      if (mockListings.length > 0) {
        await storeListings(mockListings);
        await sendNotifications(mockListings, search);
        console.log(`Generated ${mockListings.length} mock listings for search: ${search.keywords}`);
      }
    }
    
    // Update last checked time
    await updateSearchLastChecked(search.id);
    
  } catch (error) {
    console.error('Error processing search:', error);
  }
}

function generateMockListings(search) {
  const mockTemplates = [
    { item: 'iPhone 15', prices: ['$800', '$900', '$1000'], locations: ['CBD', 'Westfield', 'North Shore'] },
    { item: 'Samsung Galaxy S24', prices: ['$700', '$800', '$900'], locations: ['City Center', 'Mall Area', 'Suburbs'] },
    { item: 'MacBook Pro', prices: ['$1800', '$2200', '$2500'], locations: ['Tech District', 'University Area', 'Downtown'] }
  ];
  
  const keywords = search.keywords.toLowerCase();
  let relevantTemplate = mockTemplates.find(t => keywords.includes(t.item.toLowerCase()));
  
  if (!relevantTemplate) {
    relevantTemplate = {
      item: search.keywords,
      prices: ['$50', '$100', '$200'],
      locations: ['Local Area', 'City Center', 'Nearby']
    };
  }
  
  const listings = [];
  const numListings = Math.floor(Math.random() * 2) + 1; // 1-2 listings
  
  for (let i = 0; i < numListings; i++) {
    const price = relevantTemplate.prices[Math.floor(Math.random() * relevantTemplate.prices.length)];
    const location = relevantTemplate.locations[Math.floor(Math.random() * relevantTemplate.locations.length)];
    
    const listing = {
      id: generateListingId(`${search.keywords}-${Date.now()}-${i}`),
      title: `${relevantTemplate.item} - Good Condition`,
      price: price,
      image: '',
      url: `https://facebook.com/marketplace/item/bg${Date.now()}${i}`,
      location: location,
      timestamp: Date.now(),
      searchId: search.id,
      seen: false
    };
    
    listings.push(listing);
  }
  
  return listings;
}

function generateListingId(input) {
  return btoa(input).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16) + Date.now().toString(36);
}

async function storeListings(listings) {
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open('MarketplaceMonitor', 1);
      
      request.onerror = () => {
        console.error('Failed to open database for storing listings');
        resolve();
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['listings'], 'readwrite');
        const store = transaction.objectStore('listings');
        
        listings.forEach(listing => {
          try {
            store.add(listing);
          } catch (error) {
            console.error('Failed to add listing:', error);
          }
        });
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => {
          console.error('Transaction failed when storing listings');
          resolve();
        };
      };
    } catch (error) {
      console.error('Error storing listings:', error);
      resolve();
    }
  });
}

async function updateSearchLastChecked(searchId) {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('MarketplaceMonitor', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['searches'], 'readwrite');
        const store = transaction.objectStore('searches');
        const getRequest = store.get(searchId);
        
        getRequest.onsuccess = () => {
          const search = getRequest.result;
          if (search) {
            search.lastChecked = Date.now();
            store.put(search);
          }
        };
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      };
      
      request.onerror = () => resolve();
    } catch (error) {
      console.error('Error updating search last checked:', error);
      resolve();
    }
  });
}

async function sendNotifications(listings, search) {
  if (!self.registration || !self.registration.showNotification) {
    console.log('Notifications not supported in this context');
    return;
  }
  
  try {
    for (const listing of listings.slice(0, 3)) { // Limit to 3 notifications
      const notification = {
        title: `New Match: ${listing.title}`,
        body: `${listing.price} • ${listing.location}`,
        tag: `listing-${listing.id}`,
        data: {
          listingId: listing.id,
          url: listing.url,
          searchId: search.id
        }
      };
      
      await self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: './images/icons/icon-192x192.png',
        badge: './images/icons/icon-72x72.png',
        tag: notification.tag,
        data: notification.data,
        actions: [
          {
            action: 'open-listing',
            title: 'View Listing'
          },
          {
            action: 'mark-seen',
            title: 'Mark as Seen'
          }
        ],
        requireInteraction: true,
        silent: false
      });
      
      console.log(`Notification sent for: ${listing.title}`);
    }
  } catch (error) {
    console.error('Failed to send notifications:', error);
  }
}

async function markListingAsSeen(listingId) {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('MarketplaceMonitor', 1);
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['listings'], 'readwrite');
        const store = transaction.objectStore('listings');
        const getRequest = store.get(listingId);
        
        getRequest.onsuccess = () => {
          const listing = getRequest.result;
          if (listing) {
            listing.seen = true;
            listing.seenAt = Date.now();
            store.put(listing);
          }
        };
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      };
      
      request.onerror = () => resolve();
    } catch (error) {
      console.error('Error marking listing as seen:', error);
      resolve();
    }
  });
}

// Periodic background sync registration
if (self.registration && self.registration.sync) {
  setInterval(() => {
    self.registration.sync.register('background-sync');
  }, MONITORING_INTERVAL);
}