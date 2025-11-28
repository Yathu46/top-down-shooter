// ===== MENU SYSTEM (WITH MULTIPLAYER) =====

const MenuSystem = {
    currentScreen: 'main',
    selectedMap: 'warehouse',
    gameMode: 'singleplayer', // 'singleplayer' or 'multiplayer'

    init() {
        this.setupEventListeners();
        this.showScreen('main');
    },

    setupEventListeners() {
        // Main menu buttons
        document.getElementById('singleplayerButton')?.addEventListener('click', () => {
            this.gameMode = 'singleplayer';
            this.showScreen('mapSelect');
        });

        document.getElementById('multiplayerButton')?.addEventListener('click', () => {
            this.gameMode = 'multiplayer';
            this.showScreen('multiplayerMenu');
        });

        document.getElementById('settingsButton')?.addEventListener('click', () => {
            Settings.show();
        });

        document.getElementById('quitButton')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to quit?')) {
                window.close();
            }
        });

        // Map selection (singleplayer)
        const mapButtons = document.querySelectorAll('.map-option');
        mapButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectMap(btn.dataset.map);
            });
        });

        document.getElementById('startGameButton')?.addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('backToMainButton')?.addEventListener('click', () => {
            this.showScreen('main');
        });

        // In-game settings button
        document.getElementById('inGameSettingsBtn')?.addEventListener('click', () => {
            if (GameState.isPlaying) {
                GameState.pause();
                Settings.show();
            }
        });
    },

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.menu-screen').forEach(screen => {
            screen.style.display = 'none';
        });

        // Show requested screen
        const screen = document.getElementById(`${screenName}Screen`);
        if (screen) {
            screen.style.display = 'flex';
            this.currentScreen = screenName;
        }
    },

    selectMap(mapName) {
        this.selectedMap = mapName;

        // Update UI
        document.querySelectorAll('.map-option').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-map="${mapName}"]`)?.classList.add('selected');

        // Update map preview
        this.updateMapPreview(mapName);
    },

    updateMapPreview(mapName) {
        const preview = document.getElementById('mapPreview');
        const info = document.getElementById('mapInfo');

        const mapData = {
            warehouse: {
                name: 'WAREHOUSE',
                description: 'Industrial layout with scattered cover. Mid-range combat.',
                difficulty: 'MEDIUM',
                size: '40x40',
                cover: 'MODERATE'
            },
            bunker: {
                name: 'BUNKER',
                description: 'Four rooms with corridors. Close-quarters combat.',
                difficulty: 'HARD',
                size: '40x40',
                cover: 'HIGH'
            },
            urban: {
                name: 'URBAN',
                description: 'City buildings and streets. Mixed combat ranges.',
                difficulty: 'MEDIUM',
                size: '40x40',
                cover: 'HIGH'
            }
        };

        const data = mapData[mapName];
        if (data) {
            info.innerHTML = `
                <h2>${data.name}</h2>
                <p class="map-description">${data.description}</p>
                <div class="map-stats">
                    <div class="stat"><span>DIFFICULTY:</span> ${data.difficulty}</div>
                    <div class="stat"><span>SIZE:</span> ${data.size}</div>
                    <div class="stat"><span>COVER:</span> ${data.cover}</div>
                </div>
            `;
        }

        // Update preview
        preview.innerHTML = this.generateMapPreview(mapName);
    },

    generateMapPreview(mapName) {
        return `
            <svg width="100%" height="100%" viewBox="0 0 400 400">
                <rect width="400" height="400" fill="#000"/>
                <rect x="10" y="10" width="380" height="380" fill="none" stroke="#333" stroke-width="1"/>
                <text x="200" y="200" text-anchor="middle" fill="#fff" font-size="18" font-family="Courier New">
                    ${mapName.toUpperCase()}
                </text>
                <text x="200" y="220" text-anchor="middle" fill="#666" font-size="12" font-family="Courier New">
                    MAP PREVIEW
                </text>
            </svg>
        `;
    },

    startGame() {
        // Hide menu
        document.getElementById('menuContainer').style.display = 'none';
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.style.display = 'flex';
        gameContainer.classList.add('active');
        document.getElementById('inGameUI').style.display = 'block';

        // Load selected map and start game
        MapSystem.loadMap(this.selectedMap);
        GameState.start();
    }
};

// ===== GAME STATE MANAGER (WITH MULTIPLAYER SUPPORT) =====
const GameState = {
    isPlaying: false,
    isPaused: false,
    isMultiplayer: false,

    start() {
        this.isPlaying = true;
        this.isPaused = false;
        this.isMultiplayer = (MenuSystem.gameMode === 'multiplayer');

        // Initialize game
        obstacles = MapSystem.getObstacles();
        const mapDim = MapSystem.getMapDimensions();
        MAP_WIDTH = mapDim.width;
        MAP_HEIGHT = mapDim.height;

        const spawn = MapSystem.getPlayerSpawn();
        player = new Player(spawn.x, spawn.y);

        bullets = [];
        muzzleFlashes = [];

        // Start game loop if not already running
        if (!window.gameLoopRunning) {
            window.gameLoopRunning = true;
            requestAnimationFrame(gameLoop);
        }
    },

    pause() {
        this.isPaused = true;
    },

    resume() {
        this.isPaused = false;
    },

    returnToMenu() {
        this.isPlaying = false;
        this.isPaused = false;
        this.isMultiplayer = false;

        document.getElementById('menuContainer').style.display = 'flex';
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.style.display = 'none';
        gameContainer.classList.remove('active');
        document.getElementById('inGameUI').style.display = 'none';

        MenuSystem.showScreen('main');
    }
};
