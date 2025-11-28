// ===== CLIENT NETWORK MANAGER (FIXED) =====

const NetworkManager = {
    socket: null,
    connected: false,
    roomCode: null,
    playerId: null,
    isHost: false,
    otherPlayers: new Map(),
    serverUrl: 'https://YOUR-APP.onrender.com', // UPDATE THIS!

    init() {
        this.socket = io(this.serverUrl);
        this.setupEventListeners();
    },

    setupEventListeners() {
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

    updateOtherPlayer(data) {
        if (data.playerId === this.playerId) return;

        let otherPlayer = this.otherPlayers.get(data.playerId);

        if (!otherPlayer) {
            otherPlayer = new NetworkPlayer(data.playerId);
            this.otherPlayers.set(data.playerId, otherPlayer);
            console.log('Created network player:', data.playerId);
        }

        // FIX: Immediately update position (less interpolation delay)
        otherPlayer.x = data.x;
        otherPlayer.y = data.y;
        otherPlayer.targetX = data.x;
        otherPlayer.targetY = data.y;
        otherPlayer.angle = data.angle;
        otherPlayer.isAiming = data.isAiming;
        otherPlayer.isSprinting = data.isSprinting;
        otherPlayer.isPeeking = data.isPeeking;
        otherPlayer.health = data.health;
        otherPlayer.isDead = false; // FIX: Ensure they're visible when moving
    },

    handleOtherPlayerShot(data) {
        if (data.playerId === this.playerId) return;

        // Create bullet from other player
        const bullet = new Bullet(data.x, data.y, data.angle, 25);
        bullet.ownerId = data.playerId;
        bullet.isNetworkBullet = true; // FIX: Mark as network bullet
        bullets.push(bullet);

        console.log('Other player shot:', data.playerId);

        // FIX: Create muzzle flash even in fog
        if (window.ENABLE_MUZZLE_FLASH) {
            const flash = new MuzzleFlash(data.x, data.y, data.angle);
            flash.isNetworkFlash = true; // FIX: Mark as network flash (always visible)
            muzzleFlashes.push(flash);
        }
    },

    handlePlayerHit(data) {
        if (data.targetId === this.playerId) {
            // We got hit
            player.health = data.newHealth;
            console.log('You were hit! Health:', player.health);

            // FIX: Visual feedback
            this.showHitEffect();
        }
    },

    handlePlayerDeath(data) {
        if (data.victimId === this.playerId) {
            // We died
            console.log('You were killed by', data.killerId);
            player.health = 0;

            // FIX: Respawn after delay
            setTimeout(() => {
                this.respawnPlayer();
            }, 3000);
        } else if (data.killerId === this.playerId) {
            // We got a kill
            console.log('You killed', data.victimId);
        }

        // FIX: Handle other player death properly
        const deadPlayer = this.otherPlayers.get(data.victimId);
        if (deadPlayer) {
            deadPlayer.isDead = true;
            // FIX: Respawn other player after delay
            setTimeout(() => {
                if (deadPlayer) {
                    deadPlayer.isDead = false;
                    deadPlayer.health = deadPlayer.maxHealth;
                }
            }, 3000);
        }
    },

    respawnPlayer() {
        if (!player) return;

        const spawn = MapSystem.getPlayerSpawn();
        player.x = spawn.x;
        player.y = spawn.y;
        player.health = player.maxHealth;
        console.log('Respawned at', spawn.x, spawn.y);
    },

    startMultiplayerGame(data) {
        MultiplayerUI.hideLobby();
        MenuSystem.startGame();

        // Store other players info
        data.players.forEach(p => {
            if (p.id !== this.playerId) {
                const netPlayer = new NetworkPlayer(p.id);
                netPlayer.name = p.name;
                netPlayer.color = p.color;
                this.otherPlayers.set(p.id, netPlayer);
                console.log('Added player to game:', p.name);
            }
        });
    },

    updateConnectionStatus(connected) {
        const indicator = document.getElementById('connectionStatus');
        if (indicator) {
            indicator.textContent = connected ? '● ONLINE' : '● OFFLINE';
            indicator.style.color = connected ? '#0f0' : '#f00';
        }
    },

    // FIX: Visual hit effect
    showHitEffect() {
        if (!canvas) return;
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255, 0, 0, 0.3);
            pointer-events: none;
            z-index: 9999;
        `;
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 100);
    }
};

// ===== NETWORK PLAYER CLASS (FIXED) =====

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
        this.interpolationSpeed = 0.5; // FIX: Faster interpolation
        this.alwaysVisible = true; // FIX: Always render (ignore fog)
    }

    update(deltaTime) {
        if (this.isDead) return;

        // Smooth interpolation
        const lerpSpeed = this.interpolationSpeed;
        this.x = lerp(this.x, this.targetX, lerpSpeed);
        this.y = lerp(this.y, this.targetY, lerpSpeed);
    }

    draw(ctx) {
        if (this.isDead) return;

        const screenX = Camera.toScreenX(this.x);
        const screenY = Camera.toScreenY(this.y);
        const scaledRadius = this.radius * Camera.zoom;

        ctx.save();

        // FIX: Draw outline for better visibility
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3 * Camera.zoom;
        ctx.beginPath();
        ctx.arc(screenX, screenY, scaledRadius + 2, 0, Math.PI * 2);
        ctx.stroke();

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
        const gunLength = scaledRadius + 15 * Camera.zoom;
        ctx.lineTo(
            screenX + Math.cos(this.angle) * gunLength,
            screenY + Math.sin(this.angle) * gunLength
        );
        ctx.stroke();

        // Draw name above player (FIX: Always visible)
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${14 * Camera.zoom}px Courier New`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        const nameY = screenY - scaledRadius - 10 * Camera.zoom;
        ctx.strokeText(this.name, screenX, nameY);
        ctx.fillText(this.name, screenX, nameY);

        // Draw health bar (FIX: Brighter colors)
        const barWidth = 50 * Camera.zoom;
        const barHeight = 6 * Camera.zoom;
        const barX = screenX - barWidth / 2;
        const barY = screenY - scaledRadius - 25 * Camera.zoom;

        ctx.fillStyle = '#000';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPercent = this.health / this.maxHealth;
        const barColor = healthPercent > 0.5 ? '#0f0' : healthPercent > 0.25 ? '#ff0' : '#f00';
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.restore();
    }
}
