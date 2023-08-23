import { PlaneNode } from "./PlaneNode";

/**
 * @param tickerholderSpaces a space for the person trying to get to their seat
 * @param blockerSpaces spaces for the blockers in the ticketholder's aisle. Does not need to be everyone in the aisle.
 * @param hasFreeSpaces
 */
export type BlockerSpaces = {
  tickerholderSpaces: Array<PlaneNode>;
  blockerSpaces: Array<PlaneNode>;
  hasFreeSpaces: boolean;
};
