/**
 * A Ticket for a plane.
 * Such as: seatClass: coach; aisle: 10, seat: F.
 */
export class Ticket {
  seatClass: string;
  aisle: number;
  seat: string;

  constructor(seatClass: string, aisle: number, seat: string) {
    this.seatClass = seatClass;
    this.aisle = aisle;
    this.seat = seat;
  }

  static placeholderTicket(): Ticket {
    return new Ticket("fake", -1, "$");
  }
}
