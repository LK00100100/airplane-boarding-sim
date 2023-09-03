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

  //TODO: destroy()

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

  setBaggageComparment(direction: Direction, size: number) {
    this.baggageCompartments.set(direction, new BaggageCompartment(size));
  }

  addBaggage(direction: Direction, size: Baggage) {
    this.baggageCompartments.get(direction).addBaggage;
  }

  public toString() {
    //TODO: fix this filth. doesnt work :)
    let baggageStr = "";
    for (const [direction, compartment] of this.baggageCompartments) {
      baggageStr += `{dir: ${direction} : cap: ${compartment.current}/${compartment.max}}`;
    }

    const neighborsStr = Array.from(this.neighbors.values()).join(",");

    const objWithout = {
      ...this,
      sprite: undefined,
      outs: neighborsStr, //TODO: using outNodes doesn't overwrite?
      baggageCompartments: `[${baggageStr}]`, //TODO: using baggageCompartments doesn't overwrite?
    };

    return JSON.stringify(objWithout);
  }
}
