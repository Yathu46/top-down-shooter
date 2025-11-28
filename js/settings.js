// ===== SETTINGS SYSTEM =====

const Settings = {
    isOpen: false,

    // Default values
    defaults: {
        // Player settings
        playerWalkSpeed: 200,
        playerSprintSpeed: 350,
        playerAdsSpeed: 120,
        playerHealth: 100,

        // Camera settings
        cameraNormalZoom: 1.8,
        cameraAdsZoom: 1.3,
        cameraZoomSpeed: 0.15,
        cameraSmoothness: 0.12,

        // Weapon settings
        bulletSpeed: 800,
        weaponFireRate: 600,
        weaponDamage: 25,
        weaponMagSize: 30,
        weaponReloadTime: 2.2,
        weaponRecoil: 1.5,

        // Vision settings
        visionRangeNormal: 300,
        visionRangeAds: 450,
        visionAngleNormal: 60,
        visionAngleAds: 70,
        visionRays: 60,

        // Fog settings
        fogOpacity: 0.95,
        personalRadius: 80,

        // Graphics settings
        gridOpacity: 0.2,
        enableMuzzleFlash: true,
        muzzleFlashDuration: 0.08
    },

    current: {},

    init() {
        this.current = { ...this.defaults };
        this.createSettingsPanel();
        this.setupEventListeners();
    },

    createSettingsPanel() {
        const container = document.getElementById('settingsPanel');
        if (!container) return;

        container.innerHTML = `
            <div class="settings-overlay" id="settingsOverlay">
                <div class="settings-modal">
                    <div class="settings-header">
                        <h2>⚙️ Game Settings</h2>
                        <button class="close-btn" id="closeSettingsBtn">✕</button>
                    </div>

                    <div class="settings-content">
                        <div class="settings-tabs">
                            <button class="tab-btn active" data-tab="player">Player</button>
                            <button class="tab-btn" data-tab="camera">Camera</button>
                            <button class="tab-btn" data-tab="weapon">Weapon</button>
                            <button class="tab-btn" data-tab="vision">Vision</button>
                            <button class="tab-btn" data-tab="graphics">Graphics</button>
                        </div>

                        <div class="settings-sections">
                            ${this.createPlayerSettings()}
                            ${this.createCameraSettings()}
                            ${this.createWeaponSettings()}
                            ${this.createVisionSettings()}
                            ${this.createGraphicsSettings()}
                        </div>
                    </div>

                    <div class="settings-footer">
                        <button class="btn-secondary" id="resetSettingsBtn">Reset to Default</button>
                        <button class="btn-primary" id="applySettingsBtn">Apply Changes</button>
                    </div>
                </div>
            </div>
        `;
    },

    createPlayerSettings() {
        return `
            <div class="settings-section active" data-section="player">
                <h3>Player Settings</h3>
                ${this.createSlider('playerWalkSpeed', 'Walk Speed', 100, 400, 10, 'Normal movement speed in pixels per second')}
                ${this.createSlider('playerSprintSpeed', 'Sprint Speed', 200, 600, 10, 'Speed when holding Shift key')}
                ${this.createSlider('playerAdsSpeed', 'ADS Speed', 50, 200, 5, 'Movement speed while aiming down sights')}
                ${this.createSlider('playerHealth', 'Max Health', 50, 200, 10, 'Starting and maximum health points')}
            </div>
        `;
    },

    createCameraSettings() {
        return `
            <div class="settings-section" data-section="camera">
                <h3>Camera Settings</h3>
                ${this.createSlider('cameraNormalZoom', 'Normal Zoom', 1.0, 3.0, 0.1, 'Camera zoom level when not aiming. Higher = more zoomed in')}
                ${this.createSlider('cameraAdsZoom', 'ADS Zoom', 0.8, 2.5, 0.1, 'Camera zoom when aiming. Lower = more zoomed out (better view)')}
                ${this.createSlider('cameraZoomSpeed', 'Zoom Speed', 0.05, 0.5, 0.05, 'How fast camera transitions between zoom levels')}
                ${this.createSlider('cameraSmoothness', 'Camera Smoothness', 0.05, 0.3, 0.01, 'Camera follow smoothness. Lower = smoother but more lag')}
            </div>
        `;
    },

    createWeaponSettings() {
        return `
            <div class="settings-section" data-section="weapon">
                <h3>Weapon Settings</h3>
                ${this.createSlider('bulletSpeed', 'Bullet Speed', 400, 1500, 50, 'Projectile velocity in pixels per second')}
                ${this.createSlider('weaponFireRate', 'Fire Rate (RPM)', 300, 1200, 50, 'Rounds per minute. Higher = faster shooting')}
                ${this.createSlider('weaponDamage', 'Damage per Shot', 10, 100, 5, 'Damage dealt by each bullet')}
                ${this.createSlider('weaponMagSize', 'Magazine Size', 10, 60, 5, 'Bullets per magazine before reload')}
                ${this.createSlider('weaponReloadTime', 'Reload Time', 0.5, 5.0, 0.1, 'Time to reload in seconds')}
                ${this.createSlider('weaponRecoil', 'Recoil per Shot', 0.5, 5.0, 0.5, 'Spread increase per shot fired')}
            </div>
        `;
    },

    createVisionSettings() {
        return `
            <div class="settings-section" data-section="vision">
                <h3>Vision & Fog of War</h3>
                ${this.createSlider('visionRangeNormal', 'Normal Vision Range', 100, 600, 25, 'Flashlight range when not aiming')}
                ${this.createSlider('visionRangeAds', 'ADS Vision Range', 150, 800, 25, 'Extended flashlight range when aiming')}
                ${this.createSlider('visionAngleNormal', 'Normal Vision Angle', 30, 120, 5, 'Flashlight cone width in degrees (normal)')}
                ${this.createSlider('visionAngleAds', 'ADS Vision Angle', 30, 120, 5, 'Flashlight cone width when aiming')}
                ${this.createSlider('visionRays', 'Vision Quality', 20, 120, 10, 'Raycasting precision. Higher = smoother edges but slower')}
                ${this.createSlider('personalRadius', 'Personal Light Radius', 40, 150, 5, 'Small circle of light always around player')}
                ${this.createSlider('fogOpacity', 'Fog Darkness', 0.5, 1.0, 0.05, 'How dark the fog is. 1.0 = completely black')}
            </div>
        `;
    },

    createGraphicsSettings() {
        return `
            <div class="settings-section" data-section="graphics">
                <h3>Graphics & Effects</h3>
                ${this.createSlider('gridOpacity', 'Grid Visibility', 0.0, 1.0, 0.1, 'Map grid line opacity. 0 = invisible')}
                ${this.createCheckbox('enableMuzzleFlash', 'Enable Muzzle Flash', 'Show flash effect when shooting')}
                ${this.createSlider('muzzleFlashDuration', 'Flash Duration', 0.02, 0.2, 0.01, 'How long muzzle flash appears (seconds)')}
            </div>
        `;
    },

    createSlider(id, label, min, max, step, tooltip) {
        const value = this.current[id] || this.defaults[id];
        return `
            <div class="setting-item" data-tooltip="${tooltip}">
                <label for="${id}">${label}</label>
                <div class="slider-container">
                    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
                    <span class="value-display" id="${id}-value">${value}</span>
                </div>
            </div>
        `;
    },

    createCheckbox(id, label, tooltip) {
        const checked = this.current[id] !== undefined ? this.current[id] : this.defaults[id];
        return `
            <div class="setting-item" data-tooltip="${tooltip}">
                <label for="${id}">${label}</label>
                <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
            </div>
        `;
    },

    setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // Slider value updates
        document.addEventListener('input', (e) => {
            if (e.target.type === 'range') {
                const valueDisplay = document.getElementById(e.target.id + '-value');
                if (valueDisplay) {
                    valueDisplay.textContent = e.target.value;
                }
            }
        });

        // Close button
        document.getElementById('closeSettingsBtn')?.addEventListener('click', () => {
            this.hide();
        });

        // Apply button
        document.getElementById('applySettingsBtn')?.addEventListener('click', () => {
            this.apply();
        });

        // Reset button
        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => {
            this.reset();
        });

        // Close on overlay click
        document.getElementById('settingsOverlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'settingsOverlay') {
                this.hide();
            }
        });
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

        // Update sections
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelector(`[data-section="${tabName}"]`)?.classList.add('active');
    },

    show() {
        document.getElementById('settingsOverlay').style.display = 'flex';
        this.isOpen = true;
    },

    hide() {
        document.getElementById('settingsOverlay').style.display = 'none';
        this.isOpen = false;
        if (GameState.isPaused) {
            GameState.resume();
        }
    },

    apply() {
        // Read all values from inputs
        Object.keys(this.defaults).forEach(key => {
            const input = document.getElementById(key);
            if (input) {
                if (input.type === 'checkbox') {
                    this.current[key] = input.checked;
                } else if (input.type === 'range') {
                    this.current[key] = parseFloat(input.value);
                }
            }
        });

        // Apply to game
        this.applyToGame();

        // Show feedback
        const applyBtn = document.getElementById('applySettingsBtn');
        const originalText = applyBtn.textContent;
        applyBtn.textContent = '✓ Applied!';
        applyBtn.style.background = '#27ae60';

        setTimeout(() => {
            applyBtn.textContent = originalText;
            applyBtn.style.background = '';
        }, 1500);
    },

    applyToGame() {
        const s = this.current;

        // Apply player settings
        if (player) {
            player.walkSpeed = s.playerWalkSpeed;
            player.sprintSpeed = s.playerSprintSpeed;
            player.adsSpeed = s.playerAdsSpeed;
            player.maxHealth = s.playerHealth;
            if (player.health > s.playerHealth) player.health = s.playerHealth;
        }

        // Apply camera settings
        Camera.normalZoom = s.cameraNormalZoom;
        Camera.adsZoom = s.cameraAdsZoom;
        Camera.zoomSpeed = s.cameraZoomSpeed;
        Camera.smoothness = s.cameraSmoothness;

        // Apply weapon settings
        if (player && player.weapon) {
            player.weapon.stats.damage = s.weaponDamage;
            player.weapon.stats.fireRate = s.weaponFireRate;
            player.weapon.stats.magSize = s.weaponMagSize;
            player.weapon.stats.reloadTime = s.weaponReloadTime;
            player.weapon.stats.recoilPerShot = s.weaponRecoil;
        }

        // Apply bullet speed (affects new bullets)
        window.BULLET_SPEED = s.bulletSpeed;

        // Apply vision settings
        FogOfWar.normalVisionRange = s.visionRangeNormal;
        FogOfWar.adsVisionRange = s.visionRangeAds;
        FogOfWar.normalVisionAngle = s.visionAngleNormal;
        FogOfWar.adsVisionAngle = s.visionAngleAds;
        FogOfWar.rays = s.visionRays;
        FogOfWar.personalRadius = s.personalRadius;

        // Apply graphics settings
        window.GRID_OPACITY = s.gridOpacity;
        window.ENABLE_MUZZLE_FLASH = s.enableMuzzleFlash;
        window.MUZZLE_FLASH_DURATION = s.muzzleFlashDuration;

        console.log('Settings applied successfully');
    },

    reset() {
        if (confirm('Reset all settings to default values?')) {
            this.current = { ...this.defaults };

            // Update all inputs
            Object.keys(this.defaults).forEach(key => {
                const input = document.getElementById(key);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = this.defaults[key];
                    } else if (input.type === 'range') {
                        input.value = this.defaults[key];
                        const valueDisplay = document.getElementById(key + '-value');
                        if (valueDisplay) {
                            valueDisplay.textContent = this.defaults[key];
                        }
                    }
                }
            });

            this.applyToGame();
        }
    }
};