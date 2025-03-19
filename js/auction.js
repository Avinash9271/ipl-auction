// Auction Module
const Auction = (() => {
  // Private variables
  let currentPlayer = null;
  let currentBid = 0;
  let currentBidder = null;
  let timerInterval = null;
  let timeLeft = 30; // seconds
  let minBidIncrement = 100000; // Minimum bid increment (₹1,00,000)
  let isAuctionActive = false;

  // Initialize auction module
  function initialize() {
    initEventListeners();
    initializeAuctionData();
    console.log('Auction module initialized');
  }

  // Initialize auction event listeners
  function initEventListeners() {
    // Bid button
    document.getElementById('bid-button').addEventListener('click', handleBid);
    
    // Listen for Firebase auction updates
    dbRefs.currentAuction.on('value', handleAuctionUpdate);
    
    // Team logged in event
    document.addEventListener('teamLoggedIn', () => {
      updateBidButtonState();
    });
  }

  // Initialize auction data
  async function initializeAuctionData() {
    try {
      // Initialize auction state if it doesn't exist
      const snapshot = await dbRefs.currentAuction.once('value');
      if (!snapshot.exists()) {
        await dbRefs.currentAuction.set({
          currentPlayerId: null,
          currentBid: 0,
          currentBidder: null,
          bidEndTime: 0,
          status: 'waiting'
        });
      }
      
      console.log('Auction data initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing auction data:', error);
      return false;
    }
  }

  // Handle auction data updates from Firebase
  function handleAuctionUpdate(snapshot) {
    const auctionData = snapshot.val();
    
    if (!auctionData) return;
    
    // Update local state
    if (auctionData.currentPlayerId !== null && (!currentPlayer || currentPlayer.id !== auctionData.currentPlayerId)) {
      // Player has changed, fetch the new player
      Players.getById(auctionData.currentPlayerId).then(player => {
        if (player) {
          currentPlayer = player;
          Players.renderCard(player);
          currentBid = auctionData.currentBid || player.basePrice;
          updateBidUI();
        }
      });
    } else {
      // Only bid has changed
      currentBid = auctionData.currentBid || 0;
      currentBidder = auctionData.currentBidder || null;
      updateBidUI();
    }
    
    // Update timer
    if (auctionData.bidEndTime) {
      const now = Date.now();
      const endTime = auctionData.bidEndTime;
      timeLeft = Math.max(0, Math.floor((endTime - now) / 1000));
      
      // Only start timer if we don't have one running
      if (!timerInterval && timeLeft > 0) {
        startTimer();
      }
    }
    
    // Update auction status
    isAuctionActive = auctionData.status === 'active';
    updateBidButtonState();
  }

  // Update the bid UI elements
  function updateBidUI() {
    // Update bid amount display
    document.getElementById('current-bid-amount').textContent = `₹${currentBid.toLocaleString()}`;
    
    // Update bidder information
    const bidderElement = document.getElementById('current-bidder');
    
    if (currentBidder) {
      // Get team name from Firebase
      dbRefs.teams.child(currentBidder).once('value', snapshot => {
        const team = snapshot.val();
        if (team) {
          bidderElement.textContent = `Current Bidder: ${team.name}`;
        } else {
          bidderElement.textContent = 'Current Bidder: Unknown';
        }
      });
    } else {
      bidderElement.textContent = 'No bids yet';
    }
    
    // Update bid button text
    const nextBidAmount = currentBid + minBidIncrement;
    document.getElementById('bid-button').textContent = `Place Bid (₹${nextBidAmount.toLocaleString()})`;
    
    // Update bid button state
    updateBidButtonState();
  }

  // Update the state of the bid button based on user's budget and current bid
  function updateBidButtonState() {
    const bidButton = document.getElementById('bid-button');
    const nextBidAmount = currentBid + minBidIncrement;
    const user = Auth.getCurrentUser();
    
    // Disable button in these scenarios:
    // 1. User is not logged in
    // 2. User is admin
    // 3. User doesn't have enough budget
    // 4. User is already the highest bidder
    // 5. Auction is not active
    
    if (!user || 
        user.role === 'admin' || 
        user.budget < nextBidAmount || 
        (currentBidder && currentBidder === user.id) ||
        !isAuctionActive) {
      bidButton.disabled = true;
    } else {
      bidButton.disabled = false;
    }
  }

  // Handle bid button click
  function handleBid() {
    const user = Auth.getCurrentUser();
    
    if (!user || user.role !== 'team') {
      console.error('Not logged in as a team');
      return;
    }
    
    if (!currentPlayer) {
      console.error('No active player to bid on');
      return;
    }
    
    const nextBidAmount = currentBid + minBidIncrement;
    
    if (user.budget < nextBidAmount) {
      alert('You do not have enough budget for this bid');
      return;
    }
    
    // Place bid in Firebase
    placeBid(user.id, nextBidAmount);
  }

  // Place a bid in Firebase
  async function placeBid(teamId, amount) {
    if (!currentPlayer || !isAuctionActive) return;
    
    try {
      // Calculate new end time (30 seconds from now)
      const bidEndTime = Date.now() + (30 * 1000);
      
      // Update current auction
      await dbRefs.currentAuction.update({
        currentBid: amount,
        currentBidder: teamId,
        bidEndTime: bidEndTime
      });
      
      // Add to bid history
      const bidKey = dbRefs.bidHistory.child(currentPlayer.id).push().key;
      
      await dbRefs.bidHistory.child(currentPlayer.id).child(bidKey).set({
        teamId: teamId,
        amount: amount,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      console.log('Bid placed successfully');
    } catch (error) {
      console.error('Error placing bid:', error);
      alert('There was an error placing your bid. Please try again.');
    }
  }

  // Start the countdown timer
  function startTimer() {
    // Clear any existing timer
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    
    // Update the timer display
    updateTimerDisplay();
    
    // Start a new interval
    timerInterval = setInterval(() => {
      timeLeft -= 1;
      
      // Update the display
      updateTimerDisplay();
      
      // Check if timer has expired
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        
        // Handle bid completion
        handleBidCompletion();
      }
    }, 1000);
  }

  // Update the timer display
  function updateTimerDisplay() {
    document.getElementById('timer').textContent = timeLeft;
  }

  // Handle bid completion when timer expires
  function handleBidCompletion() {
    // This will be handled by the admin module
    // which listens for bid completions and finalizes the sale
    console.log('Bid timer expired');
  }

  // Start the auction for a player
  async function startPlayerAuction(playerId) {
    try {
      // Get the player
      const player = await Players.getById(playerId);
      
      if (!player) {
        console.error('Player not found');
        return false;
      }
      
      currentPlayer = player;
      currentBid = player.basePrice;
      currentBidder = null;
      
      // Calculate bid end time (30 seconds from now)
      const bidEndTime = Date.now() + (30 * 1000);
      
      // Update Firebase
      await dbRefs.currentAuction.set({
        currentPlayerId: player.id,
        currentBid: player.basePrice,
        currentBidder: null,
        bidEndTime: bidEndTime,
        status: 'active'
      });
      
      // Start the timer
      timeLeft = 30;
      startTimer();
      
      return true;
    } catch (error) {
      console.error('Error starting player auction:', error);
      return false;
    }
  }

  // Finalize player sale
  async function finalizePlayerSale() {
    if (!currentPlayer || !isAuctionActive) return false;
    
    try {
      if (currentBidder) {
        // Player is sold
        
        // Update player status
        await Players.updateStatus(currentPlayer.id, 'sold', currentBidder);
        
        // Update team data
        const teamSnapshot = await dbRefs.teams.child(currentBidder).once('value');
        const teamData = teamSnapshot.val();
        
        if (!teamData) {
          console.error('Team not found');
          return false;
        }
        
        // Update team players and budget
        const players = teamData.players || [];
        players.push(currentPlayer.id);
        
        const newBudget = teamData.budget - currentBid;
        
        await dbRefs.teams.child(currentBidder).update({
          players: players,
          budget: newBudget
        });
        
        console.log(`Player ${currentPlayer.name} sold to team ${teamData.name} for ₹${currentBid.toLocaleString()}`);
      } else {
        // Player is unsold
        console.log(`Player ${currentPlayer.name} unsold`);
      }
      
      // Update auction status
      await dbRefs.currentAuction.update({
        status: 'waiting'
      });
      
      return true;
    } catch (error) {
      console.error('Error finalizing player sale:', error);
      return false;
    }
  }

  // Render the teams list
  async function renderTeamsList() {
    try {
      const teamsListElement = document.getElementById('teams-list');
      teamsListElement.innerHTML = '';
      
      const snapshot = await dbRefs.teams.once('value');
      const teams = snapshot.val();
      
      for (const [teamId, team] of Object.entries(teams)) {
        const teamCard = document.createElement('div');
        teamCard.className = 'team-card';
        
        const playerCount = team.players ? team.players.length : 0;
        
        teamCard.innerHTML = `
          <div class="team-header">
            <div class="team-name">${team.name}</div>
            <div class="team-budget">₹${team.budget.toLocaleString()}</div>
          </div>
          <div class="team-players">
            ${playerCount} player${playerCount !== 1 ? 's' : ''} acquired
          </div>
        `;
        
        teamsListElement.appendChild(teamCard);
      }
    } catch (error) {
      console.error('Error rendering teams list:', error);
    }
  }

  // Initialize teams
  async function initializeTeams() {
    try {
      // Check if teams already exist
      const snapshot = await dbRefs.teams.once('value');
      
      if (snapshot.exists() && Object.keys(snapshot.val()).length >= 10) {
        console.log('Teams already initialized');
        return true;
      }
      
      // Create 10 teams
      const teams = {};
      
      for (let i = 1; i <= 10; i++) {
        const teamId = `team${i}`;
        
        teams[teamId] = {
          name: `Team ${i}`,
          owner: `Friend ${i}`,
          budget: 8000000, // ₹80,00,000 (80 Lakhs)
          players: [],
          password: `team${i}123` // Simple password for demo
        };
      }
      
      await dbRefs.teams.set(teams);
      console.log('Teams initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing teams:', error);
      return false;
    }
  }

  // Public methods
  return {
    initialize: initialize,
    startPlayerAuction: startPlayerAuction,
    finalizePlayerSale: finalizePlayerSale,
    renderTeamsList: renderTeamsList,
    initializeTeams: initializeTeams,
    initializeAuctionData: initializeAuctionData,
    getCurrentPlayer: function() {
      return currentPlayer;
    }
  };
})();

// Initialize auction when the DOM is ready
document.addEventListener('DOMContentLoaded', Auction.initialize); 