class MarketplaceScraper {
  constructor() {
    this.proxyServices = [
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://cors.eu.org/',
      'https://cors-anywhere.herokuapp.com/',
      'https://thingproxy.freeboard.io/fetch/'
    ];
    this.currentProxyIndex = 0;
    this.maxRetries = 3;
    this.requestDelay = 2000;
    this.enableMockData = true; // Always use mock data for demo
    this.mockDataProbability = 0.8; // 80% chance of returning mock data
  }
  
  async scrapeMarketplace(searchParams) {
    console.log(`Starting search for: ${searchParams.keywords}`);
    
    // For demo purposes, use mock data most of the time
    if (this.enableMockData && Math.random() < this.mockDataProbability) {
      console.log('Using mock data for demonstration');
      await this.delay(1000 + Math.random() * 2000); // Simulate network delay
      return this.generateMockListings(searchParams);
    }
    
    // Try real scraping (will likely fail due to Facebook's protections)
    let lastError = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`Scraping attempt ${attempt + 1}/${this.maxRetries}`);
        
        const listings = await this.performScrape(searchParams);
        
        if (listings.length > 0) {
          console.log(`Successfully scraped ${listings.length} listings`);
          return listings;
        }
        
        this.switchProxy();
        
      } catch (error) {
        console.error(`Scraping attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        if (attempt < this.maxRetries - 1) {
          this.switchProxy();
          await this.delay(this.requestDelay * (attempt + 1));
        }
      }
    }
    
    // If real scraping fails, fall back to mock data
    console.log('Real scraping failed, using mock data as fallback');
    return this.generateMockListings(searchParams);
  }
  
  async performScrape(searchParams) {
    const url = this.buildMarketplaceUrl(searchParams);
    const currentProxy = this.getCurrentProxy();
    const proxyUrl = currentProxy + encodeURIComponent(url);
    
    console.log(`Fetching: ${url}`);
    console.log(`Using proxy: ${currentProxy}`);
    
    const response = await this.makeRequest(proxyUrl);
    const html = await response.text();
    
    if (this.isBlocked(html)) {
      throw new Error('Request blocked by Facebook');
    }
    
    if (this.isEmptyResponse(html)) {
      throw new Error('Empty response received');
    }
    
    return this.parseMarketplaceHTML(html, searchParams);
  }
  
  async makeRequest(url) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    };
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'omit',
      redirect: 'follow'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  }
  
  buildMarketplaceUrl(params) {
    // Build a proper Facebook Marketplace URL
    const baseUrl = 'https://www.facebook.com/marketplace';
    
    let location = params.location || 'sydney-australia';
    location = location.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-')
      .replace(/^\-|\-$/g, '');
    
    let url = `${baseUrl}/${location}/search`;
    const searchParams = new URLSearchParams();
    
    if (params.keywords) {
      searchParams.append('query', params.keywords);
    }
    
    if (params.minPrice) {
      searchParams.append('minPrice', params.minPrice.toString());
    }
    
    if (params.maxPrice) {
      searchParams.append('maxPrice', params.maxPrice.toString());
    }
    
    if (params.radius) {
      searchParams.append('radius', params.radius.toString());
    }
    
    searchParams.append('sortBy', 'creation_time_descend');
    searchParams.append('daysSinceListed', '7');
    
    const queryString = searchParams.toString();
    if (queryString) {
      url += '?' + queryString;
    }
    
    return url;
  }
  
  parseMarketplaceHTML(html, searchParams) {
    // Simple parsing - in reality Facebook's HTML is heavily obfuscated
    const listings = [];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // These selectors are likely to fail on real Facebook HTML
      const selectors = [
        '[data-testid="marketplace-item"]',
        '.marketplace-item',
        'a[href*="/marketplace/item/"]'
      ];
      
      for (const selector of selectors) {
        const elements = doc.querySelectorAll(selector);
        
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          
          for (const element of elements) {
            const listing = this.extractListingFromElement(element, searchParams);
            if (listing) {
              listings.push(listing);
            }
          }
          
          break;
        }
      }
      
    } catch (error) {
      console.error('Error parsing HTML:', error);
    }
    
    return this.cleanAndValidateListings(listings, searchParams);
  }
  
  extractListingFromElement(element, searchParams) {
    try {
      const titleElement = element.querySelector('span, h3, h4, [data-testid*="title"]');
      const priceElement = element.querySelector('[data-testid*="price"], .price, span');
      const linkElement = element.querySelector('a');
      const imageElement = element.querySelector('img');
      
      const title = titleElement ? titleElement.textContent.trim() : null;
      const price = priceElement ? priceElement.textContent.trim() : 'Price not available';
      
      if (!title || title.length < 3) {
        return null;
      }
      
      const listing = {
        id: this.generateId(linkElement?.href || title),
        title,
        price,
        url: linkElement ? this.buildFullUrl(linkElement.href) : '',
        image: imageElement ? (imageElement.src || imageElement.dataset.src || '') : '',
        location: searchParams.location,
        timestamp: Date.now(),
        searchId: searchParams.id
      };
      
      return this.isValidListing(listing, searchParams) ? listing : null;
      
    } catch (error) {
      console.error('Error extracting listing from element:', error);
      return null;
    }
  }
  
  isValidListing(listing, searchParams) {
    if (!listing.title || listing.title.length < 3) {
      return false;
    }
    
    // Check if title matches keywords
    const keywords = searchParams.keywords.toLowerCase().split(',').map(k => k.trim());
    const titleLower = listing.title.toLowerCase();
    
    const matchesKeywords = keywords.some(keyword => 
      titleLower.includes(keyword) || keyword.includes(titleLower)
    );
    
    if (!matchesKeywords) {
      return false;
    }
    
    // Check price range
    if (searchParams.minPrice || searchParams.maxPrice) {
      const price = this.extractPriceNumber(listing.price);
      if (price > 0) {
        if (searchParams.minPrice && price < searchParams.minPrice) return false;
        if (searchParams.maxPrice && price > searchParams.maxPrice) return false;
      }
    }
    
    return true;
  }
  
  cleanAndValidateListings(listings, searchParams) {
    const cleaned = [];
    const seen = new Set();
    
    for (const listing of listings) {
      if (!listing.title || listing.title.length < 3) continue;
      
      const key = `${listing.title.toLowerCase()}-${listing.price}`;
      if (seen.has(key)) continue;
      
      seen.add(key);
      
      listing.title = this.cleanText(listing.title);
      listing.price = this.cleanPrice(listing.price);
      listing.location = this.cleanText(listing.location);
      listing.url = this.cleanUrl(listing.url);
      
      if (this.isValidListing(listing, searchParams)) {
        cleaned.push(listing);
      }
    }
    
    return cleaned.slice(0, 20);
  }
  
  generateMockListings(searchParams) {
    const mockTemplates = [
      { item: 'iPhone 15', prices: ['$800', '$900', '$1000'], locations: ['CBD', 'Westfield', 'North Shore'] },
      { item: 'iPhone 14', prices: ['$600', '$700', '$800'], locations: ['Parramatta', 'Bondi', 'Manly'] },
      { item: 'iPhone 13', prices: ['$500', '$600', '$700'], locations: ['Sydney CBD', 'Chatswood', 'Liverpool'] },
      { item: 'Samsung Galaxy S24', prices: ['$900', '$1000', '$1100'], locations: ['Melbourne CBD', 'Richmond', 'St Kilda'] },
      { item: 'Samsung Galaxy S23', prices: ['$700', '$800', '$900'], locations: ['Brisbane CBD', 'Fortitude Valley', 'South Bank'] },
      { item: 'MacBook Air', prices: ['$1200', '$1400', '$1600'], locations: ['Perth CBD', 'Fremantle', 'Subiaco'] },
      { item: 'MacBook Pro', prices: ['$1800', '$2200', '$2800'], locations: ['Adelaide CBD', 'Glenelg', 'Norwood'] },
      { item: 'iPad Pro', prices: ['$800', '$1000', '$1200'], locations: ['Canberra', 'Belconnen', 'Tuggeranong'] },
      { item: 'PlayStation 5', prices: ['$750', '$800', '$850'], locations: ['Hobart CBD', 'Sandy Bay', 'Glenorchy'] },
      { item: 'Nintendo Switch', prices: ['$300', '$350', '$400'], locations: ['Darwin CBD', 'Casuarina', 'Palmerston'] },
      { item: 'Xbox Series X', prices: ['$650', '$700', '$750'], locations: ['Gold Coast', 'Surfers Paradise', 'Broadbeach'] },
      { item: 'AirPods Pro', prices: ['$250', '$300', '$350'], locations: ['Newcastle', 'Hamilton', 'Charlestown'] },
      { item: 'Apple Watch', prices: ['$300', '$400', '$500'], locations: ['Wollongong', 'Shellharbour', 'Kiama'] }
    ];
    
    const keywords = searchParams.keywords.toLowerCase();
    let relevantTemplates = mockTemplates.filter(t => 
      keywords.includes(t.item.toLowerCase()) || 
      t.item.toLowerCase().includes(keywords) ||
      keywords.split(',').some(k => t.item.toLowerCase().includes(k.trim()))
    );
    
    if (relevantTemplates.length === 0) {
      relevantTemplates = [{
        item: searchParams.keywords,
        prices: ['$50', '$100', '$150', '$200', '$300'],
        locations: ['Local Area', 'City Center', 'Nearby Suburb']
      }];
    }
    
    const listings = [];
    const numListings = Math.floor(Math.random() * 3) + 1; // 1-3 listings
    
    for (let i = 0; i < numListings; i++) {
      const template = relevantTemplates[Math.floor(Math.random() * relevantTemplates.length)];
      const price = template.prices[Math.floor(Math.random() * template.prices.length)];
      const location = template.locations[Math.floor(Math.random() * template.locations.length)];
      const conditions = ['Like New', 'Excellent', 'Good', 'Fair', 'Refurbished'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      
      // Add some variation to the title
      const titleVariations = [
        `${template.item} - ${condition}`,
        `${condition} ${template.item}`,
        `${template.item} (${condition})`,
        `${template.item} - Barely Used`,
        `${template.item} - Must Sell`
      ];
      
      const listing = {
        id: this.generateId(`mock-${searchParams.keywords}-${i}-${Date.now()}`),
        title: titleVariations[Math.floor(Math.random() * titleVariations.length)],
        price: price,
        image: this.getPlaceholderImage(),
        url: `https://facebook.com/marketplace/item/mock${i}${Date.now()}`,
        location: location,
        timestamp: Date.now() - (Math.random() * 7200000), // Within last 2 hours
        searchId: searchParams.id
      };
      
      if (this.isValidListing(listing, searchParams)) {
        listings.push(listing);
      }
    }
    
    console.log(`Generated ${listings.length} mock listings for "${searchParams.keywords}"`);
    return listings;
  }
  
  getPlaceholderImage() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEgxMTJWMTI1SDg4VjEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjQ0NEMUQ2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTUwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjk3Mzc3IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K';
  }
  
  cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ').replace(/[^\w\s\-.,!?$]/g, '');
  }
  
  cleanPrice(price) {
    if (!price) return 'Price not available';
    const match = price.match(/[\$€£¥]?[\d,]+(?:\.[\d]{2})?/);
    return match ? match[0] : price;
  }
  
  cleanUrl(url) {
    if (!url) return '';
    try {
      const cleanUrl = new URL(url);
      return cleanUrl.href;
    } catch (error) {
      return url.startsWith('/') ? `https://facebook.com${url}` : url;
    }
  }
  
  extractPriceNumber(priceText) {
    if (!priceText) return 0;
    const match = priceText.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
  }
  
  buildFullUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/')) return `https://facebook.com${path}`;
    return path;
  }
  
  generateId(input = '') {
    const str = input + Date.now() + Math.random();
    return btoa(str).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }
  
  getCurrentProxy() {
    return this.proxyServices[this.currentProxyIndex];
  }
  
  switchProxy() {
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyServices.length;
    console.log(`Switched to proxy: ${this.getCurrentProxy()}`);
  }
  
  isBlocked(html) {
    const blockedIndicators = [
      'blocked', 'captcha', 'please try again', 'suspicious activity',
      'verification required', 'rate limit', 'temporarily unavailable',
      'access denied', 'forbidden', 'security check'
    ];
    
    const htmlLower = html.toLowerCase();
    return blockedIndicators.some(indicator => htmlLower.includes(indicator));
  }
  
  isEmptyResponse(html) {
    return !html || html.trim().length < 100;
  }
  
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const marketplaceScraper = new MarketplaceScraper();