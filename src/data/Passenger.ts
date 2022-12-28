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

  direction: Direction;

  sprite?: Phaser.GameObjects.Sprite;

  tween?: Phaser.Tweens.Tween; //current animation

  constructor(id: number) {
    this.id = id;
    this.baggages = [];
    this.ticket = Ticket.placeholderTicket();

    this.direction = Direction.NORTH;
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

    if (!this.tween) return false;

    return this.tween.isPlaying();
  }

  toString(): string {
    return `id: ${this.id}, isMoving: ${this.isMoving()}`;
  }
}
