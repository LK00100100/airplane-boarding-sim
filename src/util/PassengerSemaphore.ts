import { Passenger } from "../data/Passenger";

/**
 * Add an event by passing in a set of passengers into addEvent(passenger, func).
 * When those passengers are done doing stuff, call release(passenger);
 * When specific set of passengers have been released, their function will be fired, and
 * the entries will be deleted.
 * Releasing extra passengers will throw an error.
 */
export class PassengerSemaphore {
  //add passengers that are involved.
  //not released until its subset of passengers is released
  private passengerToFunc: Map<Passenger, (p: Passenger) => void>;

  public constructor() {
    this.passengerToFunc = new Map();
  }

  /**
   * Once all passengers in this list have been released, the function will be called.
   * @param passengers Cannot add passengers that are in use. Duplicates are ignored.
   * @param func calls after all passengers have been released
   */
  public addEvent(passengers: Array<Passenger>, func: Function): void {
    const passengersSet = new Set(passengers);
    const numPassengers = passengersSet.size;

    const releasedSet: Set<Passenger> = new Set();

    let realFunc = (passenger) => {
      if (releasedSet.has(passenger))
        throw new Error(`passenger has been released already: ${passenger}`);

      releasedSet.add(passenger);

      if (releasedSet.size == numPassengers) {
        func();

        //clear passenger subset
        passengers.forEach((p) => {
          this.passengerToFunc.delete(p);
        });
      }
    };

    passengers.forEach((p) => {
      this.passengerToFunc.set(p, realFunc);
    });
  }

  /**
   * Call this when a passenger has completed their action.
   * When this passenger's entire subset has been released, a function will be called.
   * Releasing the non-existent or same passenger again, returns false.
   * @param passenger this passenger has completed their action.
   * @returns true if released properly. false, if it was an extra.
   */
  public release(passenger: Passenger): boolean {
    if (!this.passengerToFunc.has(passenger)) return false;

    this.passengerToFunc.get(passenger)!(passenger);

    return true;
  }
}
