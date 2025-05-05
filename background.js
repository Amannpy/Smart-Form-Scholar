// Background script for Smart Form Scholar
// This script runs in the background to handle events and coordinate between the popup and content script

// Initial setup when extension is installed
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
      // Set default settings
      const defaultSettings = {
        autoFill: true,
        aiAssist: true,
        calendarSync: false
      };
      
      // Create sample profiles
      const sampleProfiles = [
        {
          id: 'sample-academic',
          name: 'Academic Profile',
          personal: {
            firstName: 'John',
            lastName: 'Student',
            email: 'john.student@university.edu',
            phone: '555-123-4567'
          },
          academic: {
            university: 'State University',
            studentId: 'S12345678',
            major: 'Computer Science',
            graduationYear: '2026',
            gpa: '3.8'
          }
        }
      ];
      
      // Store initial data
      chrome.storage.sync.set({
        settings: defaultSettings,
        profiles: sampleProfiles
      }, function() {
        console.log('Smart Form Scholar installed with default settings');
      });
      
      // Show welcome page
      chrome.tabs.create({
        url: 'welcome.html'
      });
    }
  });
  
  // Listen for messages from content script or popup
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'openPopup') {
      // This doesn't directly open the popup (not possible through the API)
      // Instead, we'll flash the extension icon to prompt the user to click it
      flashExtensionIcon();
      sendResponse({ success: true });
    }
    
    return true; // Keep the message channel open for asynchronous response
  });
  
  // Function to flash the extension icon
  function flashExtensionIcon() {
    // Create animation frames for the icon
    const frames = [
      { path: '/images/icon_highlight.png' },
      { path: '/images/icon128.png' }
    ];
    
    let frameIndex = 0;
    const interval = setInterval(() => {
      chrome.action.setIcon(frames[frameIndex]);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 500);
    
    // Stop flashing after 3 seconds
    setTimeout(() => {
      clearInterval(interval);
      chrome.action.setIcon({ path: '/images/icon128.png' });
    }, 3000);
  }
  
  // Contextual menu integration
  chrome.contextMenus.create({
    id: 'fillFormHere',
    title: 'Fill form with Smart Form Scholar',
    contexts: ['page'],
    documentUrlPatterns: ['https://docs.google.com/forms/*']
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'fillFormHere') {
      // Get the active profile
      chrome.storage.sync.get(['profiles', 'settings'], function(data) {
        if (data.profiles && data.profiles.length > 0) {
          // Use the first profile by default
          const profile = data.profiles[0];
          const settings = data.settings || { aiAssist: true };
          
          // Send message to content script to fill the form
          chrome.tabs.sendMessage(tab.id, {
            action: 'fillForm',
            profile: profile,
            template: {},
            useAI: settings.aiAssist
          });
        }
      });
    }
  });
  
  // Listen for form detection on Google Forms pages
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('docs.google.com/forms')) {
      // Check if auto-fill is enabled
      chrome.storage.sync.get(['settings'], function(data) {
        const settings = data.settings || { autoFill: false };
        
        if (settings.autoFill) {
          // Send message to content script to detect the form
          chrome.tabs.sendMessage(tabId, { action: 'detectForm' }, (response) => {
            if (response && response.fieldsCount > 0) {
              // Show notification if form is detected
              chrome.notifications.create({
                type: 'basic',
                iconUrl: '/images/icon128.png',
                title: 'Smart Form Scholar',
                message: `Form detected with ${response.fieldsCount} fields. Click the extension to fill it.`
              });
            }
          });
        }
      });
    }
  });