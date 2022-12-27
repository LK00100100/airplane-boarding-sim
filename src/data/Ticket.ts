/**
 * A Ticket for a plane.
 * Such as: seatClass: coach; aisle: 10, number: F.
 */
export class Ticket {
  seatClass: string;
  aisle: number;
  number: string;

  constructor(seatClass: string, aisle: number, number: string) {
    this.seatClass = seatClass;
    this.aisle = aisle;
    this.number = number;
  }

  static placeholderTicket(): Ticket {
    return new Ticket("fake", -1, "$");
  }
}
