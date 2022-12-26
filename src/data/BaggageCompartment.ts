/**
 * a container that holds baggage (represented as a number)
 * minor carry-on is ignored completely
 */
export class BaggageCompartment {
  current: number; //current capacity
  max: number; //max capacity

  constructor(max: number) {
    this.current = 0;
    this.max = max;
  }
}
