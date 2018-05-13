import {Component, HostListener, AfterViewInit, OnInit} from "@angular/core";
import * as createjs from 'createjs-module';
import {WindowSizeService} from "../shared/services/window.size.service";
import {PlayerControlService, ATTACK} from "../shared/services/player.control.service";
import {LEFT, RIGHT, UP, DOWN} from "../shared/services/player.control.service";
import {HeartbeatService} from "../shared/services/heartbeat.service";
import {Guid} from 'guid-typescript';

const BOARD_MAX_X: number = 768;
const BOARD_MAX_Y: number = 432;
const X_GRID_POSITIONS: number = (BOARD_MAX_X / 16);
const Y_GRID_POSITIONS: number = (BOARD_MAX_Y / 16);
const PLAYER_START_X: number = 0;
const PLAYER_START_Y: number = 0;
const NPC_COUNT: number = 25;

const NPC_HB_NAME: string = 'npc_heartbeat';
const PLAYER_HB_NAME: string = 'player_heartbeat';
const HEALTH_DROP_HB_NAME: string = 'health_drop_heartbeat';

@Component({
	template: require("./board.component.html")
})

export class BoardComponent implements AfterViewInit, OnInit {

	gameBoard: createjs.Stage;
	player: actor;
	npcArray: Array<actor> = [];
	obstacleArray: Array<actor> = [];
	boulderSprite: createjs.SpriteSheet = null;
	dragonSprite: createjs.SpriteSheet = null;
	healthSprite: createjs.SpriteSheet = null;
	knightSprite: createjs.SpriteSheet = null;
	treeSprite: createjs.SpriteSheet = null;

	ngAfterViewInit() {
		this.player = new actor();
		this.gameBoard = new createjs.Stage("gameBoard");
		let background = new createjs.Shape();
		background.graphics.beginFill("green").drawRect(0, 0, 768, 432);
		this.gameBoard.addChild(background);

		this.buildObstacleArray();
		this.obstacleArray.forEach((obstacle) => {
			this.gameBoard.addChild(obstacle);
		});

		this.initializeNpcArray();
		this.npcArray.forEach((npc) => {
			this.gameBoard.addChild(npc);
		});
		console.log(this.npcArray);

		this.player.graphics.beginFill("DeepSkyBlue").drawRect(PLAYER_START_X, PLAYER_START_Y, 16, 16)
			.beginFill("black").drawRect(PLAYER_START_X, PLAYER_START_Y, 16, 2);
		this.player.x = PLAYER_START_X;
		this.player.currentX = PLAYER_START_X;
		this.player.y = PLAYER_START_Y;
		this.player.currentY = PLAYER_START_Y;
		this.player.attackPower = 10;
		this.player.health = 100;
        this.player.actorId = Guid.create();
		this.gameBoard.addChild(this.player);
		this.gameBoard.update();
	}

	ngOnInit(): void {
		this.heartbeatService.start(NPC_HB_NAME);
            
        this.heartbeatService.getEmitter(NPC_HB_NAME).subscribe(() =>
        this.npcArray.forEach(npc => this.HandleNpcMovement(npc)));
	}

	constructor(protected heartbeatService: HeartbeatService, protected playerControlService: PlayerControlService, protected windowSizeService: WindowSizeService) {
		this.playerControlService.playerAction.subscribe((direction: string) => {
			switch(direction) {
				case DOWN:
					this.down();
					break;
				case LEFT:
					this.left();
					break;
				case RIGHT:
					this.right();
					break;
				case UP:
					this.up();
                    break;
                case ATTACK:
                    this.attack();
                    break;
			}
		});

		this.boulderSprite = new createjs.SpriteSheet({
			images: [
				"/images/boulder.svg"
			],
			frames: {
				height: 16,
				width: 16
			}
		});
		this.dragonSprite = new createjs.SpriteSheet({
			images: [
				"/images/dragon-left.svg",
				"/images/dragon-right.svg"
			],
			frames: {
				height: 16,
                width: 16,
                
			}
		});
		this.healthSprite = new createjs.SpriteSheet({
			images: [
				"/images/health.svg"
			],
			frames: {
				height: 16,
				width: 16
			}
		});
		this.knightSprite = new createjs.SpriteSheet({
			images: [
				"/images/knight-left.svg",
				"/images/knight-right.svg"
			],
			frames: {
				height: 16,
				width: 16
            }            
		});
		this.treeSprite = new createjs.SpriteSheet({
			images: [
				"/images/tree-stump.svg"
			],
			frames: {
				height: 16,
				width: 16
			}
		});
	}

	down(): void {
        if(!BottomBoundaryCheck(this.player) && this.isMoveLegal(this.player.currentX, this.player.currentY + 16)) 
        {
			this.player.currentFacingDirection = 2;
			this.player.y += 16;
			this.player.currentY += 16;
			this.gameBoard.update();
		}
	}

	left(): void {
        if(!LeftBoundaryCheck(this.player) && this.isMoveLegal(this.player.currentX - 16, this.player.currentY))
        {
			this.player.currentFacingDirection = 3;
			this.player.x -= 16;
			this.player.currentX -= 16;
			this.gameBoard.update();
		}
	}

	right(): void {
        if(!RightBoundaryCheck(this.player) && this.isMoveLegal(this.player.currentX + 16, this.player.currentY)) 
        {
			this.player.currentFacingDirection = 1;
			this.player.x += 16;
			this.player.currentX += 16;
			this.gameBoard.update();
		}
	}

	up(): void {
        if(!TopBoundaryCheck(this.player) && this.isMoveLegal(this.player.currentX, this.player.currentY - 16)) 
        {
			this.player.currentFacingDirection = 0;
			this.player.y -= 16;
			this.player.currentY -= 16;
			this.gameBoard.update();
		}
	}

	HandleNpcMovement(npc: actor) {
		var direction = GetNpcDirection(npc.previousDirection);

		if(direction === 0) {
			if(!TopBoundaryCheck(npc) && this.isMoveLegal(npc.currentX, npc.currentY - 16)) {
				npc.y -= 16;
				npc.currentY -= 16;
				npc.previousDirection = direction;
			}
		}
		if(direction === 1) {
			if(!RightBoundaryCheck(npc) && this.isMoveLegal(npc.currentX + 16, npc.currentY)) {
				npc.x += 16;
				npc.currentX += 16;
				npc.previousDirection = direction;
			}
		}
		if(direction === 2) {
			if(!BottomBoundaryCheck(npc) && this.isMoveLegal(npc.currentX, npc.currentY + 16)) {
				npc.y += 16;
				npc.currentY += 16;
				npc.previousDirection = direction;
			}
		}
		if(direction === 3) {
			if(!LeftBoundaryCheck(npc) && this.isMoveLegal(npc.currentX - 16, npc.currentY)) {
				npc.x -= 16;
				npc.currentX -= 16;
				npc.previousDirection = direction;
			}
		}

		this.gameBoard.update();
	}

	initializeNpcArray(): void {
		let xPos: number;
		let yPos: number;
		//five for now; need to scale to difficulty later
		let isLegal: boolean;
		for(let i = 0; i < NPC_COUNT; i++) {
			let npc = new actor();
			let side = selectSide();
			isLegal = false;
			switch(side) {
				case 0:
					do {
						xPos = Math.floor(Math.random() * X_GRID_POSITIONS) * 16;
						yPos = 0;
					} while(this.isMoveLegal(xPos, yPos) == false);
					break;
				case 1:
					do {
						xPos = 0;
						yPos = Math.floor(Math.random() * Y_GRID_POSITIONS) * 16;
					} while(this.isMoveLegal(xPos, yPos) == false);
					break;
				case 2:
					do {
						xPos = Math.floor(Math.random() * X_GRID_POSITIONS) * 16;
						yPos = BOARD_MAX_Y - 16;
					} while(this.isMoveLegal(xPos, yPos) == false);
					break;
				case 3:
					do {
						xPos = BOARD_MAX_X - 16;
						yPos = Math.floor(Math.random() * Y_GRID_POSITIONS) * 16;
					} while(this.isMoveLegal(xPos, yPos) == false);
					break;
				default:
					console.log("Well, you found a bug. Here's a kitty: =^-.-^=");
			}
			npc.currentX = xPos;
			npc.currentY = yPos;
            npc.health = 100;
            npc.actorId = Guid.create();
			npc.graphics.beginFill("Black").drawRect(xPos, yPos, 16, 16);
			this.npcArray.push(npc);
		}
	}

	buildObstacleArray(): void {
		let xPos: number = 384;
		let yPos: number = 208;

		let obstacleArray = Array<actor>();
		for(let i = 0; i < 75; i++) {
			let obstacle = new actor();
			xPos = Math.floor(Math.random() * X_GRID_POSITIONS) * 16;
			yPos = Math.floor(Math.random() * Y_GRID_POSITIONS) * 16;
			obstacle.currentX = xPos;
			obstacle.currentY = yPos;
			obstacle.graphics.beginFill("Crimson").drawRect(xPos, yPos, 16, 16);
			this.obstacleArray.push(obstacle);
		}
	}

	isMoveLegal(xPos, yPos): boolean {
        let value: boolean = true;
                
		this.obstacleArray.forEach((obstacle) => {
			if(obstacle.currentX === xPos && obstacle.currentY === yPos) {
				value = false;
			}
		});

		if(this.npcArray && this.npcArray.length > 0) {
			this.npcArray.forEach((npc) => {
				if(npc.currentX === xPos && npc.currentY === yPos) {
                    value = false;
                    
                    if(this.wasDamageDone(false))
                    {
                        this.player.health -= npc.attackPower;
                    }
				}
			});
		}
		if(this.player.currentX === xPos && this.player.currentY === yPos) {
			value = false;
		}
		return value;
	}


	attack() {
		var attackX = this.player.currentX;
		var attackY = this.player.currentY;
		var attackOutcome = new attackResult;

		if(this.player.currentFacingDirection === 0) {
			attackOutcome = this.detectHit(attackX, attackY - 16)
		}
		if(this.player.currentFacingDirection === 1) {
			attackOutcome = this.detectHit(attackX + 16, attackY)
		}
		if(this.player.currentFacingDirection === 2) {
			attackOutcome = this.detectHit(attackX, attackY + 16)
		}
		if(this.player.currentFacingDirection === 3) {
			attackOutcome = this.detectHit(attackX - 16, attackY)
		}

        if(attackOutcome.hit === true && this.wasDamageDone(true)) 
        {
            if(this.isCriticalHit())
            {
                attackOutcome.victim.health -= this.player.attackPower*2;
                console.log('Critical Hit!');
            }
            else
            {
                attackOutcome.victim.health -= this.player.attackPower;
            }

            if(attackOutcome.victim.health <= 0)
            {
                this.heartbeatService.stop(NPC_HB_NAME);
                this.npcArray = this.npcArray.filter(actor => actor.actorId !== attackOutcome.victim.actorId);
                this.gameBoard.removeChild(this.npcArray.find(actor => actor.actorId !== attackOutcome.victim.actorId));
               
                this.heartbeatService.start(NPC_HB_NAME);
                this.heartbeatService.getEmitter(NPC_HB_NAME).subscribe(() =>
                this.npcArray.forEach(npc => this.HandleNpcMovement(npc)));

                this.gameBoard.update();
            }

            console.log('NPC Health: ' + attackOutcome.victim.health);
		}
    }
    
    isCriticalHit(): boolean
    {
        let dirMin: number = 0;
        let dirMax: number = 20;
    
        var randomNum = Math.floor(Math.random() * (dirMax - dirMin)) + dirMin;

        if(randomNum >= 15 && randomNum <= 19 )
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    wasDamageDone(isPlayerAttacking: boolean): boolean
    {
        let dirMin: number = 0;
        let dirMax: number = 4;
    
        var pdirection = Math.floor(Math.random() * (dirMax - dirMin)) + dirMin;

        if(isPlayerAttacking && (pdirection === 1 || pdirection === 2 || pdirection === 3))
        {
            return true;
        }
        else if(!isPlayerAttacking && (pdirection === 0 ))
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    detectHit(xPos, yPos): attackResult
    {
		var result = new attackResult();
		result.hit = false;
		result.victim = null;
        

		if(this.npcArray && this.npcArray.length > 0) {
			this.npcArray.forEach((npc) => {

                if(npc.currentX === xPos && npc.currentY === yPos) 
                {
					result.hit = true;
                    result.victim = npc;
				}
			});
		}

		return result;
	}
}

class actor extends createjs.Shape {
	health: number;
	attackPower: number;
	previousDirection: number;
	currentFacingDirection: number;
	currentX: number;
    currentY: number;
    actorId: Guid;
}


function selectSide(): number {
	let side: number = Math.floor(Math.random() * 4);
	return side;
}

class attackResult {
	hit: boolean;
    victim: actor;
}





















function GetNpcDirection(previousDir: number): number {
	let dirMin: number = 0;
	let dirMax: number = 4;
	let chngDirMin: number = 0;
	let chngDirMax: number = 7;

	var pdirection = Math.floor(Math.random() * (dirMax - dirMin)) + dirMin;
	var pChangeDir = Math.floor(Math.random() * (dirMax - dirMin)) + dirMin;

	if(pChangeDir === 2 || pChangeDir === 3 || pChangeDir === 4 || pChangeDir === 5 || pChangeDir === 6) {
		return previousDir;
	}
	else {
		return pdirection;
	}
}

function LeftBoundaryCheck(_actor: actor): boolean {
	var x = _actor.currentX - 16;

	if((x < _actor.parent.x)) {
		return true;
	}

	return false;
}

function RightBoundaryCheck(_actor: actor): boolean {
	var x = _actor.currentX + 32;
	var offsetXEdge = BOARD_MAX_X + _actor.parent.x;

	if(x > offsetXEdge) {
		return true;
	}

	return false;
}

function TopBoundaryCheck(_actor: actor): boolean {
	var y = _actor.currentY - 16;

	if(y < _actor.parent.y) {
		return true;
	}

	return false;
}

function BottomBoundaryCheck(_actor: actor): boolean {
	var y = _actor.currentY + 32;
	var offsetYEdge = BOARD_MAX_Y + _actor.parent.y;

	if(y > offsetYEdge) {
		return true;
	}

	return false;
}