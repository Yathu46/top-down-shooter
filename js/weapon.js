// ===== WEAPON SYSTEM =====

class Weapon {
    constructor(type = 'assault_rifle') {
        this.type = type;
        this.stats = this.getWeaponStats(type);
        
        this.currentAmmo = this.stats.magSize;
        this.reserveAmmo = this.stats.magSize * 3;
        
        this.isReloading = false;
        this.reloadTimer = 0;
        this.lastFireTime = 0;
        this.currentRecoil = 0;
    }
    
    getWeaponStats(type) {
        const weapons = {
            assault_rifle: {
                damage: 25,
                fireRate: 600,
                magSize: 30,
                reloadTime: 2.2,
                spreadStillADS: 3,
                spreadStill: 6,
                spreadWalk: 12,
                spreadWalkADS: 8,
                spreadSprint: 25,
                recoilPerShot: 1.5,
                recoilDecay: 8,
                maxRecoil: 12
            }
        };
        return weapons[type];
    }
    
    canFire() {
        if (this.isReloading) return false;
        if (this.currentAmmo <= 0) return false;
        
        const fireDelay = 60 / this.stats.fireRate;
        const now = performance.now() / 1000;
        
        return (now - this.lastFireTime) >= fireDelay;
    }
    
    fire(player) {
        if (!this.canFire()) return null;
        
        this.currentAmmo--;
        this.lastFireTime = performance.now() / 1000;
        
        this.currentRecoil = Math.min(
            this.currentRecoil + this.stats.recoilPerShot,
            this.stats.maxRecoil
        );
        
        const spread = this.getCurrentSpread(player);
        const spreadAngle = (Math.random() - 0.5) * spread;
        const bulletAngle = player.angle + toRadians(spreadAngle);
        
        return new Bullet(player.x, player.y, bulletAngle, this.stats.damage);
    }
    
    getCurrentSpread(player) {
        let baseSpread = 0;
        
        if (player.isSprinting) {
            baseSpread = this.stats.spreadSprint;
        } else if (player.isAiming) {
            if (player.isMoving) {
                baseSpread = this.stats.spreadWalkADS;
            } else {
                baseSpread = this.stats.spreadStillADS;
            }
        } else {
            if (player.isMoving) {
                baseSpread = this.stats.spreadWalk;
            } else {
                baseSpread = this.stats.spreadStill;
            }
        }
        
        if (player.isPeeking) {
            baseSpread *= 0.7;
        }
        
        return baseSpread + this.currentRecoil;
    }
    
    startReload() {
        if (this.isReloading) return;
        if (this.currentAmmo === this.stats.magSize) return;
        if (this.reserveAmmo <= 0) return;
        
        this.isReloading = true;
        this.reloadTimer = this.stats.reloadTime;
    }
    
    update(deltaTime) {
        if (this.isReloading) {
            this.reloadTimer -= deltaTime;
            
            if (this.reloadTimer <= 0) {
                this.finishReload();
            }
        }
        
        if (this.currentRecoil > 0) {
            this.currentRecoil = Math.max(0, this.currentRecoil - this.stats.recoilDecay * deltaTime);
        }
    }
    
    finishReload() {
        const ammoNeeded = this.stats.magSize - this.currentAmmo;
        const ammoToReload = Math.min(ammoNeeded, this.reserveAmmo);
        
        this.currentAmmo += ammoToReload;
        this.reserveAmmo -= ammoToReload;
        
        this.isReloading = false;
        this.reloadTimer = 0;
    }
}

// ===== BULLET CLASS =====

class Bullet {
    constructor(x, y, angle, damage) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.damage = damage;
        this.speed = 800;
        this.alive = true;
        this.maxDistance = 1000;
        this.distanceTraveled = 0;
        
        this.length = 8;
        this.width = 3;
    }
    
    update(deltaTime) {
        if (!this.alive) return;
        
        const moveDistance = this.speed * deltaTime;
        
        this.x += Math.cos(this.angle) * moveDistance;
        this.y += Math.sin(this.angle) * moveDistance;
        this.distanceTraveled += moveDistance;
        
        if (this.checkCollision()) {
            this.alive = false;
            return;
        }
        
        if (this.distanceTraveled >= this.maxDistance) {
            this.alive = false;
            return;
        }
        
        if (this.x < 0 || this.x > MAP_WIDTH || this.y < 0 || this.y > MAP_HEIGHT) {
            this.alive = false;
        }
    }
    
    checkCollision() {
        for (const obs of obstacles) {
            if (obs.angle) {
                const obsCenterX = obs.x + obs.width / 2;
                const obsCenterY = obs.y + obs.height / 2;
                
                const dx = this.x - obsCenterX;
                const dy = this.y - obsCenterY;
                
                const cos = Math.cos(-obs.angle);
                const sin = Math.sin(-obs.angle);
                
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;
                
                if (Math.abs(localX) <= obs.width / 2 && 
                    Math.abs(localY) <= obs.height / 2) {
                    return true;
                }
            } else {
                if (this.x >= obs.x && this.x <= obs.x + obs.width &&
                    this.y >= obs.y && this.y <= obs.y + obs.height) {
                    return true;
                }
            }
        }
        return false;
    }
    
    draw(ctx) {
        if (!this.alive) return;
        
        const screenX = Camera.toScreenX(this.x);
        const screenY = Camera.toScreenY(this.y);
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);
        
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = this.width * Camera.zoom;
        ctx.beginPath();
        ctx.moveTo(-this.length * Camera.zoom, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, 2 * Camera.zoom, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// ===== MUZZLE FLASH =====

class MuzzleFlash {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.duration = 0.08;
        this.timer = this.duration;
        this.size = 20;
    }
    
    update(deltaTime) {
        this.timer -= deltaTime;
    }
    
    isActive() {
        return this.timer > 0;
    }
    
    draw(ctx) {
        if (!this.isActive()) return;
        
        const screenX = Camera.toScreenX(this.x);
        const screenY = Camera.toScreenY(this.y);
        const scaledSize = this.size * Camera.zoom;
        
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);
        
        const alpha = this.timer / this.duration;
        ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(scaledSize, -scaledSize / 2);
        ctx.lineTo(scaledSize, scaledSize / 2);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(scaledSize / 3, 0, scaledSize / 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
