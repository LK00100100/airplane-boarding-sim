//a Passenger's Baggage
export class Baggage {
  ownerId: number; //passenger id
  size: number;

  constructor(ownerId: number, size: number) {
    this.ownerId = ownerId;
    this.size = size;
  }

  toString(): string {
    return `ownerId: ${this.ownerId}, size: ${this.size}`;
  }
}
