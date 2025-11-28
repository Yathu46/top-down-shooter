// ===== PLAYER CLASS =====

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        
        this.walkSpeed = 200;
        this.sprintSpeed = 350;
        this.adsSpeed = 120;
        this.currentSpeed = this.walkSpeed;
        
        this.angle = 0;
        
        this.isSprinting = false;
        this.isAiming = false;
        this.isPeeking = false;
        this.isMoving = false;
        
        this.health = 100;
        this.maxHealth = 100;
        
        this.peekDetectDistance = 20;
        this.nearWall = null;
        
        this.weapon = new Weapon('assault_rifle');
    }
    
    update(deltaTime) {
        const moveX = Input.getMovementX();
        const moveY = Input.getMovementY();
        
        this.isMoving = (moveX !== 0 || moveY !== 0);
        
        let wantsToAim = false;
        if (Input.isMobile) {
            wantsToAim = Input.rightJoystick.active;
            if (Input.rightJoystick.active) {
                this.angle = Math.atan2(Input.rightJoystick.y, Input.rightJoystick.x);
            }
        } else {
            wantsToAim = Input.mouse.rightDown;
            
            const worldMouseX = Camera.toWorldX(Input.mouse.x);
            const worldMouseY = Camera.toWorldY(Input.mouse.y);
            
            const dx = worldMouseX - this.x;
            const dy = worldMouseY - this.y;
            this.angle = Math.atan2(dy, dx);
        }
        
        this.isSprinting = Input.isSprinting() && this.isMoving && !wantsToAim;
        this.isAiming = wantsToAim && !this.isSprinting;
        
        this.nearWall = this.checkNearWall();
        
        if (this.nearWall && this.isAiming && !this.isMoving) {
            this.isPeeking = true;
        } else {
            this.isPeeking = false;
        }
        
        if (this.isSprinting) {
            this.currentSpeed = this.sprintSpeed;
        } else if (this.isAiming) {
            this.currentSpeed = this.adsSpeed;
        } else {
            this.currentSpeed = this.walkSpeed;
        }
        
        if (this.isMoving) {
            const magnitude = Math.sqrt(moveX ** 2 + moveY ** 2);
            const normX = moveX / magnitude;
            const normY = moveY / magnitude;
            
            const newX = this.x + normX * this.currentSpeed * deltaTime;
            const newY = this.y + normY * this.currentSpeed * deltaTime;
            
            const size = this.radius * 2;
            
            if (!checkCollision(newX - this.radius, this.y - this.radius, size, size)) {
                this.x = newX;
            }
            
            if (!checkCollision(this.x - this.radius, newY - this.radius, size, size)) {
                this.y = newY;
            }
        }
        
        this.x = clamp(this.x, this.radius, MAP_WIDTH - this.radius);
        this.y = clamp(this.y, this.radius, MAP_HEIGHT - this.radius);
        
        this.weapon.update(deltaTime);
        
        if (this.canShoot()) {
            const bullet = this.weapon.fire(this);
            if (bullet) {
                let gunOffsetX = 0;
                let gunOffsetY = 0;
                
                if (this.isPeeking && this.nearWall) {
                    const peekOffset = this.getPeekOffset();
                    gunOffsetX = peekOffset.x;
                    gunOffsetY = peekOffset.y;
                }
                
                const spawnX = this.x + gunOffsetX + Math.cos(this.angle) * (this.radius + 10);
                const spawnY = this.y + gunOffsetY + Math.sin(this.angle) * (this.radius + 10);
                
                bullet.x = spawnX;
                bullet.y = spawnY;
                
                bullets.push(bullet);
                muzzleFlashes.push(new MuzzleFlash(spawnX, spawnY, this.angle));
            }
        }
        
        if (Input.keys['r'] || Input.reloadPressed) {
            this.weapon.startReload();
            Input.reloadPressed = false;
        }
        
        if (this.weapon.currentAmmo === 0 && !this.weapon.isReloading) {
            this.weapon.startReload();
        }
    }
    
    checkNearWall() {
        let closestWall = null;
        let closestDist = this.peekDetectDistance;
        
        for (const obs of obstacles) {
            if (obs.type !== 'wall' && obs.type !== 'cover') continue;
            
            if (obs.angle) {
                const obsCenterX = obs.x + obs.width / 2;
                const obsCenterY = obs.y + obs.height / 2;
                
                const dx = this.x - obsCenterX;
                const dy = this.y - obsCenterY;
                
                const cos = Math.cos(-obs.angle);
                const sin = Math.sin(-obs.angle);
                
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;
                
                const halfWidth = obs.width / 2;
                const halfHeight = obs.height / 2;
                
                if (Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight) {
                    continue;
                }
                
                const distToRight = localX - halfWidth;
                const distToLeft = -halfWidth - localX;
                const distToBottom = localY - halfHeight;
                const distToTop = -halfHeight - localY;
                
                const inXRange = Math.abs(localY) <= halfHeight + this.peekDetectDistance;
                const inYRange = Math.abs(localX) <= halfWidth + this.peekDetectDistance;
                
                if (distToRight > 0 && distToRight < closestDist && inXRange) {
                    closestDist = distToRight;
                    closestWall = { obstacle: obs, side: 'right', dist: distToRight, rotated: true };
                }
                if (distToLeft > 0 && distToLeft < closestDist && inXRange) {
                    closestDist = distToLeft;
                    closestWall = { obstacle: obs, side: 'left', dist: distToLeft, rotated: true };
                }
                if (distToBottom > 0 && distToBottom < closestDist && inYRange) {
                    closestDist = distToBottom;
                    closestWall = { obstacle: obs, side: 'bottom', dist: distToBottom, rotated: true };
                }
                if (distToTop > 0 && distToTop < closestDist && inYRange) {
                    closestDist = distToTop;
                    closestWall = { obstacle: obs, side: 'top', dist: distToTop, rotated: true };
                }
                
            } else {
                if (this.x >= obs.x + 5 && this.x <= obs.x + obs.width - 5 &&
                    this.y >= obs.y + 5 && this.y <= obs.y + obs.height - 5) {
                    continue;
                }
                
                const margin = this.peekDetectDistance;
                const inXRange = this.x >= obs.x - margin && this.x <= obs.x + obs.width + margin;
                const inYRange = this.y >= obs.y - margin && this.y <= obs.y + obs.height + margin;
                
                const distToLeft = obs.x - this.x;
                const distToRight = this.x - (obs.x + obs.width);
                const distToTop = obs.y - this.y;
                const distToBottom = this.y - (obs.y + obs.height);
                
                if (distToLeft > 0 && distToLeft < closestDist && inYRange) {
                    closestDist = distToLeft;
                    closestWall = { obstacle: obs, side: 'left', dist: distToLeft, rotated: false };
                }
                
                if (distToRight > 0 && distToRight < closestDist && inYRange) {
                    closestDist = distToRight;
                    closestWall = { obstacle: obs, side: 'right', dist: distToRight, rotated: false };
                }
                
                if (distToTop > 0 && distToTop < closestDist && inXRange) {
                    closestDist = distToTop;
                    closestWall = { obstacle: obs, side: 'top', dist: distToTop, rotated: false };
                }
                
                if (distToBottom > 0 && distToBottom < closestDist && inXRange) {
                    closestDist = distToBottom;
                    closestWall = { obstacle: obs, side: 'bottom', dist: distToBottom, rotated: false };
                }
            }
        }
        
        return closestWall;
    }
    
    getPeekOffset() {
        if (!this.nearWall) return { x: 0, y: 0 };
        
        const peekShift = 8;
        
        switch (this.nearWall.side) {
            case 'left':
                return { x: -peekShift, y: 0 };
            case 'right':
                return { x: peekShift, y: 0 };
            case 'top':
                return { x: 0, y: -peekShift };
            case 'bottom':
                return { x: 0, y: peekShift };
            default:
                return { x: 0, y: 0 };
        }
    }
    
    canShoot() {
        if (Input.isMobile) {
            const dist = Math.sqrt(Input.rightJoystick.x ** 2 + Input.rightJoystick.y ** 2);
            return dist > 65;
        } else {
            return Input.mouse.isDown;
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        const screenX = Camera.toScreenX(this.x);
        const screenY = Camera.toScreenY(this.y);
        const scaledRadius = this.radius * Camera.zoom;
        
        if (this.isPeeking) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.lineWidth = 2 * Camera.zoom;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(screenX, screenY, scaledRadius + 3 * Camera.zoom, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        const bodyRadius = this.isPeeking ? scaledRadius * 0.7 : scaledRadius;
        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.arc(screenX, screenY, bodyRadius, 0, Math.PI * 2);
        ctx.fill();
        
        let gunColor = '#2ecc71';
        if (this.isSprinting) {
            gunColor = '#e74c3c';
        } else if (this.isAiming) {
            gunColor = '#00ff00';
        }
        
        let gunBaseX = screenX;
        let gunBaseY = screenY;
        
        if (this.isPeeking && this.nearWall) {
            const peekOffset = this.getPeekOffset();
            gunBaseX += peekOffset.x * Camera.zoom;
            gunBaseY += peekOffset.y * Camera.zoom;
        }
        
        ctx.strokeStyle = gunColor;
        ctx.lineWidth = 4 * Camera.zoom;
        ctx.beginPath();
        ctx.moveTo(gunBaseX, gunBaseY);
        ctx.lineTo(
            gunBaseX + Math.cos(this.angle) * (scaledRadius + 15 * Camera.zoom),
            gunBaseY + Math.sin(this.angle) * (scaledRadius + 15 * Camera.zoom)
        );
        ctx.stroke();
        
        if (this.isSprinting) {
            ctx.strokeStyle = '#f39c12';
            ctx.lineWidth = 2 * Camera.zoom;
            ctx.beginPath();
            ctx.arc(screenX, screenY, scaledRadius + 5 * Camera.zoom, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (this.isAiming && !this.isPeeking) {
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 1 * Camera.zoom;
            ctx.beginPath();
            ctx.arc(screenX, screenY, scaledRadius + 8 * Camera.zoom, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        const barWidth = 40 * Camera.zoom;
        const barHeight = 5 * Camera.zoom;
        const barX = screenX - barWidth / 2;
        const barY = screenY - scaledRadius - 15 * Camera.zoom;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(barX, barY, (this.health / this.maxHealth) * barWidth, barHeight);
        
        ctx.restore();
    }
}
