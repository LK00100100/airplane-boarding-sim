import GameScene from "../scenes/GameScene";
import { SpriteUtil } from "../util/SpriteUtil";
import { Baggage } from "./Baggage";
import { Direction } from "./Direction";
import { PlaneNode } from "./PlaneNode";
import { Ticket } from "./Ticket";

/**
 * Holds information about a passenger
 */
export class Passenger {
  id: number; //unique id
  private ticket: Ticket; //all passengers have a ticket
  baggages: Baggage[]; //should be at most 1 large piece.

  direction: Direction; //where passenger is heading

  sprites?: Phaser.GameObjects.Group; //group of sprites. Passenger and baggage. [0] passenger; [1] baggage

  tween?: Phaser.Tweens.Tween; //current animation

  pathToTarget: Array<PlaneNode>; //the first node is the next step.

  numSteps: number; //number of steps taken

  constructor(id: number) {
    this.id = id;
    this.baggages = [];
    this.ticket = Ticket.createPlaceholderTicket();

    this.direction = Direction.NORTH;

    this.pathToTarget = [];

    this.numSteps = 0;
  }

  public hasBaggage() {
    return this.baggages.length > 0;
  }

  public addBaggage(baggage: Baggage) {
    this.baggages.push(baggage);

    if (this.baggages.length > 1)
      throw new Error("not supported. too much baggage");
  }

  public getTotalBaggageSize() {
    return this.baggages
      .map((b) => b.size)
      .reduce((previousVal, nextSize) => previousVal + nextSize, 0);
  }

  public setTicket(ticket: Ticket) {
    this.ticket = ticket;
  }

  /**
   * gets the ticket.
   * @returns
   */
  public getTicket(): Ticket {
    return this.ticket;
  }

  public getNumSteps() {
    return this.numSteps;
  }

  public incrmentStep() {
    this.numSteps++;
  }

  /**
   * Get this sprite's angle.
   * All angles in this sprite group should be the same.
   */
  getSpriteAngle() {
    const sprites = this.sprites.getChildren();
    const sprite = sprites[0] as Phaser.GameObjects.Sprite;
    return sprite.angle;
  }

  /**
   * Gets the facing direction of the passenger to where they are going.
   * @param startNode
   * @param nextNode
   */
  public static getFacingDirection(startNode: PlaneNode, nextNode: PlaneNode) {
    const nextX = nextNode.sprite!.x - startNode.sprite!.x;
    const nextY = nextNode.sprite!.y - startNode.sprite!.y;

    //horizontal is more powerful
    if (Math.abs(nextX) > Math.abs(nextY)) {
      if (startNode.sprite!.x < nextNode.sprite!.x) {
        return Direction.EAST;
      }
      return Direction.WEST;
    }
    //vertical is more powerful
    else {
      if (startNode.sprite!.y < nextNode.sprite!.y) {
        return Direction.SOUTH;
      }
      return Direction.NORTH;
    }
  }

  //TODO: one parameter obj
  /**
   * sets the sprite angle and passenger's direction.
   * Then sets the passenger to move
   * @param gameScene used to add passenger tween.
   * @param speed passenger speed
   * @param newDirection new direction to face
   */
  setDirectionAndMove(
    gameScene: GameScene,
    speed: number,
    newDirection: Direction,
    x?: number,
    y?: number,
    onComplete: any = () => {},
    callbackScope?: any
  ) {
    this.direction = newDirection;

    const newAngle = SpriteUtil.shortestAngle(
      this.getSpriteAngle(),
      90 * newDirection
    );

    const tweenConfig = {
      targets: this.sprites.getChildren(),
      angle: newAngle,
      duration: speed,
      ease: "Power2",
      ...(x && { x }),
      ...(y && { y }),
      ...(onComplete && { onComplete }),
      ...(callbackScope && { callbackScope }),
    };

    //face the seat
    this.tween = gameScene.tweens.add(tweenConfig);
  }

  toString(): string {
    return `id: ${this.id}, ticket: ${this.ticket.toString()}`;
  }

  destroy() {
    this.sprites?.destroy(true, true);
    this.tween?.destroy();
  }
}
