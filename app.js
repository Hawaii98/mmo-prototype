let WebSocket = require('ws');
let express = require('express');
let app = express();
let server = require('http').createServer();

app.use(express.static(__dirname+'/public'));

class Bullet{
    constructor(x, y, angle, ttl, speed, owner){
        this.id = 'bullet_'+guid();
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.owner = owner;
        this.ttl = ttl;
        this.speed = speed;
        this.speedY = Math.cos(this.angle)*(-1) * this.speed;
        this.speedX = Math.sin(this.angle)*(-1) * this.speed;
    }
    update(){
        this.ttl--;
        this.x += this.speedX;
        this.y += this.speedY;
    }
}

class Sector{
    constructor(id){
        this.id = id;
        this.users = {};
        this.bullets = [];
    }
    broadcast(event, data){
        for(let i in this.users)
            this.users[i].send({event, data});
    }
    removeUser(user){
        if (this.isUser(user)) {
            this.broadcast('removePlayer', {id: user.id});
            delete this.users[user.id];
            user.sector = null;
            return true;
        }
        return false;
    }
    isUser(user){
        let isInSector = false;
        for(let i in this.users){
            if (this.users[i].id == user.id) {
                isInSector = true;
                break;
            }
        }
        return isInSector;
    }
    updateBullets(){
        this.moveBullets();
        this.checkNewBullets();
    }
    moveBullets(){
        for (let i = 0; i < this.bullets.length; i++) {
            this.bullets[i].update();
            if(this.bullets[i].ttl <= 0)
                this.bullets.splice(i, 1);
        }
    }
    checkNewBullets(){
        for(let i in this.users) {
            if (this.users[i].shooting.is && this.users[i].shooting.nextShootCounter <= 0) {
                this.newBullet(this.users[i].x, this.users[i].y, this.users[i].shooting.angle, this.users[i]); //redukcja do samego usera
            }
            if (this.users[i].shooting.nextShootCounter > 0)
                this.users[i].shooting.nextShootCounter--;
        }
    }
    newBullet(x, y, angle, owner){
        this.bullets.push(new Bullet(x, y, angle, 10, 30, owner));
        owner.shooting.nextShootCounter = 10;
    }
}
class User{
    constructor(id, ws){
        this.id = id;
        this.ws = ws;
        this.sector = null;

        this.moving = {
            is: false,
            direction: 5,
            speed: 1
        };
        this.shooting = {
            is: false,
            angle: 0,
            nextShootCounter: 0
        };
        this.x = 100+Math.floor((Math.random() * 100) + 1);
        this.y = 100+Math.floor((Math.random() * 100) + 1);
    }
    messageReciver(event, data){
        switch(event){
            case 'move':
                this.move(data.direction);
                break;
            case 'stopMoving':
                this.stopMoving();
                break;
            case 'shoot':
                this.shooting.is = data.isShooting;
                break;
            case 'updateMouseAngle':
                this.shooting.angle = data.angle;
                break;
        }
    }
    send(data){
        if(this.ws.readyState === WebSocket.OPEN)
            this.ws.send(JSON.stringify(data));
    }
    updateShooting(data){
        this.sector.newBullet(data.x, data.y, data.angle, this);
    }
    move(direction){
        switch(direction){
            case 1:
                this.moving.is = true;
                this.moving.direction = 1;
                break;
            case 2:
                this.moving.is = true;
                this.moving.direction = 2;
                break;
            case 3:
                this.moving.is = true;
                this.moving.direction = 3;
                break;
            case 4:
                this.moving.is = true;
                this.moving.direction = 4;
                break;
            case 5:
                this.moving.is = true;
                this.moving.direction = 5;
                break;
            case 6:
                this.moving.is = true;
                this.moving.direction = 6;
                break;
            case 7:
                this.moving.is = true;
                this.moving.direction = 7;
                break;
            case 8:
                this.moving.is = true;
                this.moving.direction = 8;
                break;
        }
    }
    stopMoving(){
          this.moving.is = false;
    }
    updateMove(){
        if(this.moving.is){
            switch (this.moving.direction){
                case 1:
                    this.y -= 10*this.moving.speed;
                    break;
                case 2:
                    this.y -= 10*this.moving.speed;
                    this.x += 10*this.moving.speed;
                    break;
                case 3:
                    this.x += 10*this.moving.speed;
                    break;
                case 4:
                    this.y += 10*this.moving.speed;
                    this.x += 10*this.moving.speed;
                    break;
                case 5:
                    this.y += 10*this.moving.speed;
                    break;
                case 6:
                    this.y += 10*this.moving.speed;
                    this.x -= 10*this.moving.speed;
                    break;
                case 7:
                    this.x -= 10*this.moving.speed;
                    break;
                case 8:
                    this.y -= 10*this.moving.speed;
                    this.x -= 10*this.moving.speed;
                    break;
            }
        }
    }
}

let game = {
    sectors: [],
    newSector(id){
        if(!this.isExistSector(id))
            this.sectors[id] = new Sector(id);
    },
    isExistSector(id){
        return this.sectors[id];
    },
    joinToSector(user, sector){
        if(this.isExistSector(sector)) {
            if (!this.sectors[sector].isUser(user)) {
                 user.sector = this.sectors[sector];
                 this.sectors[sector].users[user.id] = user;
                 this.sectors[sector].broadcast('addPlayer', {id: user.id, x: user.x, y: user.y});
                 for(let i in this.sectors[sector].users) {
                     if(this.sectors[sector].users[i].id == user.id) continue;
                     user.send({
                         'event': 'addPlayer',
                         'data': {id: this.sectors[sector].users[i].id, x: this.sectors[sector].users[i].x, y: this.sectors[sector].users[i].y}
                     });
                 }
                return true;
            }
        }
        return false;
    },
    broadcast(event, data){
        for(let i in this.sectors)
            this.sectors[i].broadcast(event, data);
    },
    start(){
        setInterval(() => this.mainLoop(), 1000/30);
        setInterval(() => this.sendingDataLoop(), 1000/25);
    },
    mainLoop(){
        this.movePlayers();
        this.bulletsLoop();
    },
    sendUpdates() {
        for(let i in this.sectors) {
            let data = this.prepareDataToUpdate(this.sectors[i]);
            this.sectors[i].broadcast('update', data);
        }
    },
    prepareDataToUpdate(sector) {
        let data = {
            players: {},
            bullets: {}
        };
        for(let i in sector.users) {
            data.players[sector.users[i].id] = {
                id: sector.users[i].id,
                x: sector.users[i].x,
                y: sector.users[i].y
            };
        }
        for (i = 0; i < sector.bullets.length; i++) {
            data.bullets[i] = {
                id: sector.bullets[i].id,
                x: sector.bullets[i].x,
                y: sector.bullets[i].y,
                angle: sector.bullets[i].angle
            }
        }
        return data;
    },
    sendingDataLoop(){
        this.sendUpdates();
    },
    movePlayers(){
        for(let i in this.sectors){
            for(let k in this.sectors[i].users)
                this.sectors[i].users[k].updateMove();
        }
    },
    bulletsLoop(){
        for(let i in this.sectors){
            this.sectors[i].updateBullets();
        }
    }
};

game.newSector('lobby');
game.start();

let wss = new WebSocket.Server({server: server});
wss.on('connection', ws => {
    let user = new User(guid(), ws);
    game.joinToSector(user, 'lobby');
    game.movePlayers();
    user.send({'event': 'setUserId', 'data': {id: user.id}});
    ws.on('close', () => {
       if(user.sector.id) game.sectors[user.sector.id].removeUser(user);
    });
    ws.on('message', e => {
        e = JSON.parse(e);
        user.messageReciver(e.event, e.data);
    });
});

server.on('request', app);
server.listen(8080, () => {
  console.log('Listening on http://localhost:8080');
});

function guid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        let r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}
