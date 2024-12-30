const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const socket = io();

let players = {};
let bullets = [];

const keys = {};
let local_id = "";
let moving = false;
const player_size = 10;

class Bullet{
    constructor (x, y, dir_x, dir_y, owner_id){
        this.x = x;
        this.y = y;
        this.dir_x = dir_x;
        this.dir_y = dir_y;
        this.owner_id = owner_id;
    }

    draw(){
        ctx.fillStyle = "white";

        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
    }
}

class Player{
    constructor (x, y, rot, name, boost = false){
        this.x = x;
        this.y = y;
        this.rot = rot;
        this.name = name;
        this.boost = boost;
    }

    draw(id){
        const forward = degreesToVector2(this.rot);
        
        ctx.fillStyle = id === socket.id ? "white" : "red";
        
        const frontX = this.x + forward.x * player_size * 2;
        const frontY = this.y + forward.y * player_size * 2;
        
        const leftX = this.x - forward.y * player_size;
        const leftY = this.y + forward.x * player_size;

        const rightX = this.x + forward.y * player_size;
        const rightY = this.y - forward.x * player_size;

        const backX = this.x - forward.x * player_size;
        const backY = this.y - forward.y * player_size;


        let path = new Path2D();
        path.moveTo(frontX, frontY);
        path.lineTo(leftX, leftY);
        path.lineTo(rightX, rightY);
        path.closePath();
        ctx.fill(path);

        ctx.font = "10px Arial";
        ctx.fillText(this.name, this.x - 5, this.y - 20);

        if (this.boost){
            let path = new Path2D();
            ctx.fillStyle = "yellow";
            path.moveTo(rightX, rightY);
            path.lineTo(backX, backY);
            path.lineTo(leftX, leftY);
            path.closePath();
            ctx.fill(path);
        }
    }
}

function updateFrame() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (const id in players) {
        var player = players[id];
        player.draw(id);
    }

    bullets.forEach((bullet) => bullet.draw());
}

function degreesToVector2(degrees) {
    const radians = degrees * (Math.PI / 180);
    const x = Math.cos(radians);
    const y = Math.sin(radians);
    return { x, y };
}

socket.on("joined", (currentPlayers, id) => {
    for (const id in currentPlayers) {
        const playerData = currentPlayers[id];
        players[id] = new Player(playerData.x, playerData.y, playerData.rot, playerData.name, playerData.boost);
    }
    local_id = id;
    moving = true;
});

socket.on("newPlayer", (player) => {
    players[player.id] = new Player(player.x, player.y, player.name, player.rot);
});

socket.on("newBullet", (bullet) => {
    bullets.push(new Bullet(bullet.x, bullet.y, bullet.dir_x, bullet.dir_y, bullet.owner_id));
});

socket.on("endBullet", (pos_in_list) => {
    delete bullets[pos_in_list]
});

socket.on("updateBullet", (bullet, pos_in_list) => {
    bullets[pos_in_list] = new Bullet(bullet.x, bullet.y, bullet.dir_x, bullet.dir_y, bullet.owner_id);
});

socket.on("playerMoved", (player) => {
    if (players[player.id]) {
        players[player.id].x = player.x;
        players[player.id].y = player.y;
        players[player.id].rot = player.rot;
        players[player.id].boost = player.boost;
    }
});

socket.on("playerDisconnected", (id) => {
    delete players[id];
});

socket.on("updateScreen", () => {
    updateFrame();
})

document.addEventListener("keydown", (event) => {
    keys[event.code] = true;
});

document.addEventListener("keyup", (event) => {
    keys[event.code] = false;
});

document.addEventListener("click", (event) => {
    if (event.button == 0){
        let v2 = degreesToVector2(players[local_id].rot);
        socket.emit("shoot", v2, players[local_id].x + v2.x * player_size * 2, players[local_id].y + v2.y * player_size * 2);
    }
});

function updatePlayerMovement() {
    if (moving){
        const movement = { x: 0, y: 0, rot: 0, boost: false};

        if (keys["KeyA"]) movement.rot = -3;
        if (keys["KeyD"]) movement.rot = 3;

        const currentRot = (players[local_id].rot + movement.rot) % 360;
        const forward = degreesToVector2(currentRot);

        let speed = 2;
        if (keys["ShiftLeft"]){
            speed = 4;
            movement.boost = true;
        }

        if (keys["KeyW"]) {
            movement.x = forward.x * speed;
            movement.y = forward.y * speed;
        }
        if (keys["KeyS"]) {
            movement.x = -forward.x * speed;
            movement.y = -forward.y * speed;
        }

        socket.emit("move", movement);
    }

    // Call this function repeatedly for smooth movement
    requestAnimationFrame(updatePlayerMovement);
}

// Start movement updates
updatePlayerMovement();