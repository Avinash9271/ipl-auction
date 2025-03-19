// Main Application Script
document.addEventListener('DOMContentLoaded', function() {
  console.log('IPL Auction System Initializing...');
  
  // Check if Firebase is available
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Please check your internet connection.');
    alert('Could not connect to the auction system. Please check your internet connection and try again.');
    return;
  }
  
  // Application initialization
  try {
    // Initialize modules
    Auth.initialize();
    Admin.initialize();
    Auction.initialize();
    
    // Try to load user from localStorage (if they were previously logged in)
    Auth.loadUser();
    
    // Setup periodic UI updates
    setInterval(() => {
      // Update teams list
      if (Auth.getCurrentUser()) {
        Auction.renderTeamsList();
      }
    }, 30000); // Every 30 seconds
    
    console.log('IPL Auction System Initialized');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
  
  // Add offline detection
  window.addEventListener('online', function() {
    console.log('Back online');
    document.body.classList.remove('offline');
  });
  
  window.addEventListener('offline', function() {
    console.log('Gone offline');
    document.body.classList.add('offline');
    alert('You are offline. Please reconnect to continue participating in the auction.');
  });
}); 