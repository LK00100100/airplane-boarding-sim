import { Baggage } from "./Baggage";
import { Direction } from "./Direction";
import { Ticket } from "./Ticket";

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

  giveBaggage(baggage: Baggage) {
    this.baggages.push(baggage);
  }

  giveTicket(ticket: Ticket) {
    this.ticket = ticket;
  }

  /**
   * used to simulate a passenger's thought and then movement
   */
  thinkAndMove() {
    this.isMoving = false;

    this.isMoving = true;
  }
}
