import { Baggage } from "./Baggage";
import { Direction } from "./Direction";
import { Ticket } from "./Ticket";

//TODO: hold path info
/**
 * Holds information about a passenger
 */
export class Passenger {
  id: number; //unique id
  private ticket: Ticket; //all passengers have a ticket
  baggages: Baggage[]; //should be at most 1 large piece.

  direction: Direction;

  //TODO: sprite's angle and this.direction should be in sync
  sprites?: Phaser.GameObjects.Group; //group of sprites. Passenger and baggage

  tween?: Phaser.Tweens.Tween; //current animation

  constructor(id: number) {
    this.id = id;
    this.baggages = [];
    this.ticket = Ticket.createPlaceholderTicket();

    this.direction = Direction.NORTH;
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
   * sets the sprite angle and passenger's direction.
   * @param newAngle new angle
   */
  setAngleAndDirection(newAngle: number) {
    //TODO: replace code with "90 *"
  }

  /**
   * gets the ticket.
   * @returns
   */
  getTicket(): Ticket {
    return this.ticket;
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

  toString(): string {
    return `id: ${this.id}, ticket: ${this.ticket.toString()}`;
  }
}
