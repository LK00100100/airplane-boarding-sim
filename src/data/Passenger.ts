import { Baggage } from "./Baggage";
import { Direction } from "./Direction";
import { Ticket } from "./Ticket";

/**
 * Holds information about a passenger
 */
export class Passsenger {
  id: number; //unique id
  ticket: Ticket; //all passengers have a ticket
  baggages: Baggage[]; //should be at most 1 large piece.

  //todo: action timer variable
  facing: Direction;

  sprite?: Phaser.GameObjects.Sprite;

  constructor(id: number) {
    this.id = id;
    this.baggages = [];
    this.ticket = Ticket.placeholderTicket();

    this.facing = Direction.NORTH;
  }

  addBaggage(baggage: Baggage) {
    this.baggages.push(baggage);
  }

  setTicket(ticket: Ticket) {
    this.ticket = ticket;
  }

  /**
   *
   * @returns true if sprite is moving. Otherwise, false
   */
  isMoving(): boolean {
    if (!this.sprite) return false;

    if (!this.sprite.body?.velocity) return false;

    let velocity = this.sprite!.body.velocity;

    return velocity.x > 0 || velocity.y > 0;
  }

  toString(): string {
    return `id: ${this.id}, isMoving: ${this.isMoving()}`;
  }
}
