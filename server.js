// ===== MULTIPLAYER SERVER (Node.js + Socket.IO) =====

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const path = require('path');

// Serve static files
app.use(express.static(path.join(__dirname)));

// Room management
const rooms = new Map();
const MAX_PLAYERS_PER_ROOM = 2; // Will expand to 8 later

// Generate room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // CREATE ROOM
    socket.on('create-room', (data) => {
        const roomCode = generateRoomCode();
        const playerName = data.playerName || 'Player';

        rooms.set(roomCode, {
            code: roomCode,
            host: socket.id,
            players: new Map(),
            gameState: 'waiting', // waiting, playing, finished
            maxPlayers: MAX_PLAYERS_PER_ROOM,
            map: data.map || 'warehouse',
            createdAt: Date.now()
        });

        // Add host to room
        const room = rooms.get(roomCode);
        room.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            ready: false,
            isHost: true,
            color: '#3498db', // Blue for player 1
            kills: 0,
            deaths: 0
        });

        socket.join(roomCode);
        socket.roomCode = roomCode;

        console.log(`Room created: ${roomCode} by ${playerName}`);

        socket.emit('room-created', {
            roomCode: roomCode,
            playerId: socket.id,
            isHost: true
        });

        // Send room state
        socket.emit('room-update', getRoomData(roomCode));
    });

    // JOIN ROOM
    socket.on('join-room', (data) => {
        const roomCode = data.roomCode.toUpperCase();
        const playerName = data.playerName || 'Player';
        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (room.players.size >= room.maxPlayers) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        if (room.gameState === 'playing') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        // Add player to room
        room.players.set(socket.id, {
            id: socket.id,
            name: playerName,
            ready: false,
            isHost: false,
            color: '#e74c3c', // Red for player 2
            kills: 0,
            deaths: 0
        });

        socket.join(roomCode);
        socket.roomCode = roomCode;

        console.log(`${playerName} joined room: ${roomCode}`);

        socket.emit('room-joined', {
            roomCode: roomCode,
            playerId: socket.id,
            isHost: false
        });

        // Notify all players in room
        io.to(roomCode).emit('room-update', getRoomData(roomCode));
    });

    // PLAYER READY
    socket.on('player-ready', () => {
        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (player) {
            player.ready = !player.ready;
            io.to(roomCode).emit('room-update', getRoomData(roomCode));

            // Check if all players ready
            const allReady = Array.from(room.players.values()).every(p => p.ready);
            if (allReady && room.players.size >= 2) {
                // Auto-start game after 2 seconds
                setTimeout(() => {
                    startGame(roomCode);
                }, 2000);
            }
        }
    });

    // START GAME (host only)
    socket.on('start-game', () => {
        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room || room.host !== socket.id) return;

        startGame(roomCode);
    });

    // GAME EVENTS
    socket.on('player-update', (data) => {
        const roomCode = socket.roomCode;
        if (!roomCode) return;

        // Broadcast to other players in room
        socket.to(roomCode).emit('player-moved', {
            playerId: socket.id,
            x: data.x,
            y: data.y,
            angle: data.angle,
            isAiming: data.isAiming,
            isSprinting: data.isSprinting,
            isPeeking: data.isPeeking,
            health: data.health
        });
    });

    socket.on('player-shoot', (data) => {
        const roomCode = socket.roomCode;
        if (!roomCode) return;

        socket.to(roomCode).emit('player-shot', {
            playerId: socket.id,
            x: data.x,
            y: data.y,
            angle: data.angle
        });
    });

    socket.on('bullet-hit', (data) => {
        const roomCode = socket.roomCode;
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room) return;

        // Update stats
        const shooter = room.players.get(socket.id);
        const victim = room.players.get(data.targetId);

        if (shooter && victim) {
            io.to(roomCode).emit('player-hit', {
                shooterId: socket.id,
                targetId: data.targetId,
                damage: data.damage,
                newHealth: data.newHealth
            });

            // Check for death
            if (data.newHealth <= 0) {
                shooter.kills++;
                victim.deaths++;

                io.to(roomCode).emit('player-death', {
                    killerId: socket.id,
                    victimId: data.targetId
                });

                // Send updated stats
                io.to(roomCode).emit('stats-update', {
                    players: Array.from(room.players.values())
                });
            }
        }
    });

    // DISCONNECT
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        const roomCode = socket.roomCode;
        if (roomCode) {
            const room = rooms.get(roomCode);
            if (room) {
                room.players.delete(socket.id);

                // If host left or room empty, delete room
                if (room.host === socket.id || room.players.size === 0) {
                    io.to(roomCode).emit('room-closed', { reason: 'Host disconnected' });
                    rooms.delete(roomCode);
                    console.log(`Room ${roomCode} deleted`);
                } else {
                    // Notify remaining players
                    io.to(roomCode).emit('room-update', getRoomData(roomCode));
                }
            }
        }
    });
});

// Helper functions
function getRoomData(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return null;

    return {
        code: room.code,
        players: Array.from(room.players.values()),
        gameState: room.gameState,
        maxPlayers: room.maxPlayers,
        map: room.map,
        hostId: room.host
    };
}

function startGame(roomCode) {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.gameState = 'playing';

    io.to(roomCode).emit('game-start', {
        map: room.map,
        players: Array.from(room.players.values())
    });

    console.log(`Game started in room: ${roomCode}`);
}

// Server status endpoint
app.get('/status', (req, res) => {
    res.json({
        rooms: rooms.size,
        totalPlayers: Array.from(rooms.values()).reduce((sum, room) => sum + room.players.size, 0)
    });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`\n╔═══════════════════════════════════════════════╗`);
    console.log(`║   MULTIPLAYER SERVER RUNNING                 ║`);
    console.log(`║   Port: ${PORT}                                  ║`);
    console.log(`║   Ready for connections!                     ║`);
    console.log(`╚═══════════════════════════════════════════════╝\n`);
});