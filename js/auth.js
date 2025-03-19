// Authentication Module
const Auth = (() => {
  // Private variables
  let currentUser = null;
  let isAdmin = false;
  const adminPassword = 'admin123'; // Change this in production

  // Team tokens storage - in a real app, this would be securely stored server-side
  // For demonstration purposes only
  const teamTokens = {};

  // Initialize the module
  function initialize() {
    setupEventListeners();
    populateTeamSelect();
    
    // Check for URL parameters
    if (teamParam && tokenParam) {
      authenticateWithUrl();
    }
  }

  // Event listeners
  function setupEventListeners() {
    // Login form submission
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    
    // Admin link click
    document.getElementById('admin-link').addEventListener('click', showAdminLogin);
  }

  // Handle login form submission
  function handleLogin(event) {
    event.preventDefault();
    
    const teamSelect = document.getElementById('team-select');
    const passwordInput = document.getElementById('password');
    
    const teamId = teamSelect.value;
    const password = passwordInput.value;
    
    if (teamId === 'admin') {
      // Admin login
      if (password === adminPassword) {
        loginAsAdmin();
      } else {
        alert('Invalid admin password');
      }
    } else {
      // Team login
      loginAsTeam(teamId, password);
    }
  }

  // Show admin login
  function showAdminLogin(event) {
    event.preventDefault();
    
    const teamSelect = document.getElementById('team-select');
    
    // Add admin option if it doesn't exist
    if (!teamSelect.querySelector('option[value="admin"]')) {
      const adminOption = document.createElement('option');
      adminOption.value = 'admin';
      adminOption.textContent = 'Admin';
      teamSelect.appendChild(adminOption);
    }
    
    teamSelect.value = 'admin';
    document.getElementById('password').focus();
  }

  // Login as admin
  function loginAsAdmin() {
    isAdmin = true;
    currentUser = {
      id: 'admin',
      name: 'Admin',
      role: 'admin'
    };
    
    // Save to localStorage for persistence
    localStorage.setItem('user', JSON.stringify(currentUser));
    localStorage.setItem('isAdmin', 'true');
    
    // Show admin screen
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('auction-screen').classList.add('hidden');
    document.getElementById('admin-screen').classList.remove('hidden');
    
    // Update UI
    updateUI();
    
    // Let admin.js know we're logged in
    document.dispatchEvent(new CustomEvent('adminLoggedIn'));
  }

  // Login as team
  function loginAsTeam(teamId, password) {
    // Check if we have team data in URL parameters
    if (teamParam && tokenParam) {
      // URL authentication takes precedence
      authenticateWithUrl();
      return;
    }
    
    // Otherwise check against Firebase
    dbRefs.teams.child(teamId).once('value', (snapshot) => {
      const teamData = snapshot.val();
      
      if (!teamData) {
        alert('Team not found');
        return;
      }
      
      // In a real app, you'd verify the password securely
      // This is simplified for demonstration
      if (teamData.password === password) {
        loginTeamSuccess(teamData);
      } else {
        alert('Invalid password');
      }
    });
  }

  // Authenticate with URL parameters
  function authenticateWithUrl() {
    if (!teamParam || !tokenParam) {
      return false;
    }
    
    dbRefs.teams.orderByChild('name').equalTo(teamParam).once('value', (snapshot) => {
      if (snapshot.exists()) {
        // Get the team data
        let teamData = null;
        let teamId = null;
        
        snapshot.forEach((childSnapshot) => {
          if (childSnapshot.val().token === tokenParam) {
            teamData = childSnapshot.val();
            teamId = childSnapshot.key;
          }
        });
        
        if (teamData && teamId) {
          teamData.id = teamId;
          loginTeamSuccess(teamData);
          return true;
        }
      }
      
      alert('Invalid team link');
      return false;
    });
  }

  // Complete team login process
  function loginTeamSuccess(teamData) {
    isAdmin = false;
    currentUser = {
      id: teamData.id,
      name: teamData.name,
      budget: teamData.budget,
      players: teamData.players || [],
      role: 'team'
    };
    
    // Save to localStorage for persistence
    localStorage.setItem('user', JSON.stringify(currentUser));
    localStorage.setItem('isAdmin', 'false');
    
    // Show auction screen
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('admin-screen').classList.add('hidden');
    document.getElementById('auction-screen').classList.remove('hidden');
    
    // Update UI
    updateUI();
    
    // Notify auction.js that a team has logged in
    document.dispatchEvent(new CustomEvent('teamLoggedIn', { 
      detail: { teamId: currentUser.id }
    }));
  }

  // Update the UI based on current user
  function updateUI() {
    const teamNameElement = document.getElementById('team-name');
    const budgetElement = document.getElementById('budget-display');
    
    if (currentUser) {
      teamNameElement.textContent = currentUser.name;
      
      if (currentUser.role === 'team') {
        budgetElement.textContent = `Budget: ₹${currentUser.budget.toLocaleString()}`;
      } else {
        budgetElement.textContent = 'Admin Mode';
      }
    } else {
      teamNameElement.textContent = 'Not logged in';
      budgetElement.textContent = '';
    }
  }

  // Generate a team access link
  function generateTeamLink(teamId, teamName) {
    const token = generateToken(15);
    const baseUrl = window.location.href.split('#')[0];
    const teamLink = `${baseUrl}#team=${encodeURIComponent(teamName)}&token=${token}`;
    
    // Store token in Firebase for verification
    dbRefs.teams.child(teamId).update({ token });
    
    return teamLink;
  }

  // Load user from localStorage (for persistence)
  function loadUser() {
    const storedUser = localStorage.getItem('user');
    const storedIsAdmin = localStorage.getItem('isAdmin');
    
    if (storedUser) {
      currentUser = JSON.parse(storedUser);
      isAdmin = storedIsAdmin === 'true';
      
      // Show appropriate screen
      if (isAdmin) {
        loginAsAdmin();
      } else {
        // Verify team still exists in Firebase before continuing
        dbRefs.teams.child(currentUser.id).once('value', (snapshot) => {
          if (snapshot.exists()) {
            const teamData = snapshot.val();
            currentUser.budget = teamData.budget;
            currentUser.players = teamData.players || [];
            loginTeamSuccess(currentUser);
          } else {
            // Team no longer exists, clear localStorage
            logout();
          }
        });
      }
      
      return true;
    }
    
    return false;
  }

  // Logout
  function logout() {
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('user');
    localStorage.removeItem('isAdmin');
    
    // Show login screen
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('auction-screen').classList.add('hidden');
    document.getElementById('admin-screen').classList.add('hidden');
    
    // Update UI
    updateUI();
  }

  // Populate team select dropdown
  function populateTeamSelect() {
    const teamSelect = document.getElementById('team-select');
    
    // Clear existing options except the first one
    while (teamSelect.options.length > 1) {
      teamSelect.remove(1);
    }
    
    // Get teams from Firebase
    dbRefs.teams.once('value', (snapshot) => {
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const team = childSnapshot.val();
          const option = document.createElement('option');
          option.value = childSnapshot.key;
          option.textContent = team.name;
          teamSelect.appendChild(option);
        });
      } else {
        console.log('No teams found in the database');
      }
    });
  }

  // Public methods
  return {
    initialize: initialize,
    loadUser: loadUser,
    generateTeamLink: generateTeamLink,
    populateTeamSelect: populateTeamSelect,
    getCurrentUser: function() {
      return currentUser;
    },
    isAdmin: function() {
      return isAdmin;
    },
    logout: logout
  };
})(); 