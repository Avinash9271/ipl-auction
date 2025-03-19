// Admin Module
const Admin = (() => {
  // Private variables
  let isInitialized = false;
  let autoNextPlayer = false;
  
  // Initialize admin panel
  function initialize() {
    if (isInitialized) return;
    
    // Set up event listeners
    setupEventListeners();
    
    // Listen for admin login
    document.addEventListener('adminLoggedIn', () => {
      renderAuctionStatus();
    });
    
    // Listen for auction updates
    dbRefs.currentAuction.on('value', (snapshot) => {
      renderAuctionStatus();
      checkTimerExpiration(snapshot.val());
    });
    
    isInitialized = true;
  }
  
  // Set up event listeners
  function setupEventListeners() {
    // Start auction button
    document.getElementById('start-auction').addEventListener('click', startAuction);
    
    // Next player button
    document.getElementById('next-player').addEventListener('click', nextPlayer);
    
    // Reset auction button
    document.getElementById('reset-auction').addEventListener('click', resetAuction);
    
    // Initialize data button
    document.getElementById('init-data').addEventListener('click', initializeData);
    
    // Generate team links button
    document.getElementById('generate-links').addEventListener('click', generateTeamLinks);
  }
  
  // Start the auction
  async function startAuction() {
    try {
      // First, initialize data if needed
      await initializeData();
      
      // Get the first unsold player
      const player = await Players.getNext();
      
      if (!player) {
        alert('No players available for auction');
        return;
      }
      
      // Start the auction for this player
      const success = await Auction.startPlayerAuction(player.id);
      
      if (success) {
        updateAuctionStatus(`Auction started with ${player.name}`);
      } else {
        updateAuctionStatus('Failed to start auction');
      }
    } catch (error) {
      console.error('Error starting auction:', error);
      updateAuctionStatus('Error starting auction');
    }
  }
  
  // Move to the next player
  async function nextPlayer() {
    try {
      // Finalize the current player first if auction is active
      const auctionSnapshot = await dbRefs.currentAuction.once('value');
      const auctionData = auctionSnapshot.val();
      
      if (auctionData.status === 'active') {
        const success = await Auction.finalizePlayerSale();
        
        if (!success) {
          alert('Failed to finalize current player');
          return;
        }
      }
      
      // Get the next unsold player
      const player = await Players.getNext();
      
      if (!player) {
        alert('No more players available for auction');
        updateAuctionStatus('Auction complete - No more players');
        return;
      }
      
      // Start the auction for this player
      const success = await Auction.startPlayerAuction(player.id);
      
      if (success) {
        updateAuctionStatus(`Now auctioning: ${player.name}`);
      } else {
        updateAuctionStatus('Failed to start next player auction');
      }
      
      // Update teams display
      Auction.renderTeamsList();
    } catch (error) {
      console.error('Error moving to next player:', error);
      updateAuctionStatus('Error moving to next player');
    }
  }
  
  // Reset the auction
  async function resetAuction() {
    if (!confirm('Are you sure you want to reset the auction? This will clear all bids and player assignments.')) {
      return;
    }
    
    try {
      // Reset database
      await resetDatabase();
      
      // Reset players status
      const playersSnapshot = await dbRefs.players.once('value');
      const players = playersSnapshot.val();
      
      if (players) {
        const updates = {};
        
        Object.keys(players).forEach(playerId => {
          updates[`${playerId}/status`] = 'unsold';
          updates[`${playerId}/teamId`] = null;
        });
        
        await dbRefs.players.update(updates);
      }
      
      // Reset teams
      const teamsSnapshot = await dbRefs.teams.once('value');
      const teams = teamsSnapshot.val();
      
      if (teams) {
        const updates = {};
        
        Object.keys(teams).forEach(teamId => {
          updates[`${teamId}/players`] = [];
          updates[`${teamId}/budget`] = 8000000; // Reset to initial budget
        });
        
        await dbRefs.teams.update(updates);
      }
      
      updateAuctionStatus('Auction has been reset');
      Auction.renderTeamsList();
    } catch (error) {
      console.error('Error resetting auction:', error);
      updateAuctionStatus('Error resetting auction');
    }
  }
  
  // Initialize data (players and teams)
  async function initializeData() {
    try {
      updateAuctionStatus('Initializing data...');
      
      // Initialize players
      const playersSuccess = await Players.initialize();
      
      // Initialize teams
      const teamsSuccess = await Auction.initializeTeams();
      
      if (playersSuccess && teamsSuccess) {
        updateAuctionStatus('Data initialized successfully');
        return true;
      } else {
        updateAuctionStatus('Error initializing data');
        return false;
      }
    } catch (error) {
      console.error('Error initializing data:', error);
      updateAuctionStatus('Error initializing data');
      return false;
    }
  }
  
  // Generate team links
  async function generateTeamLinks() {
    try {
      const teamLinksContainer = document.getElementById('team-links');
      teamLinksContainer.innerHTML = '<p>Generating team links...</p>';
      
      // Get all teams
      const snapshot = await dbRefs.teams.once('value');
      const teams = snapshot.val();
      
      if (!teams) {
        teamLinksContainer.innerHTML = '<p>No teams found. Please initialize data first.</p>';
        return;
      }
      
      let linksHtml = '';
      
      for (const [teamId, team] of Object.entries(teams)) {
        // Generate a unique link for each team
        const teamLink = Auth.generateTeamLink(teamId, team.name);
        
        linksHtml += `
          <div class="team-link-item">
            <p>${team.name}</p>
            <div class="team-link-url">${teamLink}</div>
          </div>
        `;
      }
      
      teamLinksContainer.innerHTML = linksHtml;
    } catch (error) {
      console.error('Error generating team links:', error);
      document.getElementById('team-links').innerHTML = '<p>Error generating team links</p>';
    }
  }
  
  // Update the auction status display
  function updateAuctionStatus(message) {
    document.getElementById('auction-status').textContent = message;
  }
  
  // Render the current auction status
  async function renderAuctionStatus() {
    try {
      const snapshot = await dbRefs.currentAuction.once('value');
      const auctionData = snapshot.val();
      
      if (!auctionData) {
        updateAuctionStatus('Auction not initialized');
        return;
      }
      
      if (auctionData.status === 'waiting') {
        if (auctionData.currentPlayerId) {
          // Auction is between players
          updateAuctionStatus('Ready for next player');
        } else {
          // Auction hasn't started
          updateAuctionStatus('Auction not started');
        }
      } else if (auctionData.status === 'active') {
        // Get current player
        const player = await Players.getById(auctionData.currentPlayerId);
        
        if (player) {
          const bidAmount = auctionData.currentBid.toLocaleString();
          
          if (auctionData.currentBidder) {
            // Someone has bid
            const teamSnapshot = await dbRefs.teams.child(auctionData.currentBidder).once('value');
            const team = teamSnapshot.val();
            
            if (team) {
              updateAuctionStatus(`Auctioning: ${player.name} - Current bid: ₹${bidAmount} by ${team.name}`);
            } else {
              updateAuctionStatus(`Auctioning: ${player.name} - Current bid: ₹${bidAmount}`);
            }
          } else {
            // No bids yet
            updateAuctionStatus(`Auctioning: ${player.name} - Base price: ₹${bidAmount}`);
          }
        } else {
          updateAuctionStatus('Unknown player being auctioned');
        }
      } else {
        updateAuctionStatus('Unknown auction status');
      }
    } catch (error) {
      console.error('Error rendering auction status:', error);
      updateAuctionStatus('Error getting auction status');
    }
  }
  
  // Check if the timer has expired and handle automatically
  function checkTimerExpiration(auctionData) {
    if (!auctionData || auctionData.status !== 'active') return;
    
    const now = Date.now();
    const endTime = auctionData.bidEndTime;
    
    if (now >= endTime) {
      // Timer has expired, finalize the sale
      setTimeout(() => {
        Auction.finalizePlayerSale().then(success => {
          if (success && autoNextPlayer) {
            // Automatically move to the next player if enabled
            setTimeout(nextPlayer, 5000);
          }
        });
      }, 1000);
    }
  }
  
  // Public methods
  return {
    initialize,
    startAuction,
    nextPlayer,
    resetAuction,
    initializeData,
    generateTeamLinks,
    
    // Toggle auto next player
    setAutoNextPlayer: function(value) {
      autoNextPlayer = value;
    },
    
    getAutoNextPlayer: function() {
      return autoNextPlayer;
    }
  };
})();

// Initialize admin when the DOM is ready
document.addEventListener('DOMContentLoaded', Admin.initialize); 