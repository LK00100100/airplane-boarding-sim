import { Baggage } from "./Baggage";
import { Direction } from "./Direction";
import { Ticket } from "./Ticket";

/**
 * Holds information about a passenger
 */
export class Passenger {
  id: number; //unique id
  private ticket: Ticket; //all passengers have a ticket
  baggages: Baggage[]; //should be at most 1 large piece.

  direction: Direction;

  sprite?: Phaser.GameObjects.Sprite;

  tween?: Phaser.Tweens.Tween; //current animation

  constructor(id: number) {
    this.id = id;
    this.baggages = [];
    this.ticket = Ticket.createPlaceholderTicket();

    this.direction = Direction.NORTH;
  }

  public addBaggage(baggage: Baggage) {
    this.baggages.push(baggage);
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

  toString(): string {
    return `id: ${this.id}, ticket: ${this.ticket.toString()}`;
  }

  /**
   * gets the ticket.
   * @returns
   */
  getTicket(): Ticket {
    return this.ticket;
  }
}
