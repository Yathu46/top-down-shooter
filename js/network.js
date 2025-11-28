// ===== CLIENT NETWORK MANAGER =====

const NetworkManager = {
    socket: null,
    connected: false,
    roomCode: null,
    playerId: null,
    isHost: false,
    otherPlayers: new Map(),
    serverUrl: 'https://top-down-shooter-thes.onrender.com', // Change when deployed

    // Initialize connection
    init() {
        // Load Socket.IO from CDN (add to HTML)
        this.socket = io(this.serverUrl);

        this.setupEventListeners();
    },

    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            this.connected = true;
            this.playerId = this.socket.id;
            console.log('Connected to server:', this.playerId);
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            this.connected = false;
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('error', (data) => {
            alert('Error: ' + data.message);
            console.error('Server error:', data.message);
        });

        // Room events
        this.socket.on('room-created', (data) => {
            this.roomCode = data.roomCode;
            this.playerId = data.playerId;
            this.isHost = data.isHost;
            console.log('Room created:', data.roomCode);
            MultiplayerUI.showLobby(data);
        });

        this.socket.on('room-joined', (data) => {
            this.roomCode = data.roomCode;
            this.playerId = data.playerId;
            this.isHost = data.isHost;
            console.log('Room joined:', data.roomCode);
            MultiplayerUI.showLobby(data);
        });

        this.socket.on('room-update', (data) => {
            console.log('Room update:', data);
            MultiplayerUI.updateLobby(data);
        });

        this.socket.on('room-closed', (data) => {
            alert('Room closed: ' + data.reason);
            this.leaveRoom();
        });

        // Game events
        this.socket.on('game-start', (data) => {
            console.log('Game starting!', data);
            this.startMultiplayerGame(data);
        });

        this.socket.on('player-moved', (data) => {
            this.updateOtherPlayer(data);
        });

        this.socket.on('player-shot', (data) => {
            this.handleOtherPlayerShot(data);
        });

        this.socket.on('player-hit', (data) => {
            this.handlePlayerHit(data);
        });

        this.socket.on('player-death', (data) => {
            this.handlePlayerDeath(data);
        });

        this.socket.on('stats-update', (data) => {
            MultiplayerUI.updateStats(data);
        });
    },

    // Room management
    createRoom(playerName, mapName) {
        if (!this.connected) {
            alert('Not connected to server');
            return;
        }

        this.socket.emit('create-room', {
            playerName: playerName,
            map: mapName
        });
    },

    joinRoom(roomCode, playerName) {
        if (!this.connected) {
            alert('Not connected to server');
            return;
        }

        this.socket.emit('join-room', {
            roomCode: roomCode,
            playerName: playerName
        });
    },

    toggleReady() {
        if (!this.roomCode) return;
        this.socket.emit('player-ready');
    },

    startGame() {
        if (!this.isHost || !this.roomCode) return;
        this.socket.emit('start-game');
    },

    leaveRoom() {
        this.roomCode = null;
        this.isHost = false;
        this.otherPlayers.clear();
        GameState.returnToMenu();
    },

    // Game synchronization
    sendPlayerUpdate(playerData) {
        if (!this.roomCode || !GameState.isPlaying) return;

        this.socket.emit('player-update', {
            x: playerData.x,
            y: playerData.y,
            angle: playerData.angle,
            isAiming: playerData.isAiming,
            isSprinting: playerData.isSprinting,
            isPeeking: playerData.isPeeking,
            health: playerData.health
        });
    },

    sendShoot(x, y, angle) {
        if (!this.roomCode) return;

        this.socket.emit('player-shoot', {
            x: x,
            y: y,
            angle: angle
        });
    },

    sendHit(targetId, damage, newHealth) {
        if (!this.roomCode) return;

        this.socket.emit('bullet-hit', {
            targetId: targetId,
            damage: damage,
            newHealth: newHealth
        });
    },

    // Handle other players
    updateOtherPlayer(data) {
        if (data.playerId === this.playerId) return;

        let otherPlayer = this.otherPlayers.get(data.playerId);

        if (!otherPlayer) {
            // Create new network player
            otherPlayer = new NetworkPlayer(data.playerId);
            this.otherPlayers.set(data.playerId, otherPlayer);
        }

        // Update position with interpolation
        otherPlayer.targetX = data.x;
        otherPlayer.targetY = data.y;
        otherPlayer.angle = data.angle;
        otherPlayer.isAiming = data.isAiming;
        otherPlayer.isSprinting = data.isSprinting;
        otherPlayer.isPeeking = data.isPeeking;
        otherPlayer.health = data.health;
    },

    handleOtherPlayerShot(data) {
        if (data.playerId === this.playerId) return;

        // Create bullet from other player
        const bullet = new Bullet(data.x, data.y, data.angle, 25);
        bullet.ownerId = data.playerId;
        bullets.push(bullet);

        // Create muzzle flash
        if (window.ENABLE_MUZZLE_FLASH) {
            muzzleFlashes.push(new MuzzleFlash(data.x, data.y, data.angle));
        }
    },

    handlePlayerHit(data) {
        if (data.targetId === this.playerId) {
            // We got hit
            player.health = data.newHealth;
            // Flash screen red or show hit indicator
        }
    },

    handlePlayerDeath(data) {
        if (data.victimId === this.playerId) {
            // We died
            console.log('You were killed by', data.killerId);
            // Show death screen, respawn after delay
            setTimeout(() => {
                this.respawnPlayer();
            }, 3000);
        } else if (data.killerId === this.playerId) {
            // We got a kill
            console.log('You killed', data.victimId);
        }

        // Remove dead player temporarily
        const deadPlayer = this.otherPlayers.get(data.victimId);
        if (deadPlayer) {
            deadPlayer.isDead = true;
        }
    },

    respawnPlayer() {
        if (!player) return;

        const spawn = MapSystem.getPlayerSpawn();
        player.x = spawn.x;
        player.y = spawn.y;
        player.health = player.maxHealth;
    },

    startMultiplayerGame(data) {
        // Hide lobby
        MultiplayerUI.hideLobby();

        // Setup game
        MenuSystem.startGame();

        // Store other players info
        data.players.forEach(p => {
            if (p.id !== this.playerId) {
                const netPlayer = new NetworkPlayer(p.id);
                netPlayer.name = p.name;
                netPlayer.color = p.color;
                this.otherPlayers.set(p.id, netPlayer);
            }
        });
    },

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionStatus');
        if (indicator) {
            indicator.textContent = connected ? '● ONLINE' : '● OFFLINE';
            indicator.style.color = connected ? '#0f0' : '#f00';
        }
    }
};

// ===== NETWORK PLAYER CLASS =====

class NetworkPlayer {
    constructor(id) {
        this.id = id;
        this.name = 'Player';
        this.color = '#fff';
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.angle = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.radius = 15;
        this.isAiming = false;
        this.isSprinting = false;
        this.isPeeking = false;
        this.isDead = false;
        this.interpolationSpeed = 0.3;
    }

    update(deltaTime) {
        // Smooth interpolation to target position
        this.x = lerp(this.x, this.targetX, this.interpolationSpeed);
        this.y = lerp(this.y, this.targetY, this.interpolationSpeed);
    }

    draw(ctx) {
        if (this.isDead) return;

        const screenX = Camera.toScreenX(this.x);
        const screenY = Camera.toScreenY(this.y);
        const scaledRadius = this.radius * Camera.zoom;

        ctx.save();

        // Draw player circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw gun
        ctx.strokeStyle = this.isAiming ? '#0f0' : this.color;
        ctx.lineWidth = 4 * Camera.zoom;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(
            screenX + Math.cos(this.angle) * (scaledRadius + 15 * Camera.zoom),
            screenY + Math.sin(this.angle) * (scaledRadius + 15 * Camera.zoom)
        );
        ctx.stroke();

        // Draw name above player
        ctx.fillStyle = '#fff';
        ctx.font = `${12 * Camera.zoom}px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillText(this.name, screenX, screenY - scaledRadius - 10 * Camera.zoom);

        // Draw health bar
        const barWidth = 40 * Camera.zoom;
        const barHeight = 4 * Camera.zoom;
        const barX = screenX - barWidth / 2;
        const barY = screenY - scaledRadius - 20 * Camera.zoom;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barWidth, barHeight);

        ctx.restore();
    }

}

