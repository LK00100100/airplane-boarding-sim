export class Seat {
  seatClass: string;
  aisle: number;
  number: string; //can be letter

  constructor(seatClass: string, aisle: number, number: string) {
    this.seatClass = seatClass;
    this.aisle = aisle;
    this.number = number;
  }
}
