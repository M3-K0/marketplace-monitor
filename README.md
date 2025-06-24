# 🛒 Marketplace Monitor - Intelligent Facebook Marketplace Tracker

n/a

A sophisticated Progressive Web App that automatically monitors Facebook Marketplace for listings based on your custom searches. Features intelligent filtering, automatic scheduling, and mobile-first design.

## 🚀 Live Demo

**📱 Mobile App**: n/a

*Optimized for mobile devices - works best on phones and tablets*

## ✨ Key Features

### 🔄 Automatic Search Scheduling
- **Configurable Intervals**: 5, 10, 15, 20, 30, 60 minutes, or manual only
- **Active Hours**: Set quiet times (default: 8 AM - 10 PM)
- **Real-time Status**: Dashboard shows current automatic search interval
- **Instant Updates**: Settings changes apply immediately without restart

### 🧠 Smart Filtering System
- **Auto-Category Detection**: Automatically categorizes listings (Electronics, Furniture, Vehicles, Clothing)
- **Price Range Filtering**: Set minimum and maximum price limits
- **Status Filtering**: Filter by new listings, price drops, or already seen items
- **Saved Filters**: Create, name, and reuse custom filter combinations

### 🎯 Advanced Search Management
- **Duplicate Prevention**: Manual searches filter out existing listings
- **Hidden Status Persistence**: Hidden items stay hidden during refresh
- **Fresh Data Updates**: Preserves user actions while updating listing information
- **Search History**: Track and manage multiple search queries

### 📱 Mobile-First Design
- **Progressive Web App**: Install on home screen for app-like experience
- **Touch Optimized**: All controls designed for mobile interaction
- **Offline Capable**: Core functionality works without internet
- **Responsive Layout**: Adapts to all screen sizes

### 🔔 Smart Notifications
- **Price Drop Alerts**: Get notified when prices decrease
- **New Listing Alerts**: Instant notifications for matching items
- **Customizable Settings**: Control notification frequency and types

## 🛠️ Technical Architecture

### Frontend Stack
- **Vanilla JavaScript**: No framework dependencies for maximum performance
- **Progressive Web App**: Service worker, manifest, offline support
- **IndexedDB Storage**: Client-side data persistence with Dexie.js
- **CSS Grid/Flexbox**: Modern responsive layout
- **Web Workers**: Background processing for search operations

### Backend Integration
- **Real Facebook Scraping**: Node.js + Puppeteer backend for live data
- **Proxy Support**: Handles cross-origin requests
- **Rate Limiting**: Intelligent delays to avoid blocking
- **Error Recovery**: Robust error handling and retry logic

### Data Management
- **Local Storage**: All data stored locally for privacy
- **Export/Import**: Backup and restore functionality
- **Data Validation**: Input sanitization and validation
- **Schema Versioning**: Seamless database migrations

## 📖 Usage Guide

### Getting Started

1. **Open the App**: Visit the live demo URL on your mobile device
2. **Add to Home Screen**: Use browser's "Add to Home Screen" for app experience
3. **Create First Search**: 
   - Tap "Add Search" button
   - Enter keywords (e.g., "iPhone 15", "MacBook Pro", "dining table")
   - Save your search
4. **Configure Automatic Searches**:
   - Tap the settings gear icon
   - Select your preferred interval from the "Check Interval" dropdown
   - Set active monitoring hours
   - Save settings

### Search Management

#### Creating Searches
```
Keywords: iPhone 15 Pro, MacBook Air, gaming chair
Location: Automatically set to Hillbank, SA (20km radius)
Price Range: Optional minimum and maximum limits
```

#### Running Searches
- **Manual**: Click the play button on any search card
- **Automatic**: Configure interval in settings for hands-free monitoring
- **Batch**: Use "Run All Searches" to execute all active searches

#### Managing Results
- **View Listings**: Browse results in the main feed
- **Mark as Seen**: Hide listings you've already reviewed
- **Filter Results**: Use smart filters to refine what you see
- **Save Filters**: Create reusable filter combinations

### Smart Filtering

#### Category Filters
- **Electronics**: Phones, laptops, gaming, cameras, etc.
- **Furniture**: Tables, chairs, beds, storage, etc.
- **Vehicles**: Cars, motorcycles, parts, accessories, etc.
- **Clothing**: Shirts, shoes, jackets, accessories, etc.

#### Status Filters
- **New**: Listings you haven't seen before
- **Price Drops**: Items with reduced prices
- **Already Seen**: Previously viewed or hidden listings

#### Price Filters
- **Minimum Price**: Filter out items below a certain amount
- **Maximum Price**: Filter out expensive items
- **Smart Detection**: Automatically parses various price formats

### Settings Configuration

#### Automatic Search Settings
```javascript
Check Interval Options:
- Manual only (no automatic searches)
- Every 5 minutes (⚡ intensive monitoring)
- Every 10 minutes
- Every 15 minutes  
- Every 20 minutes
- Every 30 minutes (⭐ recommended)
- Every hour (📅 light monitoring)
```

#### Active Hours
```javascript
Default: 8:00 AM - 10:00 PM
Customizable: Set your preferred monitoring window
Respect Quiet Hours: No searches during off-hours
```

## 🔧 Installation & Setup

### Mobile Installation (Recommended)

1. **Open in Mobile Browser**: Visit the live demo URL
2. **Install as PWA**: 
   - **iOS Safari**: Tap Share → Add to Home Screen
   - **Android Chrome**: Tap Menu → Add to Home Screen
3. **Launch**: Tap the app icon on your home screen
4. **Configure**: Set up automatic search intervals in settings

### Local Development

```bash
# Clone the repository
git clone https://github.com/M3-K0/marketplace-monitor.git
cd marketplace-monitor

# Serve locally (any HTTP server)
npx http-server . -p 8080
# or
python -m http.server 8080

# Open in browser
open http://localhost:8080
```

### Backend Setup (Optional - for real Facebook scraping)

```bash
# Clone backend repository
git clone https://github.com/M3-K0/marketplace-monitor-backend.git
cd marketplace-monitor-backend

# Install dependencies
npm install

# Install Chrome for Puppeteer
npx playwright install chromium

# Start backend server
npm start
# Backend runs on http://localhost:3001
```

## 🏗️ Project Structure

```
marketplace-monitor/
├── index.html              # Main PWA shell
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker
├── css/
│   ├── styles.css          # Main stylesheet
│   ├── components.css      # Component styles
│   └── design-system.css   # Design tokens
├── js/
│   ├── app.js              # Main application logic
│   ├── storage.js          # IndexedDB management
│   ├── search.js           # Search functionality
│   ├── scraper.js          # Frontend scraping logic
│   └── notifications.js    # Notification system
└── README.md               # This file
```

## 📊 Performance & Features

### Performance Metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 500KB (uncompressed)
- **Offline Support**: 100% core functionality
- **Mobile Performance**: Optimized for 3G networks

### PWA Features
- ✅ **App Install Prompt**: Add to home screen
- ✅ **Offline Functionality**: Works without internet
- ✅ **Background Sync**: Automatic updates when online
- ✅ **Push Notifications**: Real-time alerts
- ✅ **Responsive Design**: All screen sizes supported
- ✅ **Fast Loading**: Aggressive caching strategy

### Browser Compatibility
- ✅ **Chrome**: Full support (recommended)
- ✅ **Firefox**: Full support
- ✅ **Safari**: Full support (iOS/macOS)
- ✅ **Edge**: Full support
- ⚠️ **IE**: Basic functionality only

## 🔒 Privacy & Security

### Data Privacy
- **Local Storage Only**: All data stored on your device
- **No User Tracking**: No analytics or tracking scripts
- **No Data Collection**: No personal information stored
- **Export Control**: Full control over your data

### Security Features
- **HTTPS Only**: Secure connections required
- **Content Security Policy**: XSS protection
- **Input Sanitization**: Prevents code injection
- **Local Processing**: No data sent to external servers

## 🚨 Troubleshooting

### Common Issues

#### App Not Loading
```javascript
// Check browser console for errors
// Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
// Clear browser cache and try again
```

#### Automatic Searches Not Working
1. Check settings: Ensure interval is not set to "Manual only"
2. Verify active hours: Make sure current time is within monitoring window
3. Check browser console: Look for any JavaScript errors
4. Restart app: Close and reopen the PWA

#### Settings Not Saving
1. Check storage permissions: Ensure browser allows local storage
2. Clear browser data: Reset and reconfigure settings
3. Check incognito mode: Settings don't persist in private browsing

#### Mobile Installation Issues
1. **iOS**: Use Safari browser, not Chrome
2. **Android**: Ensure Chrome is updated to latest version
3. **PWA Criteria**: App must be served over HTTPS

### Debug Commands

Open browser console and run:

```javascript
// Check app status
console.log('App instance:', window.app);

// Check storage
storage.getAllSettings().then(console.log);

// Check listings
storage.getRecentListings(10).then(console.log);

// Test automatic search status
console.log('Timer active:', !!window.app.automaticSearchTimer);
console.log('Interval:', window.app.automaticSearchInterval, 'minutes');
```

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes**: Follow existing code style
4. **Test thoroughly**: Ensure all features work
5. **Commit changes**: `git commit -m 'Add amazing feature'`
6. **Push to branch**: `git push origin feature/amazing-feature`
7. **Open Pull Request**: Describe your changes

### Code Style

- **JavaScript**: ES6+ features, async/await preferred
- **CSS**: Mobile-first, use CSS custom properties
- **HTML**: Semantic markup, accessibility considered
- **Comments**: Document complex logic and APIs

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Facebook Marketplace**: Data source for listings
- **Puppeteer**: Web scraping framework
- **Dexie.js**: IndexedDB wrapper library
- **Vercel**: Hosting and deployment platform

## 📧 Support

For support, feature requests, or bug reports:

1. **GitHub Issues**: [Create an issue](https://github.com/M3-K0/marketplace-monitor/issues)
2. **Documentation**: Check this README and inline code comments
3. **Debug Tools**: Use browser console debug commands above

---


*Last updated: June 2025*
