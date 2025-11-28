// ===== MAIN GAME LOGIC (WITH MULTIPLAYER) =====

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 600;

// CAMERA with dynamic zoom
const Camera = {
    x: 0,
    y: 0,
    zoom: 1.8,
    targetZoom: 1.8,
    normalZoom: 1.8,
    adsZoom: 1.3,
    zoomSpeed: 0.15,
    offsetDistance: 120,
    smoothness: 0.12,

    update(player, deltaTime) {
        this.targetZoom = player.isAiming ? this.adsZoom : this.normalZoom;
        this.zoom = lerp(this.zoom, this.targetZoom, this.zoomSpeed);

        const aheadX = player.x + Math.cos(player.angle) * this.offsetDistance;
        const aheadY = player.y + Math.sin(player.angle) * this.offsetDistance;
        const targetX = aheadX - canvas.width / (2 * this.zoom);
        const targetY = aheadY - canvas.height / (2 * this.zoom);
        this.x = lerp(this.x, targetX, this.smoothness);
        this.y = lerp(this.y, targetY, this.smoothness);
    },

    toScreenX(worldX) {
        return (worldX - this.x) * this.zoom;
    },

    toScreenY(worldY) {
        return (worldY - this.y) * this.zoom;
    },

    toWorldX(screenX) {
        return screenX / this.zoom + this.x;
    },

    toWorldY(screenY) {
        return screenY / this.zoom + this.y;
    }
};

let TILE_SIZE = 50;
let MAP_TILES_X = 40;
let MAP_TILES_Y = 40;
let MAP_WIDTH = MAP_TILES_X * TILE_SIZE;
let MAP_HEIGHT = MAP_TILES_Y * TILE_SIZE;
let obstacles = [];

let player;
let bullets = [];
let muzzleFlashes = [];
let lastTime = 0;

// Global settings
window.BULLET_SPEED = 800;
window.GRID_OPACITY = 0.2;
window.ENABLE_MUZZLE_FLASH = true;
window.MUZZLE_FLASH_DURATION = 0.08;

function gameLoop(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (!GameState.isPaused) {
        update(deltaTime);
        render();
        updateDebugInfo();
    }

    requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
    if (!player) return;

    player.update(deltaTime);
    Camera.update(player, deltaTime);

    // MULTIPLAYER: Send player updates to server
    if (GameState.isMultiplayer && NetworkManager.connected) {
        if (!window.lastNetworkUpdate || Date.now() - window.lastNetworkUpdate > 50) {
            NetworkManager.sendPlayerUpdate({
                x: player.x,
                y: player.y,
                angle: player.angle,
                isAiming: player.isAiming,
                isSprinting: player.isSprinting,
                isPeeking: player.isPeeking,
                health: player.health
            });
            window.lastNetworkUpdate = Date.now();
        }
    }

    // MULTIPLAYER: Update network players
    if (GameState.isMultiplayer) {
        NetworkManager.otherPlayers.forEach(netPlayer => {
            netPlayer.update(deltaTime);
        });
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update(deltaTime);

        // MULTIPLAYER: Check collision with network players
        if (GameState.isMultiplayer) {
            NetworkManager.otherPlayers.forEach(netPlayer => {
                if (!netPlayer.isDead) {
                    const dx = bullets[i].x - netPlayer.x;
                    const dy = bullets[i].y - netPlayer.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // Check if bullet hits network player
                    if (dist < netPlayer.radius && bullets[i].ownerId !== netPlayer.id) {
                        bullets[i].alive = false;
                        const damage = bullets[i].damage || 25;
                        const newHealth = Math.max(0, netPlayer.health - damage);
                        netPlayer.health = newHealth;

                        // Send hit to server
                        NetworkManager.sendHit(netPlayer.id, damage, newHealth);
                    }
                }
            });
        }

        if (!bullets[i].alive) {
            bullets.splice(i, 1);
        }
    }

    // Update muzzle flashes
    for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
        muzzleFlashes[i].update(deltaTime);
        if (!muzzleFlashes[i].isActive()) {
            muzzleFlashes.splice(i, 1);
        }
    }
}

function render() {
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    drawGrid();
    drawObstacles();

    // MULTIPLAYER: Draw network players
    if (GameState.isMultiplayer) {
        NetworkManager.otherPlayers.forEach(netPlayer => {
            netPlayer.draw(ctx);
        });
    }

    bullets.forEach(bullet => bullet.draw(ctx));
    drawSpreadArc();
    if (player) player.draw(ctx);
    if (window.ENABLE_MUZZLE_FLASH) {
        muzzleFlashes.forEach(flash => flash.draw(ctx));
    }
    ctx.restore();

    if (player) FogOfWar.draw(ctx, player);
    drawUI();
}

function drawGrid() {
    const opacity = window.GRID_OPACITY || 0.2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 1;

    const startX = Math.floor(Camera.x / TILE_SIZE) * TILE_SIZE;
    const startY = Math.floor(Camera.y / TILE_SIZE) * TILE_SIZE;
    const endX = startX + (canvas.width / Camera.zoom) + TILE_SIZE;
    const endY = startY + (canvas.height / Camera.zoom) + TILE_SIZE;

    for (let x = startX; x <= endX; x += TILE_SIZE) {
        if (x < 0 || x > MAP_WIDTH) continue;
        const screenX = Camera.toScreenX(x);
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvas.height);
        ctx.stroke();
    }

    for (let y = startY; y <= endY; y += TILE_SIZE) {
        if (y < 0 || y > MAP_HEIGHT) continue;
        const screenY = Camera.toScreenY(y);
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvas.width, screenY);
        ctx.stroke();
    }
}

function drawObstacles() {
    for (const obs of obstacles) {
        const screenX = Camera.toScreenX(obs.x);
        const screenY = Camera.toScreenY(obs.y);
        const screenW = obs.width * Camera.zoom;
        const screenH = obs.height * Camera.zoom;

        ctx.save();
        if (obs.type === 'wall') {
            ctx.fillStyle = '#555';
            ctx.strokeStyle = '#777';
        } else if (obs.type === 'cover') {
            ctx.fillStyle = '#8B4513';
            ctx.strokeStyle = '#A0522D';
        }

        if (obs.angle) {
            ctx.translate(screenX + screenW / 2, screenY + screenH / 2);
            ctx.rotate(obs.angle);
            ctx.fillRect(-screenW / 2, -screenH / 2, screenW, screenH);
            ctx.lineWidth = 2;
            ctx.strokeRect(-screenW / 2, -screenH / 2, screenW, screenH);
        } else {
            ctx.fillRect(screenX, screenY, screenW, screenH);
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, screenW, screenH);
        }

        ctx.restore();
    }
}

function drawUI() {
    if (!player || !player.weapon) return;

    const weapon = player.weapon;
    ctx.fillStyle = weapon.currentAmmo === 0 ? '#e74c3c' : '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${weapon.currentAmmo} / ${weapon.reserveAmmo}`, canvas.width - 20, canvas.height - 20);

    if (weapon.isReloading) {
        ctx.fillStyle = '#f39c12';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RELOADING...', canvas.width / 2, canvas.height - 30);

        const progress = 1 - (weapon.reloadTimer / weapon.stats.reloadTime);
        const barWidth = 200;
        const barHeight = 10;
        const barX = canvas.width / 2 - barWidth / 2;
        const barY = canvas.height - 50;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    }
}

function drawSpreadArc() {
    if (!player || !player.weapon) return;

    const weapon = player.weapon;
    const spread = weapon.getCurrentSpread(player);
    const screenX = Camera.toScreenX(player.x);
    const screenY = Camera.toScreenY(player.y);
    const arcLength = 60 * Camera.zoom;
    const spreadRad = toRadians(spread);
    const halfSpread = spreadRad / 2;
    const startAngle = player.angle - halfSpread;
    const endAngle = player.angle + halfSpread;

    ctx.save();
    ctx.fillStyle = player.isAiming ? 'rgba(0, 255, 0, 0.15)' : 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.arc(screenX, screenY, arcLength, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = player.isAiming ? 'rgba(0, 255, 0, 0.4)' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenX, screenY, arcLength, startAngle, endAngle);
    ctx.stroke();

    ctx.strokeStyle = player.isAiming ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(
        screenX + Math.cos(startAngle) * arcLength,
        screenY + Math.sin(startAngle) * arcLength
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(
        screenX + Math.cos(endAngle) * arcLength,
        screenY + Math.sin(endAngle) * arcLength
    );
    ctx.stroke();

    ctx.strokeStyle = player.isAiming ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(screenX, screenY);
    ctx.lineTo(
        screenX + Math.cos(player.angle) * arcLength,
        screenY + Math.sin(player.angle) * arcLength
    );
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
}

function updateDebugInfo() {
    const info = document.getElementById('debug-info');
    if (!info || !player) return;

    const spread = player.weapon.getCurrentSpread(player);
    info.innerHTML = `
Pos: ${Math.floor(player.x)}, ${Math.floor(player.y)}
Spread: ${spread.toFixed(1)}°
Recoil: ${player.weapon.currentRecoil.toFixed(1)}°
Ammo: ${player.weapon.currentAmmo}/${player.weapon.reserveAmmo}
${player.isPeeking ? 'PEEKING' : ''} ${player.isAiming ? 'ADS' : ''} ${player.isSprinting ? 'SPRINT' : player.isMoving ? 'WALK' : 'STILL'}
${GameState.isMultiplayer ? 'MULTIPLAYER' : 'SINGLEPLAYER'}
    `;
}

function switchMap(mapName) {
    if (MapSystem.loadMap(mapName)) {
        obstacles = MapSystem.getObstacles();

        const mapDim = MapSystem.getMapDimensions();
        MAP_WIDTH = mapDim.width;
        MAP_HEIGHT = mapDim.height;

        const spawn = MapSystem.getPlayerSpawn();
        if (player) {
            player.x = spawn.x;
            player.y = spawn.y;
        }

        bullets = [];
        muzzleFlashes = [];

        console.log(`Switched to map: ${mapName}`);
    }
}

function checkCollision(x, y, width, height) {
    for (const obs of obstacles) {
        if (obs.angle) {
            const playerCenterX = x + width / 2;
            const playerCenterY = y + height / 2;
            const obsCenterX = obs.x + obs.width / 2;
            const obsCenterY = obs.y + obs.height / 2;
            const dx = playerCenterX - obsCenterX;
            const dy = playerCenterY - obsCenterY;
            const cos = Math.cos(-obs.angle);
            const sin = Math.sin(-obs.angle);
            const localX = dx * cos - dy * sin;
            const localY = dx * sin + dy * cos;
            const halfPlayerWidth = width / 2;
            const halfPlayerHeight = height / 2;
            const halfObsWidth = obs.width / 2;
            const halfObsHeight = obs.height / 2;

            if (Math.abs(localX) < halfObsWidth + halfPlayerWidth &&
                Math.abs(localY) < halfObsHeight + halfPlayerHeight) {
                return obs;
            }
        } else {
            if (x < obs.x + obs.width &&
                x + width > obs.x &&
                y < obs.y + obs.height &&
                y + height > obs.y) {
                return obs;
            }
        }
    }
    return null;
}

// Initialize on load
window.addEventListener('load', () => {
    Input.init();
    MapSystem.init();
});