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

  isMoving: boolean; //either walking or doing stuff

  //todo: action timer variable
  facing: Direction;

  sprite?: Phaser.GameObjects.Triangle | Phaser.GameObjects.Sprite;

  constructor(id: number) {
    this.id = id;
    this.baggages = [];
    this.ticket = Ticket.placeholderTicket();
    this.isMoving = false;

    this.facing = Direction.NORTH;
  }

  addBaggage(baggage: Baggage) {
    this.baggages.push(baggage);
  }

  setTicket(ticket: Ticket) {
    this.ticket = ticket;
  }

  toString(): string {
    return `id: ${this.id}, isMoving: ${this.isMoving}`;
  }
}
