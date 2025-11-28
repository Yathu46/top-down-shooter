// ===== MULTIPLAYER UI SYSTEM =====

const MultiplayerUI = {
    currentPlayerName: '',

    init() {
        this.createMultiplayerScreens();
        this.setupEventListeners();
    },

    createMultiplayerScreens() {
        const container = document.getElementById('menuContainer');

        // Multiplayer Menu Screen
        const mpMenu = document.createElement('div');
        mpMenu.id = 'multiplayerMenuScreen';
        mpMenu.className = 'menu-screen';
        mpMenu.innerHTML = `
            <div class="multiplayer-menu">
                <h2>MULTIPLAYER</h2>

                <div class="name-input-section">
                    <label for="playerNameInput">YOUR NAME</label>
                    <input type="text" id="playerNameInput" maxlength="12" placeholder="PLAYER" />
                </div>

                <div class="menu-buttons">
                    <button id="createRoomBtn" class="btn btn-primary">CREATE ROOM</button>
                    <button id="joinRoomBtn" class="btn btn-primary">JOIN ROOM</button>
                    <button id="backFromMPBtn" class="btn btn-secondary">BACK</button>
                </div>
            </div>
        `;
        container.appendChild(mpMenu);

        // Join Room Screen
        const joinScreen = document.createElement('div');
        joinScreen.id = 'joinRoomScreen';
        joinScreen.className = 'menu-screen';
        joinScreen.innerHTML = `
            <div class="join-room-menu">
                <h2>JOIN ROOM</h2>

                <div class="room-code-input">
                    <label for="roomCodeInput">ROOM CODE</label>
                    <input type="text" id="roomCodeInput" maxlength="6" placeholder="XXXXXX" 
                           style="text-transform: uppercase; letter-spacing: 0.3rem; font-size: 1.5rem;" />
                </div>

                <div class="menu-buttons">
                    <button id="confirmJoinBtn" class="btn btn-primary">JOIN</button>
                    <button id="cancelJoinBtn" class="btn btn-secondary">CANCEL</button>
                </div>
            </div>
        `;
        container.appendChild(joinScreen);

        // Lobby Screen
        const lobbyScreen = document.createElement('div');
        lobbyScreen.id = 'lobbyScreen';
        lobbyScreen.className = 'menu-screen';
        lobbyScreen.innerHTML = `
            <div class="lobby-container">
                <div class="lobby-header">
                    <h2>LOBBY</h2>
                    <div class="room-code-display">
                        <span>ROOM CODE:</span>
                        <span id="lobbyRoomCode" style="letter-spacing: 0.3rem; font-size: 1.5rem;">------</span>
                    </div>
                </div>

                <div class="lobby-content">
                    <div class="player-list">
                        <h3>PLAYERS</h3>
                        <div id="lobbyPlayerList"></div>
                    </div>

                    <div class="lobby-info">
                        <div id="lobbyMapDisplay">MAP: WAREHOUSE</div>
                        <div id="lobbyStatus">WAITING FOR PLAYERS...</div>
                    </div>
                </div>

                <div class="lobby-actions">
                    <button id="readyBtn" class="btn btn-secondary">READY</button>
                    <button id="startGameBtn" class="btn btn-primary" style="display:none;">START GAME</button>
                    <button id="leaveLobbyBtn" class="btn btn-danger">LEAVE</button>
                </div>
            </div>
        `;
        container.appendChild(lobbyScreen);
    },

    setupEventListeners() {
        // Multiplayer menu
        document.getElementById('createRoomBtn')?.addEventListener('click', () => {
            const name = this.getPlayerName();
            NetworkManager.createRoom(name, MenuSystem.selectedMap);
        });

        document.getElementById('joinRoomBtn')?.addEventListener('click', () => {
            MenuSystem.showScreen('joinRoom');
        });

        document.getElementById('backFromMPBtn')?.addEventListener('click', () => {
            MenuSystem.showScreen('main');
        });

        // Join room screen
        document.getElementById('confirmJoinBtn')?.addEventListener('click', () => {
            const roomCode = document.getElementById('roomCodeInput').value.trim();
            const name = this.getPlayerName();

            if (roomCode.length === 6) {
                NetworkManager.joinRoom(roomCode, name);
            } else {
                alert('Please enter a valid 6-character room code');
            }
        });

        document.getElementById('cancelJoinBtn')?.addEventListener('click', () => {
            MenuSystem.showScreen('multiplayerMenu');
        });

        // Lobby actions
        document.getElementById('readyBtn')?.addEventListener('click', () => {
            NetworkManager.toggleReady();
        });

        document.getElementById('startGameBtn')?.addEventListener('click', () => {
            NetworkManager.startGame();
        });

        document.getElementById('leaveLobbyBtn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to leave?')) {
                NetworkManager.leaveRoom();
            }
        });

        // Auto-uppercase room code input
        const roomCodeInput = document.getElementById('roomCodeInput');
        roomCodeInput?.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    },

    getPlayerName() {
        let name = document.getElementById('playerNameInput')?.value.trim();
        if (!name) {
            name = 'PLAYER' + Math.floor(Math.random() * 1000);
        }
        this.currentPlayerName = name;
        return name;
    },

    showLobby(data) {
        document.getElementById('lobbyRoomCode').textContent = data.roomCode;
        MenuSystem.showScreen('lobby');
    },

    hideLobby() {
        MenuSystem.showScreen('game');
    },

    updateLobby(roomData) {
        if (!roomData) return;

        // Update room code
        document.getElementById('lobbyRoomCode').textContent = roomData.code;

        // Update player list
        const playerList = document.getElementById('lobbyPlayerList');
        playerList.innerHTML = '';

        roomData.players.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'lobby-player';
            playerDiv.style.cssText = `
                padding: 0.8rem;
                margin: 0.5rem 0;
                border: 1px solid ${player.ready ? '#0f0' : '#333'};
                background: ${player.ready ? 'rgba(0,255,0,0.1)' : '#000'};
            `;

            playerDiv.innerHTML = `
                <span style="color: ${player.color};">●</span>
                <span>${player.name}</span>
                ${player.isHost ? '<span style="color:#666;"> [HOST]</span>' : ''}
                ${player.ready ? '<span style="color:#0f0;"> [READY]</span>' : ''}
            `;

            playerList.appendChild(playerDiv);
        });

        // Update status
        const status = document.getElementById('lobbyStatus');
        const allReady = roomData.players.every(p => p.ready);

        if (roomData.players.length < 2) {
            status.textContent = 'WAITING FOR PLAYERS...';
        } else if (allReady) {
            status.textContent = 'STARTING...';
        } else {
            status.textContent = 'WAITING FOR READY...';
        }

        // Show/hide start button for host
        const startBtn = document.getElementById('startGameBtn');
        if (NetworkManager.isHost && roomData.players.length >= 2) {
            startBtn.style.display = 'block';
        } else {
            startBtn.style.display = 'none';
        }
    },

    updateStats(data) {
        // Update scoreboard with kill/death stats
        console.log('Stats update:', data);
        // Can add scoreboard UI here later
    }
};