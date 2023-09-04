import { Direction } from "./Direction";
import { Ticket } from "./Ticket";
import _ from "lodash";

export class Seat {
  seatClass: string;
  aisle: number;
  number: string; //can be letter
  direction: Direction;

  constructor(
    seatClass: string,
    aisle: number,
    number: string,
    direction: Direction
  ) {
    this.seatClass = seatClass;
    this.aisle = aisle;
    this.number = number;
    this.direction = direction;
  }

  public toTicket(): Ticket {
    return new Ticket(this.seatClass, this.aisle, this.number);
  }

  public isTicketSeat(ticket: Ticket): boolean {
    if (this.aisle != ticket.aisle) return false;

    if (this.number != ticket.number) return false;

    return this.seatClass == ticket.seatClass;
  }

  public toString() {
    return JSON.stringify(this);
  }
}
