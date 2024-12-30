const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files (for frontend)
app.use(express.static("public"));

const PORT = 3000;

let players = {};
let bullets = [];
let num_players = 0;

class Player{
    constructor (x, y, rot, name, boost = false){
        this.x = x;
        this.y = y;
        this.acc_x = 0;
        this.acc_y = 0;
        this.rot = rot;
        this.name = name;
        this.boost = boost;
    }
}

class Bullet{
    constructor (x, y, dir_x, dir_y, owner_id){
        this.x = x;
        this.y = y;
        this.dir_x = dir_x;
        this.dir_y = dir_y;
        this.owner_id = owner_id;
    }

    move(){
        this.x += this.dir_x * 4;
        this.y += this.dir_y * 4;
    }
}

// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Add the new player to the players object
    players[socket.id] = new Player(
        x = Math.floor(Math.random() * 500),
        y = Math.floor(Math.random() * 500),
        rot = 0,
        "Player " + num_players
    );
    num_players += 1;

    // Send the current players to the new player
    socket.emit("joined", players, socket.id);

    // Notify other players about the new player
    socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

    // Handle player movement
    socket.on("move", (movement) => {
        if (!(-6 < movement.x < 6)) {return}
        if (!(-6 < movement.y < 6)) {return}
        if (!(-10 < movement.rot < 10)) {return}

        if (players[socket.id]) {
            players[socket.id].acc_x += movement.x * 0.1;
            players[socket.id].acc_y += movement.y * 0.1;
            players[socket.id].rot += movement.rot;
            players[socket.id].boost = movement.boost;
        }
    });

    socket.on("shoot", (dir, x, y) => {
        bullets.push(new Bullet(x, y, dir.x, dir.y, socket.id));
        io.emit("newBullet", new Bullet(x, y, dir.x, dir.y, socket.id));
    });

    // Handle player disconnection
    socket.on("disconnect", () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        num_players -= 1;
        io.emit("playerDisconnected", socket.id);
    });
});

function update(){
    let i = 0;
    bullets.forEach(bullet => {
        bullet.move();
        io.emit("updateBullet", bullet, i)
        i++;
    });
    for (const id in players) {
        let player = players[id];
        player.acc_x -= player.acc_x * Math.abs(player.acc_x) / 100;
        player.acc_y -= player.acc_y * Math.abs(player.acc_y) / 100;

        player.x += player.acc_x * 0.5;
        player.y += player.acc_y * 0.5;

        if (player.acc_x < -10)
            player.acc_x = -10;
        else if (player.acc_x > 10)
            player.acc_x = 10;

        if (player.acc_y < -10)
            player.acc_y = -10;
        else if (player.acc_y > 10)
            player.acc_y = 10;

        io.emit("playerMoved", { id: id, ...players[id] });
    }
    io.emit("updateScreen");
    setTimeout(() => {
        update();
    }, 10 * num_players)
}

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    update();
});
