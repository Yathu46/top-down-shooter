// ===== FOG OF WAR & TORCH VISION =====

const FogOfWar = {
    normalVisionRange: 300,      // Normal vision range
    adsVisionRange: 450,          // INCREASED range when aiming (50% more)
    normalVisionAngle: 60,        // Normal cone angle
    adsVisionAngle: 70,           // Slightly wider cone when aiming
    rays: 60,
    personalRadius: 80,

    draw(ctx, player) {
        const fogCanvas = document.createElement('canvas');
        fogCanvas.width = canvas.width;
        fogCanvas.height = canvas.height;
        const fogCtx = fogCanvas.getContext('2d');

        fogCtx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        fogCtx.fillRect(0, 0, canvas.width, canvas.height);

        fogCtx.globalCompositeOperation = 'destination-out';
        this.drawPersonalRadius(fogCtx, player);
        this.drawTorchCone(fogCtx, player);

        ctx.drawImage(fogCanvas, 0, 0);
    },

    drawPersonalRadius(ctx, player) {
        const screenX = Camera.toScreenX(player.x);
        const screenY = Camera.toScreenY(player.y);
        const scaledRadius = this.personalRadius * Camera.zoom;

        const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, scaledRadius);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, scaledRadius, 0, Math.PI * 2);
        ctx.fill();
    },

    drawTorchCone(ctx, player) {
        const screenX = Camera.toScreenX(player.x);
        const screenY = Camera.toScreenY(player.y);

        // UPDATED: Use different vision range based on ADS state
        const currentVisionRange = player.isAiming ? this.adsVisionRange : this.normalVisionRange;
        const currentVisionAngle = player.isAiming ? this.adsVisionAngle : this.normalVisionAngle;
        const scaledRange = currentVisionRange * Camera.zoom;

        ctx.beginPath();
        ctx.moveTo(screenX, screenY);

        const halfAngle = toRadians(currentVisionAngle / 2);
        const startAngle = player.angle - halfAngle;
        const endAngle = player.angle + halfAngle;
        const angleStep = (endAngle - startAngle) / this.rays;

        const points = [];
        for (let i = 0; i <= this.rays; i++) {
            const angle = startAngle + angleStep * i;
            // UPDATED: Pass current vision range to raycast
            const rayEnd = this.castRay(player.x, player.y, angle, currentVisionRange);
            const rayScreenX = Camera.toScreenX(rayEnd.x);
            const rayScreenY = Camera.toScreenY(rayEnd.y);
            points.push({ x: rayScreenX, y: rayScreenY });
        }

        points.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });

        ctx.closePath();

        const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, scaledRange);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

        ctx.fillStyle = gradient;
        ctx.fill();
    },

    castRay(startX, startY, angle, maxDistance) {
        const stepSize = 5;
        let currentX = startX;
        let currentY = startY;
        const dx = Math.cos(angle) * stepSize;
        const dy = Math.sin(angle) * stepSize;

        for (let dist = 0; dist < maxDistance; dist += stepSize) {
            currentX += dx;
            currentY += dy;

            const hitObstacle = this.checkRayHit(currentX, currentY);
            if (hitObstacle) {
                return { x: currentX, y: currentY };
            }

            if (currentX < 0 || currentX > MAP_WIDTH || currentY < 0 || currentY > MAP_HEIGHT) {
                return { x: currentX, y: currentY };
            }
        }

        return {
            x: startX + Math.cos(angle) * maxDistance,
            y: startY + Math.sin(angle) * maxDistance
        };
    },

    checkRayHit(x, y) {
        for (const obs of obstacles) {
            if (obs.angle) {
                const obsCenterX = obs.x + obs.width / 2;
                const obsCenterY = obs.y + obs.height / 2;
                const dx = x - obsCenterX;
                const dy = y - obsCenterY;
                const cos = Math.cos(-obs.angle);
                const sin = Math.sin(-obs.angle);
                const localX = dx * cos - dy * sin;
                const localY = dx * sin + dy * cos;

                if (Math.abs(localX) <= obs.width / 2 &&
                    Math.abs(localY) <= obs.height / 2) {
                    return true;
                }
            } else {
                if (x >= obs.x && x <= obs.x + obs.width &&
                    y >= obs.y && y <= obs.y + obs.height) {
                    return true;
                }
            }
        }
        return false;
    }
};