// ===== INPUT MANAGER =====

const Input = {
    keys: {},
    
    mouse: {
        x: 0,
        y: 0,
        isDown: false,
        rightDown: false
    },
    
    leftJoystick: {
        active: false,
        x: 0,
        y: 0,
        startX: 0,
        startY: 0,
        touchId: null,
        sprinting: false
    },
    
    rightJoystick: {
        active: false,
        x: 0,
        y: 0,
        startX: 0,
        startY: 0,
        touchId: null,
        aiming: false
    },
    
    isMobile: false,
    reloadPressed: false,
    
    init() {
        this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        if (this.isMobile) {
            document.getElementById('mobile-controls').style.display = 'block';
            this.initTouchControls();
        }
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.mouse.isDown = true;
            if (e.button === 2) this.mouse.rightDown = true;
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) this.mouse.isDown = false;
            if (e.button === 2) this.mouse.rightDown = false;
        });
        
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        const reloadBtn = document.getElementById('reload-btn');
        if (reloadBtn) {
            reloadBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.reloadPressed = true;
            });
            reloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.reloadPressed = true;
            });
        }
    },
    
    initTouchControls() {
        const leftArea = document.getElementById('left-joystick-area');
        const rightArea = document.getElementById('right-joystick-area');
        
        leftArea.addEventListener('touchstart', (e) => this.handleJoystickStart(e, 'left'), {passive: false});
        leftArea.addEventListener('touchmove', (e) => this.handleJoystickMove(e, 'left'), {passive: false});
        leftArea.addEventListener('touchend', (e) => this.handleJoystickEnd(e, 'left'), {passive: false});
        
        rightArea.addEventListener('touchstart', (e) => this.handleJoystickStart(e, 'right'), {passive: false});
        rightArea.addEventListener('touchmove', (e) => this.handleJoystickMove(e, 'right'), {passive: false});
        rightArea.addEventListener('touchend', (e) => this.handleJoystickEnd(e, 'right'), {passive: false});
    },
    
    handleJoystickStart(e, side) {
        e.preventDefault();
        const touch = e.touches[0];
        const joystick = side === 'left' ? this.leftJoystick : this.rightJoystick;
        
        joystick.active = true;
        joystick.touchId = touch.identifier;
        joystick.startX = touch.clientX;
        joystick.startY = touch.clientY;
    },
    
    handleJoystickMove(e, side) {
        e.preventDefault();
        const joystick = side === 'left' ? this.leftJoystick : this.rightJoystick;
        
        if (!joystick.active) return;
        
        const touch = Array.from(e.touches).find(t => t.identifier === joystick.touchId);
        if (!touch) return;
        
        const maxRadius = 75;
        const deltaX = touch.clientX - joystick.startX;
        const deltaY = touch.clientY - joystick.startY;
        const dist = Math.sqrt(deltaX ** 2 + deltaY ** 2);
        
        if (dist > maxRadius) {
            const angle = Math.atan2(deltaY, deltaX);
            joystick.x = Math.cos(angle) * maxRadius;
            joystick.y = Math.sin(angle) * maxRadius;
        } else {
            joystick.x = deltaX;
            joystick.y = deltaY;
        }
        
        const stick = document.getElementById(`${side}-joystick-stick`);
        stick.style.transform = `translate(calc(-50% + ${joystick.x}px), calc(-50% + ${joystick.y}px))`;
    },
    
    handleJoystickEnd(e, side) {
        e.preventDefault();
        const joystick = side === 'left' ? this.leftJoystick : this.rightJoystick;
        
        joystick.active = false;
        joystick.x = 0;
        joystick.y = 0;
        joystick.sprinting = false;
        joystick.aiming = false;
        
        const stick = document.getElementById(`${side}-joystick-stick`);
        stick.style.transform = 'translate(-50%, -50%)';
    },
    
    getMovementX() {
        if (this.isMobile && this.leftJoystick.active) {
            return this.leftJoystick.x / 75;
        }
        
        let x = 0;
        if (this.keys['a'] || this.keys['arrowleft']) x -= 1;
        if (this.keys['d'] || this.keys['arrowright']) x += 1;
        return x;
    },
    
    getMovementY() {
        if (this.isMobile && this.leftJoystick.active) {
            return this.leftJoystick.y / 75;
        }
        
        let y = 0;
        if (this.keys['w'] || this.keys['arrowup']) y -= 1;
        if (this.keys['s'] || this.keys['arrowdown']) y += 1;
        return y;
    },
    
    isSprinting() {
        if (this.isMobile) {
            return this.leftJoystick.sprinting;
        }
        return this.keys['shift'];
    }
};
