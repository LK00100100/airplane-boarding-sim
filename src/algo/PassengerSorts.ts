import { Passenger } from "../data/Passenger";

/**
 * Sorting algorithms for lists of passengers.
 * Only been tested with one plane.
 * WILL goof with other planes.
 */
export class PassengerSorts {
  /**
   * Sorts passengers from front to back.
   * And Out (windows) to In (aisles).
   * @param a passenger
   * @param b passenger
   * @returns -1 if a < b; 1 if a > b; otherwise, 0.
   */
  public static frontToBack(a: Passenger, b: Passenger): number {
    const aTicket = a.getTicket();
    const bTicket = b.getTicket();

    if (aTicket.aisle == bTicket.aisle) {
      if (aTicket.number == bTicket.number) throw new Error("bad comparator");

      //A + F < B + E < C + D
      const aTicketNumber = PassengerSorts.backToFrontAssignNumber(
        aTicket.number
      );
      const bTicketNumber = PassengerSorts.backToFrontAssignNumber(
        bTicket.number
      );

      return aTicketNumber - bTicketNumber;
    }

    //aisle 1 < aisle 2
    return aTicket.aisle - bTicket.aisle;
  }

  /**
   * Sorts passengers from back to front.
   * And Out (windows) to In (aisles).
   * @param a passenger
   * @param b passenger
   * @returns -1 if a < b; 1 if a > b; otherwise, 0.
   */
  public static backToFront(a: Passenger, b: Passenger): number {
    const aTicket = a.getTicket();
    const bTicket = b.getTicket();

    if (aTicket.aisle == bTicket.aisle) {
      if (aTicket.number == bTicket.number) throw new Error("bad comparator");

      //A + F < B + E < C + D
      const aTicketNumber = PassengerSorts.backToFrontAssignNumber(
        aTicket.number
      );
      const bTicketNumber = PassengerSorts.backToFrontAssignNumber(
        bTicket.number
      );

      return aTicketNumber - bTicketNumber;
    }

    //aisle 2 < aisle 1
    return bTicket.aisle - aTicket.aisle;
  }

  /**
   * Turns seatNumber into an actual number for comparison.
   * A+F < B+E < C+D
   * @param seatNumber
   * @returns
   */
  private static backToFrontAssignNumber(seatNumber: string): number {
    if (seatNumber == "A" || seatNumber == "F") return 0;
    if (seatNumber == "B" || seatNumber == "E") return 1;
    if (seatNumber == "D") return 2;
    if (seatNumber == "C") return 3;
  }

  public static outToIn(a: Passenger, b: Passenger) {
    const aTicket = a.getTicket();
    const bTicket = b.getTicket();

    // A + F < B + E < D < C
    const aTicketNumber = PassengerSorts.outToInAssignNumber(aTicket.number);
    const bTicketNumber = PassengerSorts.outToInAssignNumber(bTicket.number);

    const diff = aTicketNumber - bTicketNumber;

    if (diff != 0) return diff;

    //aisle 2 < aisle 1
    return bTicket.aisle - aTicket.aisle;
  }

  /**
   * For the outToIn(), converts seatNumbers to numbers for comparison.
   * @param seatNumber
   * @returns
   */
  private static outToInAssignNumber(seatNumber: string): number {
    switch (seatNumber) {
      case "A":
        return 0;
      case "F":
        return 1;
      case "B":
        return 2;
      case "E":
        return 3;
      case "D":
        return 4;
      case "C":
        return 5;
      default:
        throw new Error("not supported");
    }
  }

  /**
   * sorts passengers like:
   * window odd < window even < middle odd < middle even < etc
   * @param a -
   * @param b -
   * @returns
   */
  public static steffanMethod(a: Passenger, b: Passenger): number {
    const aTicket = a.getTicket();
    const bTicket = b.getTicket();

    const aTicketNumber = PassengerSorts.outToInAssignNumber(aTicket.number);
    const bTicketNumber = PassengerSorts.outToInAssignNumber(bTicket.number);

    const diff = aTicketNumber - bTicketNumber;

    if (diff != 0) return diff;

    //odds < evens
    const isOddA = aTicket.aisle % 2 != 0;
    const isOddB = bTicket.aisle % 2 != 0;

    if (isOddA && !isOddB) return -1;
    else if (!isOddA && isOddB) return 1;

    //then aisle 2 < aisle 1

    return bTicket.aisle - aTicket.aisle;
  }

  /**
   * sorts passengers to maximize slow shuffling.
   * front to back.
   * then aisle first, then window.
   * @param a -
   * @param b -
   * @returns
   */
  public static slothSort(a: Passenger, b: Passenger): number {
    const aTicket = a.getTicket();
    const bTicket = b.getTicket();

    if (aTicket.aisle == bTicket.aisle) {
      if (aTicket.number == bTicket.number) throw new Error("bad comparator");

      //aisle then window
      const aTicketNumber = PassengerSorts.slothSortAssignNumber(
        aTicket.number,
        aTicket.aisle
      );
      const bTicketNumber = PassengerSorts.slothSortAssignNumber(
        bTicket.number,
        aTicket.aisle
      );

      return aTicketNumber - bTicketNumber;
    }

    //aisle 1 < aisle 2
    return aTicket.aisle - bTicket.aisle;
  }

  /**
   * Turns seatNumber into an actual number for comparison.
   * A+F < B+E < C+D
   * @param seatNumber
   * @returns
   */
  private static slothSortAssignNumber(
    seatNumber: string,
    aisleNumber: number
  ): number {
    //first class
    if (aisleNumber <= 2) {
      if (seatNumber == "B" || seatNumber == "C") return 0;
      if (seatNumber == "A" || seatNumber == "D") return 1;
    }

    //coach
    if (seatNumber == "C" || seatNumber == "D") return 0;
    if (seatNumber == "B" || seatNumber == "E") return 1;
    if (seatNumber == "A" || seatNumber == "F") return 2;
  }

  /**
   * Randomizes list.
   * @param list target list.
   * @param numSwaps number of times to swap two random things in the list. Should be positive. Otherwise, set to 0.
   */
  public static randomize(list: Array<any>, numSwaps: number): void {
    numSwaps = Math.max(0, numSwaps);

    //getRandomInt(3) = 0, 1, 2
    function getRandomInt(max: number) {
      return Math.floor(Math.random() * max);
    }

    for (let i = 0; i < numSwaps; i++) {
      const a = getRandomInt(list.length);
      const b = getRandomInt(list.length);

      const temp = list[a];
      list[a] = list[b];
      list[b] = temp;
    }
  }
}

/**
 * Compares two passengers. if a < b, then -1. 0 if same. otherwise, 1.
 */
export type PassengerComparator = (a: Passenger, b: Passenger) => number;
