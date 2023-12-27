import { Baggage } from "./Baggage";
import { BaggageCompartment } from "./BaggageCompartment";
import { Direction } from "./Direction";
import { Seat } from "./Seat";

/**
 * This is a directed graph node.
 * All nodes are walkable.
 * Passengers cannot hop over occupied nodes
 * Can have one seat.
 * This doesn't need to be a grid.
 * These are static.
 */
export class PlaneNode {
  id: number; // unique id

  neighbors: Set<PlaneNode>; //neighboring nodes

  private baggageCompartments: Map<Direction, BaggageCompartment>;

  sprite?: Phaser.GameObjects.Sprite;

  seatInfo?: Seat; //if there is a set, then only one seat

  isEnterNode!: boolean; //plane entrance
  isExitNode!: boolean; //plane exit

  constructor(id: number) {
    this.id = id;
    this.neighbors = new Set();
    this.baggageCompartments = new Map();

    this.isEnterNode = false;
    this.isExitNode = false;
  }

  /**
   * add node to neighbors. Goes both ways.
   * @param newNode -
   */
  addNeighbor(newNode: PlaneNode) {
    this.neighbors.add(newNode);
    newNode.neighbors.add(this);
  }

  /**
   * Has baggage compartments that can fit your baggage.
   * @param baggageSize Your baggage.
   * @returns True, if there's enough space. False, otherrwise.
   */
  hasOpenBaggageCompartments(baggageSize: number): boolean {
    for (let [_, compartment] of this.baggageCompartments) {
      if (compartment.hasRemainingSpace(baggageSize)) return true;
    }

    return false;
  }

  /**
   * Call has hasOpenBaggageCompartments before calling this.
   * @returns the direction of an open baggage compartment. throws error if none.
   */
  getAnyOpenBaggageCompartmentDirection(baggageSize: number): Direction {
    for (let [direction, compartment] of this.baggageCompartments) {
      if (compartment.hasRemainingSpace(baggageSize)) return direction;
    }

    throw new Error(
      "Should be baggage left here. Please check baggage space before using this."
    );
  }

  setBaggageCompartment(direction: Direction, size: number) {
    this.baggageCompartments.set(direction, new BaggageCompartment(size));
  }

  addBaggage(direction: Direction, size: Baggage) {
    this.baggageCompartments.get(direction).addBaggage;
  }

  public toString() {
    let baggageStr = "";
    for (const [direction, compartment] of this.baggageCompartments) {
      baggageStr += `{dir: ${direction} : cap: ${compartment.current}/${compartment.max}}`;
    }

    const neighborsArr = Array.from(this.neighbors.values()).map((n) => n.id);
    const neighborsStr = neighborsArr.join(",");

    const ticket = this.seatInfo?.toTicket();
    const ticketStr = ticket
      ? `${ticket?.seatClass}:${ticket?.aisle}${ticket.number}`
      : undefined;

    const objWithout = {
      ...this,
      sprite: undefined,
      neighbors: neighborsStr,
      seatInfo: ticketStr,
      isEnterNode: this.isEnterNode ? "yes" : undefined,
      isExitNode: this.isExitNode ? "yes" : undefined,
      baggageCompartments: `[${baggageStr}]`,
    };

    return JSON.stringify(objWithout);
  }

  destroy() {
    this.sprite?.destroy();
  }
}
