// Your Firebase configuration
// Replace with your Firebase project configuration from the Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAEk2Z6zKtUsq4i4_9mSHm352IkxH1AFtk",
  authDomain: "some-shite.firebaseapp.com",
  databaseURL: "https://some-shite-default-rtdb.firebaseio.com",
  projectId: "some-shite",
  storageBucket: "some-shite.firebasestorage.app",
  messagingSenderId: "219023659434",
  appId: "1:219023659434:web:141e46e8b224bb56585bd3"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();

// Database references for easy access
const dbRefs = {
  players: database.ref('players'),
  teams: database.ref('teams'),
  currentAuction: database.ref('currentAuction'),
  bidHistory: database.ref('bidHistory')
};

// Helper function to generate a simple token
// In a production environment, use a more secure method
function generateToken(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Helper function to extract URL parameters
function getUrlParameter(name) {
  name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
  const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
  const results = regex.exec(location.hash.replace('#', '?'));
  return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

// Check if we have URL parameters for authentication
const teamParam = getUrlParameter('team');
const tokenParam = getUrlParameter('token');

// Reset the database to its initial state (for testing or initialization)
async function resetDatabase() {
  try {
    // Initial auction state
    await dbRefs.currentAuction.set({
      currentPlayerId: null,
      currentBid: 0,
      currentBidder: null,
      bidEndTime: 0,
      status: 'waiting'
    });
    
    // Clear bid history
    await dbRefs.bidHistory.remove();
    
    console.log('Database reset successful');
    return true;
  } catch (error) {
    console.error('Error resetting database:', error);
    return false;
  }
} 