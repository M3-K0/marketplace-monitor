class SearchManager {
  constructor() {
    this.isSearching = false;
    this.searchQueue = [];
    this.rateLimitDelay = 60000; // 1 minute between searches
    this.maxRetries = 3;
  }
  
  async performSearch(search) {
    if (this.isSearching) {
      this.searchQueue.push(search);
      return;
    }
    
    this.isSearching = true;
    
    try {
      console.log(`Starting search for: ${search.keywords}`);
      
      const listings = await this.scrapeMarketplace(search);
      const newListings = await this.filterNewListings(listings, search.id);
      
      if (newListings.length > 0) {
        await storage.saveListings(newListings);
        await this.sendNotifications(newListings, search);
        console.log(`Found ${newListings.length} new listings for search: ${search.keywords}`);
      } else {
        console.log(`No new listings found for search: ${search.keywords}`);
      }
      
      await storage.updateSearch(search.id, { 
        lastChecked: Date.now(),
        lastResultCount: newListings.length
      });
      
      return newListings;
    } catch (error) {
      console.error(`Search failed for ${search.keywords}:`, error);
      throw error;
    } finally {
      this.isSearching = false;
      
      if (this.searchQueue.length > 0) {
        const nextSearch = this.searchQueue.shift();
        setTimeout(() => this.performSearch(nextSearch), this.rateLimitDelay);
      }
    }
  }
  
  async scrapeMarketplace(search) {
    const proxyUrl = 'https://api.allorigins.win/raw?url=';
    const marketplaceUrl = this.buildMarketplaceUrl(search);
    const fullUrl = proxyUrl + encodeURIComponent(marketplaceUrl);
    
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        console.log(`Fetching: ${marketplaceUrl} (attempt ${retries + 1})`);
        
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        
        if (this.isBlocked(html)) {
          throw new Error('Request blocked by Facebook');
        }
        
        const listings = this.parseMarketplaceHTML(html, search);
        console.log(`Parsed ${listings.length} listings from HTML`);
        
        return listings;
      } catch (error) {
        console.error(`Scraping attempt ${retries + 1} failed:`, error);
        retries++;
        
        if (retries < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 5000 * retries)); // Exponential backoff
        } else {
          throw error;
        }
      }
    }
    
    return [];
  }
  
  buildMarketplaceUrl(search) {
    const baseUrl = 'https://www.facebook.com/marketplace';
    const location = encodeURIComponent(search.location);
    
    let url = `${baseUrl}/${location}/search`;
    const params = new URLSearchParams();
    
    if (search.keywords) {
      params.append('query', search.keywords);
    }
    
    if (search.minPrice) {
      params.append('minPrice', search.minPrice.toString());
    }
    
    if (search.maxPrice) {
      params.append('maxPrice', search.maxPrice.toString());
    }
    
    if (search.radius) {
      params.append('radius', search.radius.toString());
    }
    
    params.append('daysSinceListed', '1');
    params.append('sortBy', 'creation_time_descend');
    
    const queryString = params.toString();
    if (queryString) {
      url += '?' + queryString;
    }
    
    return url;
  }
  
  isBlocked(html) {
    const blockedIndicators = [
      'blocked',
      'captcha',
      'Please try again',
      'suspicious activity',
      'verification required',
      'rate limit',
      'temporarily unavailable'
    ];
    
    const htmlLower = html.toLowerCase();
    return blockedIndicators.some(indicator => htmlLower.includes(indicator));
  }
  
  parseMarketplaceHTML(html, search) {
    const listings = [];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Multiple selectors to try for listing elements
      const selectors = [
        '[data-testid="marketplace-item"]',
        '.x1i10hfl.x1qjc9v5.xjbqb8w.xjqpnuy.xa49m3k.xqeqjp1.x2hbi6w.x13fuv20.xu3j5b3.x1q0q8m5.x26u7qi.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619.x1ypdohk.xdl72j9.x2lah0s.xe8uvvx.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x2lwn1j.xeuugli.xexx8yu.x4uap5.x18d9i69.xkhd6sd.x1n2onr6.x16tdsg8.x1hl2dhg.xggy1nq.x1ja2u2z.x1t137rt.x1o1ewxj.x3x9cwd.x1e5q0jg.x13rtm0m.x3nfvp2.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.x9f619.x3nfvp2.xdl72j9.x1q0g3np.x87ps6o.x1lku1pv.x1a2a7pz.x6s0dn4.xi81zsa.x78zum5.x1q0g3np.xs83m0k.x1a2a7pz.x1lku1pv.x87ps6o.x9f619.xdl72j9.x3nfvp2.x78zum5.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd',
        '.x1i10hfl',
        'a[href*="/marketplace/item/"]',
        '.marketplace-item',
        '.feed-item'
      ];
      
      let listingElements = [];
      
      for (const selector of selectors) {
        listingElements = doc.querySelectorAll(selector);
        if (listingElements.length > 0) {
          console.log(`Found ${listingElements.length} listings using selector: ${selector}`);
          break;
        }
      }
      
      if (listingElements.length === 0) {
        // Try to find any links that might be listings
        listingElements = doc.querySelectorAll('a[href*="marketplace"]');
        console.log(`Fallback: Found ${listingElements.length} marketplace links`);
      }
      
      listingElements.forEach((element, index) => {
        try {
          const listing = this.extractListingData(element, search, index);
          if (listing && this.matchesSearchCriteria(listing, search)) {
            listings.push(listing);
          }
        } catch (error) {
          console.error(`Error parsing listing element ${index}:`, error);
        }
      });
      
      // If we still don't have listings, try alternative parsing
      if (listings.length === 0) {
        console.log('Trying alternative parsing methods...');
        const alternativeListings = this.parseAlternativeHTML(html, search);
        listings.push(...alternativeListings);
      }
      
    } catch (error) {
      console.error('Error parsing HTML:', error);
    }
    
    return listings;
  }
  
  extractListingData(element, search, index) {
    try {
      // Try multiple methods to extract data
      const titleElement = this.findElement(element, [
        'span[dir="auto"]',
        '.x1lliihq',
        'span',
        '[data-testid="marketplace-item-title"]',
        'h3',
        'h4',
        'a span'
      ]);
      
      const priceElement = this.findElement(element, [
        '[data-testid="marketplace-item-price"]',
        '.x193iq5w',
        'span:contains("$")',
        '.price',
        '[class*="price"]'
      ]);
      
      const imageElement = element.querySelector('img');
      const linkElement = element.querySelector('a') || (element.tagName === 'A' ? element : null);
      
      const title = titleElement ? titleElement.textContent.trim() : `Listing ${index + 1}`;
      const price = priceElement ? priceElement.textContent.trim() : 'Price not available';
      
      if (!title || title.length < 3) {
        return null;
      }
      
      const listing = {
        id: this.generateListingId(linkElement?.href || title),
        title: title,
        price: price,
        image: imageElement?.src || imageElement?.getAttribute('data-src') || '',
        url: this.buildFullUrl(linkElement?.href || ''),
        location: this.extractLocation(element) || search.location,
        timestamp: Date.now(),
        searchId: search.id
      };
      
      return listing;
    } catch (error) {
      console.error('Error extracting listing data:', error);
      return null;
    }
  }
  
  findElement(parent, selectors) {
    for (const selector of selectors) {
      const element = parent.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element;
      }
    }
    return null;
  }
  
  parseAlternativeHTML(html, search) {
    const listings = [];
    
    try {
      // Try to find JSON data in script tags
      const scriptMatch = html.match(/<script[^>]*>[\s\S]*?window\.__additionalDataLoaded[^<]*<\/script>/g);
      
      if (scriptMatch) {
        scriptMatch.forEach(script => {
          try {
            const jsonMatch = script.match(/(\{[\s\S]*\})/);
            if (jsonMatch) {
              const data = JSON.parse(jsonMatch[1]);
              const extractedListings = this.extractListingsFromJSON(data, search);
              listings.push(...extractedListings);
            }
          } catch (error) {
            // Ignore JSON parsing errors
          }
        });
      }
      
      // Try regex patterns for structured data
      const patterns = [
        /"marketplace_listing_title":"([^"]+)"/g,
        /"listing_price":\s*\{\s*"amount":\s*"([^"]+)"/g,
        /"marketplace.*?"title":"([^"]+)"/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(html)) !== null) {
          if (match[1] && match[1].length > 3) {
            const listing = {
              id: this.generateListingId(match[1]),
              title: this.decodeHtml(match[1]),
              price: 'Price not available',
              image: '',
              url: '',
              location: search.location,
              timestamp: Date.now(),
              searchId: search.id
            };
            
            if (this.matchesSearchCriteria(listing, search)) {
              listings.push(listing);
            }
          }
        }
      });
      
    } catch (error) {
      console.error('Error in alternative parsing:', error);
    }
    
    return this.removeDuplicates(listings);
  }
  
  extractListingsFromJSON(data, search) {
    const listings = [];
    
    try {
      const traverse = (obj) => {
        if (typeof obj !== 'object' || obj === null) return;
        
        for (const key in obj) {
          if (key.includes('marketplace') || key.includes('listing')) {
            if (obj[key] && typeof obj[key] === 'object') {
              if (obj[key].title && obj[key].price) {
                const listing = {
                  id: this.generateListingId(obj[key].id || obj[key].title),
                  title: obj[key].title,
                  price: obj[key].price.amount || obj[key].price,
                  image: obj[key].image || '',
                  url: obj[key].url || '',
                  location: obj[key].location || search.location,
                  timestamp: Date.now(),
                  searchId: search.id
                };
                
                if (this.matchesSearchCriteria(listing, search)) {
                  listings.push(listing);
                }
              }
            }
          }
          
          if (typeof obj[key] === 'object') {
            traverse(obj[key]);
          }
        }
      };
      
      traverse(data);
    } catch (error) {
      console.error('Error extracting from JSON:', error);
    }
    
    return listings;
  }
  
  matchesSearchCriteria(listing, search) {
    // Check keywords
    const keywordList = search.keywords.toLowerCase().split(',').map(k => k.trim());
    const titleLower = listing.title.toLowerCase();
    
    const matchesKeywords = keywordList.some(keyword => 
      titleLower.includes(keyword) || keyword.includes(titleLower)
    );
    
    if (!matchesKeywords) {
      return false;
    }
    
    // Check price range if specified
    if (search.minPrice || search.maxPrice) {
      const price = this.extractPriceNumber(listing.price);
      if (price > 0) {
        if (search.minPrice && price < search.minPrice) return false;
        if (search.maxPrice && price > search.maxPrice) return false;
      }
    }
    
    return true;
  }
  
  extractPriceNumber(priceText) {
    if (!priceText) return 0;
    
    const match = priceText.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''));
    }
    
    return 0;
  }
  
  generateListingId(input) {
    const str = input || Math.random().toString();
    return btoa(str).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16) + Date.now().toString(36);
  }
  
  buildFullUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `https://facebook.com${path}`;
    return path;
  }
  
  extractLocation(element) {
    const locationSelectors = [
      '[data-testid="marketplace-item-location"]',
      '.x1i64zmx',
      'span:nth-child(2)',
      '.location'
    ];
    
    for (const selector of locationSelectors) {
      const locationElement = element.querySelector(selector);
      if (locationElement && locationElement.textContent.trim()) {
        return locationElement.textContent.trim();
      }
    }
    
    return null;
  }
  
  decodeHtml(html) {
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }
  
  removeDuplicates(listings) {
    const seen = new Set();
    return listings.filter(listing => {
      const key = `${listing.title}-${listing.price}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  async filterNewListings(listings, searchId) {
    const newListings = [];
    
    for (const listing of listings) {
      const isDuplicate = await storage.isDuplicateListing(listing.id, searchId);
      if (!isDuplicate) {
        newListings.push(listing);
      }
    }
    
    return newListings;
  }
  
  async sendNotifications(listings, search) {
    const notificationsEnabled = await storage.getSetting('enableNotifications', true);
    
    if (!notificationsEnabled || Notification.permission !== 'granted') {
      return;
    }
    
    for (const listing of listings.slice(0, 3)) { // Limit to 3 notifications at once
      try {
        const notification = new Notification(`New Match: ${listing.title}`, {
          body: `${listing.price} • ${listing.location}`,
          icon: '/images/icons/icon-192x192.png',
          badge: '/images/icons/icon-72x72.png',
          tag: `listing-${listing.id}`,
          data: {
            listingId: listing.id,
            url: listing.url,
            searchId: search.id
          },
          requireInteraction: true,
          silent: false
        });
        
        notification.onclick = () => {
          window.focus();
          if (listing.url) {
            window.open(listing.url, '_blank');
          }
          notification.close();
        };
        
        await storage.saveNotification({
          listingId: listing.id,
          title: listing.title,
          message: `${listing.price} • ${listing.location}`,
          searchId: search.id
        });
        
        console.log(`Notification sent for: ${listing.title}`);
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  }
}

const searchManager = new SearchManager();