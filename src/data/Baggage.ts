//a Passenger's Baggage
export class Baggage {
  ownerId: number; //passenger id
  size: number;

  constructor(ownerId: number, size: number) {
    this.ownerId = ownerId;
    this.size = size;
  }
}
