import { Baggage } from "./Baggage";
import { Ticket } from "./Ticket";

export class Passsenger {
  id: number; //unique id
  ticket: Ticket; //all passengers have a ticket
  baggages: Baggage[]; //should be at most 1 large piece.

  constructor(id: number) {
    this.id = id;
    this.baggages = [];
    this.ticket = Ticket.placeholderTicket();
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
  thinkAndMove() {}
}
