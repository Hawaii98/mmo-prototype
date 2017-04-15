class Game {
    constructor(ws){
        this.settings = {
            width: 1280,
            height: 720
        };
        this.initPixi();
        this.initWS();
        this.drawGrass();

        this.objects = {
            players: {},
            bullets: {},
            npc: {}
        };

        this.hero = {};

        this.pressedKey = {
            up: false,
            right: false,
            down: false,
            left: false,
            mouse: false
        };
        this.movingDirection = {x: 0, y: 0};
        this.initMoving();
        this.checkingAngelUpdate = setInterval(() => this.updateMouseAngle(), 50);
    }
    initPixi(){
        this.pixi = new PIXI.Application(this.settings.width, this.settings.height, {backgroundColor : 0x1099bb});
        document.body.appendChild(this.pixi.view);
        this.pixi.view.style.width = this.settings.width+'px';
        this.pixi.view.style.height = this.settings.height+'px';

        this.containers = {
            objects: new PIXI.Container(),
            background: new PIXI.Container(),
        };
        this.pixi.stage.addChild(this.containers.background);
        this.pixi.stage.addChild(this.containers.objects);

        this.pixi.renderer.plugins.interaction.on('mousedown', () => this.shooting(true));
        this.pixi.renderer.plugins.interaction.on('mouseup', () => this.shooting(false));
    }
    initWS(){
        this.ws = new WebSocket('ws://localhost:8080');
        this.ws.onmessage = data => {
            data = JSON.parse(data.data);
            this.messageReciver(data.event, data.data);
        };
    }
    drawTestingImage(){
        let txt = PIXI.Texture.fromImage('./img/testedtiles.png');
        let tilingSprite = new PIXI.extras.TilingSprite(txt, 32, 32);
        this.pixi.stage.addChild(tilingSprite);
        //this.pixi.stage.pivot.x = 8;
        //this.pixi.stage.pivot.y = 0;
        this.pixi.stage.position.x = 12;
        this.pixi.stage.position.y = 12;
    }
    drawGrass(){
        let txt = PIXI.Texture.fromImage('./img/testedtiles.png');
        for (let i = 0; i < 30; i++) {
            for (let j = 0; j < 30; j++) {
                let title = new PIXI.extras.TilingSprite(txt, 50, 50);
                title.position.set(50 * j, 50 * i);
                title.zOrder = 0;
                this.containers.background.addChild(title);
            }
        }
    }
    shooting(isShooting){
        this.sendData('shoot', {isShooting});
        this.pressedKey.mouse = isShooting;
        this.updateMouseAngle();
    }
    updateMouseAngle(){
        if(this.pressedKey.mouse){
            let mousPosition = this.getMousePosition();
            let angle = Math.atan2(this.objects.players[this.hero.id].x - mousPosition.x, this.objects.players[this.hero.id].y - mousPosition.y);
            this.sendData('updateMouseAngle', {angle});
        }
    }
    initMoving(){
        let left = this.keyboard(65),
            up = this.keyboard(87),
            right = this.keyboard(68),
            down = this.keyboard(83);

        left.press = () => {
            this.pressedKey.left = true;
            this.movingDirection.x--;
        };
        left.release = () => {
            this.pressedKey.left = false;
            this.movingDirection.x++;
        };
        up.press = () => {
            this.pressedKey.up = true;
            this.movingDirection.y--;
        };
        up.release = () => {
            this.pressedKey.up = false;
            this.movingDirection.y++;
        };
        right.press = () => {
            this.pressedKey.right = true;
            this.movingDirection.x++;
        };
        right.release = () => {
            this.pressedKey.right = false;
            this.movingDirection.x--;
        };
        down.press = () => {
            this.pressedKey.down = true;
            this.movingDirection.y++;
        };
        down.release = () => {
            this.pressedKey.down = false;
            this.movingDirection.y--;
        };
       // setInterval(this.updateMovingDirection(), 10);
    }
    updateMovingDirection(){
        if(this.movingDirection.x == 1 && this.movingDirection.y == -1) this.sendData('move', {'moving':true, 'direction': 2});
        else if(this.movingDirection.x == 1 && this.movingDirection.y == 1) this.sendData('move', {'moving':true, 'direction': 4});
        else if(this.movingDirection.x == -1 && this.movingDirection.y == 1) this.sendData('move', {'moving':true, 'direction': 6});
        else if(this.movingDirection.x == -1 && this.movingDirection.y == -1) this.sendData('move', {'moving':true, 'direction': 8});
        else if(this.movingDirection.y == -1) this.sendData('move', {'moving':true, 'direction': 1});
        else if(this.movingDirection.x == 1) this.sendData('move', {'moving':true, 'direction': 3});
        else if(this.movingDirection.y == 1) this.sendData('move', {'moving':true, 'direction': 5});
        else if(this.movingDirection.x == -1) this.sendData('move', {'moving':true, 'direction': 7});
        else this.sendData('stopMoving', {'moving':false});
    };
    keyboard(keyCode) {
        let key = {};
        key.code = keyCode;
        key.isDown = false;
        key.isUp = true;
        key.press = undefined;
        key.release = undefined;
        //The `downHandler`
        key.downHandler = event => {
            if (event.keyCode === key.code) {
                if (key.isUp && key.press) key.press();
                key.isDown = true;
                key.isUp = false;
                this.updateMovingDirection();
            }
            event.preventDefault();
        };
        //The `upHandler`
        key.upHandler = event => {
            if (event.keyCode === key.code) {
                if (key.isDown && key.release) key.release();
                key.isDown = false;
                key.isUp = true;
                this.updateMovingDirection();
            }
            event.preventDefault();
        };
        //Attach event listeners
        window.addEventListener("keydown", key.downHandler.bind(key), false);
        window.addEventListener("keyup", key.upHandler.bind(key), false);
        return key;
    }
    sendData(event, data){
        this.ws.send(JSON.stringify({event, data}));
    }
    messageReciver(event, data){
        if(event != 'update') {
            console.log(`${event}:`); // DEBUG
            console.log(data); // DEBUG
        }

        switch(event){
            case 'addPlayer':
                this.addPlayer(data);
                break;
            case 'movePlayers':
                this.movePlayers(data);
                break;
            case 'removePlayer':
                this.removePlayers(data);
                break;
            case 'update':
                this.update(data);
                break;
            case 'setUserId':
                this.hero.id = data.id;
                break;
        }
    }
    update(data){
        this.movePlayers(data.players);
        this.moveBullets(data.bullets);
    }
    addPlayer(data){
        let player = PIXI.Sprite.fromImage('./img/player.png');
        player.x = data.x;
        player.y = data.y;
        player.anchor.set(0.5);
        this.containers.objects.addChild(player);

        this.objects.players[data.id] = player;
    }
    removePlayers(data){
        console.log('ok');
        console.log(data);
        this.objects.players[data.id].destroy();
    }
    movePlayers(data){
        for(let i in data){
            if(!this.objects.players.hasOwnProperty(data[i].id)) continue;
            this.objects.players[data[i].id].x = data[i].x;
            this.objects.players[data[i].id].y = data[i].y;

            if(data[i].id == this.hero.id){
                for(let k in this.containers){
                    this.containers[k].x = this.settings.width/2-data[i].x-25;
                    this.containers[k].y = this.settings.height/2-data[i].y-25;
                }
            }
        }
    }
    moveBullets(data){
        for(let i in this.objects.bullets)
            this.objects.bullets[i].updated = false;
        for(let i in data){
            if(!this.objects.bullets.hasOwnProperty(data[i].id)){
                this.objects.bullets[data[i].id] = PIXI.Sprite.fromImage('./img/bullet.png');
                this.objects.bullets[data[i].id].anchor.set(0.5);
                this.objects.bullets[data[i].id].rotation = data[i].angle*(-1);
                this.objects.bullets[data[i].id].x = data[i].x;
                this.objects.bullets[data[i].id].y = data[i].y;
                this.objects.bullets[data[i].id].updated = true;
                this.containers.objects.addChild(this.objects.bullets[data[i].id]);
            } else {
                this.objects.bullets[data[i].id].x = data[i].x;
                this.objects.bullets[data[i].id].y = data[i].y;
                this.objects.bullets[data[i].id].updated = true;
            }
        }
        for(let i in this.objects.bullets) {
            if (!this.objects.bullets[i].updated) {
                this.objects.bullets[i].destroy();
                delete this.objects.bullets[i];
            }
        }
    }
    getMousePosition(){
        return {
            x: this.pixi.renderer.plugins.interaction.mouse.global.x-this.containers.background.x,
            y: this.pixi.renderer.plugins.interaction.mouse.global.y-this.containers.background.y
        };
    }
}