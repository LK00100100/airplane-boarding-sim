import { Direction } from "./Direction";

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
}
