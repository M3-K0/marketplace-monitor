class MarketplaceScraper {
  constructor() {
    this.backendUrl = 'http://localhost:3001';
    this.enableMockData = false; // Disable mock data - use real backend
    this.fallbackToMock = false; // No fallback to mock data
  }
  
  async scrapeMarketplace(searchParams) {
    console.log(`🔍 Starting search for: ${searchParams.keywords}`);
    
    try {
      // Use real backend only
      console.log('🚀 Using Puppeteer backend for real Facebook scraping...');
      const listings = await this.useBackendScraper(searchParams);
      
      if (listings && listings.length > 0) {
        console.log(`✅ Successfully got ${listings.length} real listings from backend`);
        return listings;
      }
      
      console.log('ℹ️ No listings found for this search');
      return [];
      
    } catch (error) {
      console.error('❌ Backend scraping failed:', error);
      throw error;
    }
  }
  
  async useBackendScraper(searchParams) {
    try {
      const response = await fetch(`${this.backendUrl}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams)
      });
      
      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        if (result.error === 'Login required') {
          // Special handling for login required
          console.log('⚠️ Facebook login required in backend browser');
          throw new Error('Please login to Facebook in the backend browser window');
        }
        throw new Error(result.error || 'Backend scraping failed');
      }
      
      return result.listings || [];
      
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Backend server is not running. Please start the backend server on port 3001.');
      }
      throw error;
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  generateId(input = '') {
    const str = input + Date.now() + Math.random();
    return btoa(str).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
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
  
  extractPriceNumber(priceText) {
    if (!priceText) return 0;
    
    const match = priceText.match(/[\d,]+/);
    return match ? parseInt(match[0].replace(/,/g, '')) : 0;
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
}

const marketplaceScraper = new MarketplaceScraper();