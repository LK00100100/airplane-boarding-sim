/**
 * Represents four cardinal directions.
 */
export enum Direction {
  NORTH = 0,
  EAST = 1,
  SOUTH = 2,
  WEST = 3,
}

/**
 *
 * @param letter case-insensitive
 * @returns
 */
export function toDirection(letter: string): Direction {
  switch (letter.toUpperCase()) {
    case "N":
      return Direction.NORTH;
    case "E":
      return Direction.EAST;
    case "S":
      return Direction.SOUTH;
    case "W":
      return Direction.WEST;
    default:
      throw new Error(`bad direction input: ${letter}`);
  }
}
