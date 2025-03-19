// Players Module
const Players = (() => {
  // Sample players data
  // In a production app, you would fetch this from an API or database
  const samplePlayers = [
    {
      id: 1,
      name: "Virat Kohli",
      type: "Batsman",
      basePrice: 2000000,
      country: "India",
      stats: {
        battingAverage: 53.5,
        strikeRate: 138.2,
        matches: 223,
        runs: 6624
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/164.png"
    },
    {
      id: 2,
      name: "Rohit Sharma",
      type: "Batsman",
      basePrice: 2000000,
      country: "India",
      stats: {
        battingAverage: 31.3,
        strikeRate: 130.6,
        matches: 227,
        runs: 5879
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/107.png"
    },
    {
      id: 3,
      name: "Jasprit Bumrah",
      type: "Bowler",
      basePrice: 1500000,
      country: "India",
      stats: {
        bowlingAverage: 23.5,
        economy: 7.4,
        matches: 120,
        wickets: 145
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/1124.png"
    },
    {
      id: 4,
      name: "MS Dhoni",
      type: "Wicketkeeper",
      basePrice: 1800000,
      country: "India",
      stats: {
        battingAverage: 38.2,
        strikeRate: 135.8,
        matches: 220,
        runs: 4978,
        dismissals: 195
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/1.png"
    },
    {
      id: 5,
      name: "Ben Stokes",
      type: "All-rounder",
      basePrice: 1700000,
      country: "England",
      stats: {
        battingAverage: 26.4,
        strikeRate: 134.5,
        bowlingAverage: 31.6,
        economy: 8.9,
        matches: 85,
        runs: 920,
        wickets: 49
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/485.png"
    },
    {
      id: 6,
      name: "Jofra Archer",
      type: "Bowler",
      basePrice: 1500000,
      country: "England",
      stats: {
        bowlingAverage: 21.1,
        economy: 7.2,
        matches: 35,
        wickets: 46
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/3097.png"
    },
    {
      id: 7,
      name: "Kane Williamson",
      type: "Batsman",
      basePrice: 1500000,
      country: "New Zealand",
      stats: {
        battingAverage: 37.2,
        strikeRate: 128.1,
        matches: 76,
        runs: 2021
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/440.png"
    },
    {
      id: 8,
      name: "Rashid Khan",
      type: "Bowler",
      basePrice: 1800000,
      country: "Afghanistan",
      stats: {
        bowlingAverage: 20.1,
        economy: 6.3,
        matches: 87,
        wickets: 112
      },
      image: "https://resources.pulse.icc-cricket.com/players/284/2885.png"
    }
  ];

  // Initialize player data in Firebase
  async function initializePlayers() {
    try {
      console.log('Starting player initialization...');
      
      // Check if players already exist
      const snapshot = await dbRefs.players.once('value');
      console.log('Player snapshot received:', snapshot.exists());
      
      if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
        console.log('Players already initialized');
        return true;
      }
      
      console.log('No players found. Adding sample players...');
      
      // Add sample players to Firebase
      const updates = {};
      
      samplePlayers.forEach(player => {
        const playerCopy = {...player};
        playerCopy.status = 'unsold';
        updates[player.id] = playerCopy;
      });
      
      console.log('Updating players in Firebase...');
      await dbRefs.players.set(updates);
      console.log('Players initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing players:', error);
      alert('Error initializing players: ' + error.message);
      return false;
    }
  }

  // Get all players
  async function getAllPlayers() {
    try {
      const snapshot = await dbRefs.players.once('value');
      return snapshot.val() || {};
    } catch (error) {
      console.error('Error getting players:', error);
      return {};
    }
  }

  // Get player by ID
  async function getPlayerById(playerId) {
    try {
      const snapshot = await dbRefs.players.child(playerId).once('value');
      return snapshot.val() || null;
    } catch (error) {
      console.error('Error getting player:', error);
      return null;
    }
  }

  // Get unsold players
  async function getUnsoldPlayers() {
    try {
      console.log('Fetching unsold players...');
      const snapshot = await dbRefs.players.orderByChild('status').equalTo('unsold').once('value');
      console.log('Unsold players snapshot:', snapshot.exists());
      const players = snapshot.val() || {};
      console.log('Unsold players count:', Object.keys(players).length);
      return players;
    } catch (error) {
      console.error('Error getting unsold players:', error);
      return {};
    }
  }

  // Update player status
  async function updatePlayerStatus(playerId, status, teamId = null) {
    try {
      const updates = {
        status: status
      };
      
      if (teamId) {
        updates.teamId = teamId;
      }
      
      await dbRefs.players.child(playerId).update(updates);
      return true;
    } catch (error) {
      console.error('Error updating player status:', error);
      return false;
    }
  }

  // Get next unsold player
  async function getNextUnsoldPlayer() {
    try {
      console.log('Getting next unsold player...');
      const players = await getUnsoldPlayers();
      const playerIds = Object.keys(players);
      
      console.log('Available unsold players:', playerIds.length);
      
      if (playerIds.length === 0) {
        console.log('No unsold players available');
        return null;
      }
      
      // Get the first unsold player
      console.log('Next player:', players[playerIds[0]].name);
      return players[playerIds[0]];
    } catch (error) {
      console.error('Error getting next unsold player:', error);
      return null;
    }
  }

  // Render player card
  function renderPlayerCard(player) {
    if (!player) return;
    
    // Update player image
    document.getElementById('player-image').src = player.image || 'https://via.placeholder.com/150';
    
    // Update player details
    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-type').textContent = player.type;
    document.getElementById('player-country').textContent = player.country;
    document.getElementById('base-price').textContent = `Base Price: ₹${player.basePrice.toLocaleString()}`;
    
    // Update player stats
    const statsContainer = document.getElementById('player-stats');
    statsContainer.innerHTML = '';
    
    if (player.stats) {
      for (const [key, value] of Object.entries(player.stats)) {
        let statLabel = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        statLabel = statLabel.charAt(0).toUpperCase() + statLabel.slice(1); // Capitalize first letter
        
        const statItem = document.createElement('div');
        statItem.className = 'stat-item';
        statItem.innerHTML = `
          <div class="stat-label">${statLabel}</div>
          <div class="stat-value">${value}</div>
        `;
        statsContainer.appendChild(statItem);
      }
    }
  }

  // Public methods
  return {
    initialize: initializePlayers,
    getAll: getAllPlayers,
    getById: getPlayerById,
    getUnsold: getUnsoldPlayers,
    getNext: getNextUnsoldPlayer,
    updateStatus: updatePlayerStatus,
    renderCard: renderPlayerCard,
    
    // Expose sample data for testing/development
    sampleData: samplePlayers
  };
})(); 