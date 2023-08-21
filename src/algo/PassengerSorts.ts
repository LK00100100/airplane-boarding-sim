import { Passenger } from "../data/Passenger";

/**
 * Sorting algorithms for lists of passengers.
 * Only been tested with one plane.
 * May goof with other planes.
 */
export default class PassengerSorts {
  /**
   * Sorts passengers from front to back.
   * And Out (windows) to In (aisles).
   * @param a passenger
   * @param b passenger
   * @returns -1 if a < b; 1 if a > b; otherwise, 0.
   */
  public static frontToBack(a: Passenger, b: Passenger) {
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
  public static backToFront(a: Passenger, b: Passenger) {
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
  public static steffanMethod(a: Passenger, b: Passenger) {
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
}
