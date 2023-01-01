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

  public static createPlaceholderTicket(): Ticket {
    return new Ticket("fake", -1, "$");
  }

  public toString(): string {
    return JSON.stringify(this);
  }

  /**
   * a shorter output such as: "coach,10D"
   * @returns
   */
  public toConciseString(): string {
    return `${this.seatClass},${this.aisle}${this.number}`;
  }
}
