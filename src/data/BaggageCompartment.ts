import { Baggage } from "./Baggage";

/**
 * a container that holds baggage.
 * No stack or queue-like behavior.
 */
export class BaggageCompartment {
  current: number; //current capacity
  max: number; //max capacity

  //no passengerId baggage means no entry.
  baggageList: Map<number, Array<Baggage>>; //<passengerId, their baggage>

  constructor(max: number = 1000) {
    this.current = 0;
    this.max = max;

    this.baggageList = new Map();
  }

  /**
   * Add baggage into compartments
   * WIP: add math and errors
   * @param baggage
   */
  addBaggage(baggage: Baggage) {
    const passengerId = baggage.ownerId;

    if (!this.baggageList.has(passengerId))
      this.baggageList.set(passengerId, []);

    this.baggageList.get(passengerId).push(baggage);
  }

  /**
   * Sees if you can fit this baggage here.
   * @param baggageSize
   * @returns  Returns true if there's enough space. False, otherwise.
   */
  hasRemainingSpace(baggageSize: number) {
    return this.max - this.current >= baggageSize;
  }

  /**
   * Remove one piece of baggage owned by you. Order not-enforced.
   * throws error if nothing is found.
   * WIP: add math and errors
   */
  removeBaggage(passengerId: number) {
    if (!this.baggageList.has(passengerId))
      throw new Error(`No baggage for passenger id of ${passengerId}`);

    const baggage = this.baggageList.get(passengerId).pop();

    //no more baggage for passengerId
    if (this.baggageList.get(passengerId).length == 0)
      this.baggageList.delete(passengerId);

    return baggage;
  }
}
