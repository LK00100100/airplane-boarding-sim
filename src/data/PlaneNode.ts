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

  //note: overengineering for now
  //TODO: just use Node
  inNodes: Set<number>; //node ids going in
  outNodes: Set<number>; //node ids going out

  private baggageCompartments: Map<Direction, BaggageCompartment>;

  sprite?: Phaser.GameObjects.Sprite;

  seatInfo?: Seat; //if there is a set, then only one seat

  isEnterNode!: boolean; //plane entrance
  isExitNode!: boolean; //plane exit

  constructor(id: number) {
    this.id = id;
    this.inNodes = new Set();
    this.outNodes = new Set();
    this.baggageCompartments = new Map();

    this.isEnterNode = false;
    this.isExitNode = false;
  }

  addInNode(newNodeId: number) {
    this.inNodes.add(newNodeId);
  }

  addOutNode(newNodeId: number) {
    this.outNodes.add(newNodeId);
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

  setBaggageComparment(direction: Direction, size: number) {
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

    const objWithout = {
      ...this,
      sprite: undefined,
      baggageCompartments: `[${baggageStr}]`,
    };

    return JSON.stringify(objWithout);
  }
}
