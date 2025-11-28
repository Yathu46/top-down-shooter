// ===== MAP SYSTEM =====

const MapSystem = {
    currentMap: null,
    maps: {},

    init() {
        this.loadMaps();
        this.loadMap('warehouse');
    },

    loadMaps() {
        // Define all available maps
        this.maps = {
            warehouse: {
                name: 'Warehouse',
                width: 40,
                height: 40,
                tileSize: 50,
                playerSpawn: { x: 3, y: 3 },
                enemySpawns: [
                    { x: 35, y: 35 },
                    { x: 35, y: 5 },
                    { x: 5, y: 35 },
                    { x: 20, y: 20 }
                ],
                obstacles: this.createWarehouseObstacles()
            },

            bunker: {
                name: 'Bunker Complex',
                width: 40,
                height: 40,
                tileSize: 50,
                playerSpawn: { x: 5, y: 5 },
                enemySpawns: [
                    { x: 30, y: 30 },
                    { x: 10, y: 30 },
                    { x: 30, y: 10 }
                ],
                obstacles: this.createBunkerObstacles()
            },

            urban: {
                name: 'Urban Streets',
                width: 40,
                height: 40,
                tileSize: 50,
                playerSpawn: { x: 2, y: 20 },
                enemySpawns: [
                    { x: 38, y: 20 },
                    { x: 20, y: 5 },
                    { x: 20, y: 35 }
                ],
                obstacles: this.createUrbanObstacles()
            }
        };
    },

    loadMap(mapName) {
        if (!this.maps[mapName]) {
            console.error(`Map "${mapName}" not found!`);
            return false;
        }
        this.currentMap = this.maps[mapName];
        return true;
    },

    getObstacles() {
        return this.currentMap ? this.currentMap.obstacles : [];
    },

    getPlayerSpawn() {
        if (!this.currentMap) return { x: 150, y: 150 };
        return {
            x: this.currentMap.playerSpawn.x * this.currentMap.tileSize,
            y: this.currentMap.playerSpawn.y * this.currentMap.tileSize
        };
    },

    getEnemySpawns() {
        if (!this.currentMap) return [];
        return this.currentMap.enemySpawns.map(spawn => ({
            x: spawn.x * this.currentMap.tileSize,
            y: spawn.y * this.currentMap.tileSize
        }));
    },

    getMapDimensions() {
        if (!this.currentMap) return { width: 2000, height: 2000 };
        return {
            width: this.currentMap.width * this.currentMap.tileSize,
            height: this.currentMap.height * this.currentMap.tileSize
        };
    },

    // ===== WAREHOUSE MAP =====
    createWarehouseObstacles() {
        const obstacles = [];
        const TILE = 50;

        // Outer walls
        for (let x = 0; x < 40; x++) {
            obstacles.push({ x: x * TILE, y: 0, width: TILE, height: TILE, type: 'wall' });
            obstacles.push({ x: x * TILE, y: 39 * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        for (let y = 1; y < 39; y++) {
            obstacles.push({ x: 0, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
            obstacles.push({ x: 39 * TILE, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
        }

        // Central storage area
        obstacles.push({ x: 18 * TILE, y: 18 * TILE, width: TILE, height: TILE, type: 'wall' });
        obstacles.push({ x: 21 * TILE, y: 18 * TILE, width: TILE, height: TILE, type: 'wall' });
        obstacles.push({ x: 18 * TILE, y: 21 * TILE, width: TILE, height: TILE, type: 'wall' });
        obstacles.push({ x: 21 * TILE, y: 21 * TILE, width: TILE, height: TILE, type: 'wall' });

        // Scattered crates (cover)
        obstacles.push({ x: 5 * TILE, y: 10 * TILE, width: TILE * 2, height: TILE, type: 'cover' });
        obstacles.push({ x: 10 * TILE, y: 8 * TILE, width: TILE, height: TILE * 2, type: 'cover' });
        obstacles.push({ x: 30 * TILE, y: 10 * TILE, width: TILE * 2, height: TILE, type: 'cover' });
        obstacles.push({ x: 15 * TILE, y: 30 * TILE, width: TILE, height: TILE * 2, type: 'cover' });
        obstacles.push({ x: 33 * TILE, y: 33 * TILE, width: TILE * 2, height: TILE, type: 'cover' });

        // L-shaped corner structure
        for (let i = 0; i < 3; i++) {
            obstacles.push({ x: (25 + i) * TILE, y: 25 * TILE, width: TILE, height: TILE, type: 'wall' });
            obstacles.push({ x: 25 * TILE, y: (25 + i) * TILE, width: TILE, height: TILE, type: 'wall' });
        }

        // Angled walls for variety
        obstacles.push({
            x: 12 * TILE,
            y: 15 * TILE,
            width: TILE * 3,
            height: TILE * 1.5,
            angle: Math.PI / 4,
            type: 'wall'
        });

        obstacles.push({
            x: 28 * TILE,
            y: 20 * TILE,
            width: TILE * 3,
            height: TILE * 1.5,
            angle: -Math.PI / 4,
            type: 'wall'
        });

        obstacles.push({
            x: 8 * TILE,
            y: 28 * TILE,
            width: TILE * 2.5,
            height: TILE * 1.5,
            angle: Math.PI / 6,
            type: 'cover'
        });

        // Vertical corridor walls
        for (let i = 0; i < 4; i++) {
            obstacles.push({ x: 20 * TILE, y: (10 + i) * TILE, width: TILE, height: TILE, type: 'wall' });
        }

        // Horizontal corridor walls
        for (let i = 0; i < 4; i++) {
            obstacles.push({ x: (14 + i) * TILE, y: 25 * TILE, width: TILE, height: TILE, type: 'wall' });
        }

        return obstacles;
    },

    // ===== BUNKER MAP =====
    createBunkerObstacles() {
        const obstacles = [];
        const TILE = 50;

        // Outer walls
        for (let x = 0; x < 40; x++) {
            obstacles.push({ x: x * TILE, y: 0, width: TILE, height: TILE, type: 'wall' });
            obstacles.push({ x: x * TILE, y: 39 * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        for (let y = 1; y < 39; y++) {
            obstacles.push({ x: 0, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
            obstacles.push({ x: 39 * TILE, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
        }

        // Room 1 (top-left)
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: 12 * TILE, y: (3 + i) * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: (3 + i) * TILE, y: 12 * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        // Door
        obstacles.splice(obstacles.length - 3, 2);

        // Room 2 (top-right)
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: 27 * TILE, y: (3 + i) * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: (28 + i) * TILE, y: 12 * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        obstacles.splice(obstacles.length - 7, 2);

        // Room 3 (bottom-left)
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: 12 * TILE, y: (27 + i) * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: (3 + i) * TILE, y: 27 * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        obstacles.splice(obstacles.length - 3, 2);

        // Room 4 (bottom-right)
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: 27 * TILE, y: (27 + i) * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        for (let i = 0; i < 10; i++) {
            obstacles.push({ x: (28 + i) * TILE, y: 27 * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        obstacles.splice(obstacles.length - 7, 2);

        // Central pillars
        obstacles.push({ x: 18 * TILE, y: 18 * TILE, width: TILE * 2, height: TILE * 2, type: 'wall' });
        obstacles.push({ x: 20 * TILE, y: 20 * TILE, width: TILE * 2, height: TILE * 2, type: 'wall' });

        // Cover in hallways
        obstacles.push({ x: 15 * TILE, y: 19 * TILE, width: TILE, height: TILE, type: 'cover' });
        obstacles.push({ x: 24 * TILE, y: 19 * TILE, width: TILE, height: TILE, type: 'cover' });
        obstacles.push({ x: 19 * TILE, y: 15 * TILE, width: TILE, height: TILE, type: 'cover' });
        obstacles.push({ x: 19 * TILE, y: 24 * TILE, width: TILE, height: TILE, type: 'cover' });

        return obstacles;
    },

    // ===== URBAN MAP =====
    createUrbanObstacles() {
        const obstacles = [];
        const TILE = 50;

        // Outer walls
        for (let x = 0; x < 40; x++) {
            obstacles.push({ x: x * TILE, y: 0, width: TILE, height: TILE, type: 'wall' });
            obstacles.push({ x: x * TILE, y: 39 * TILE, width: TILE, height: TILE, type: 'wall' });
        }
        for (let y = 1; y < 39; y++) {
            obstacles.push({ x: 0, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
            obstacles.push({ x: 39 * TILE, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
        }

        // Building 1 (top)
        for (let x = 5; x < 15; x++) {
            for (let y = 5; y < 12; y++) {
                obstacles.push({ x: x * TILE, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
            }
        }

        // Building 2 (right)
        for (let x = 28; x < 35; x++) {
            for (let y = 8; y < 18; y++) {
                obstacles.push({ x: x * TILE, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
            }
        }

        // Building 3 (bottom-left)
        for (let x = 5; x < 12; x++) {
            for (let y = 28; y < 35; y++) {
                obstacles.push({ x: x * TILE, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
            }
        }

        // Building 4 (center-right)
        for (let x = 20; x < 26; x++) {
            for (let y = 25; y < 32; y++) {
                obstacles.push({ x: x * TILE, y: y * TILE, width: TILE, height: TILE, type: 'wall' });
            }
        }

        // Street cover (cars, barriers)
        obstacles.push({ x: 10 * TILE, y: 18 * TILE, width: TILE * 3, height: TILE * 1.5, type: 'cover' });
        obstacles.push({ x: 25 * TILE, y: 15 * TILE, width: TILE * 2, height: TILE, type: 'cover' });
        obstacles.push({ x: 15 * TILE, y: 28 * TILE, width: TILE * 1.5, height: TILE * 2, type: 'cover' });
        obstacles.push({ x: 18 * TILE, y: 10 * TILE, width: TILE * 2, height: TILE, type: 'cover' });

        // Angled vehicles
        obstacles.push({
            x: 12 * TILE,
            y: 22 * TILE,
            width: TILE * 3,
            height: TILE * 1.5,
            angle: Math.PI / 6,
            type: 'cover'
        });

        obstacles.push({
            x: 30 * TILE,
            y: 22 * TILE,
            width: TILE * 2.5,
            height: TILE,
            angle: -Math.PI / 8,
            type: 'cover'
        });

        return obstacles;
    }
};