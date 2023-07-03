import { BaggageCompartment } from "./BaggageCompartment";
import { Direction } from "./Direction";
import { Seat } from "./Seat";

/**
 * This is a directed graph node.
 * All nodes are walkable.
 * Passengers cannot hop over occupied nodes
 * Can have one seat.
 * This may not be a grid.
 * These are static.
 */
export class PlaneNode {
  id: number; // unique id

  inNodes: Set<number>; //node ids going in
  outNodes: Set<number>; //node ids going out

  baggageCompartments: Map<Direction, BaggageCompartment>;

  sprite?: Phaser.GameObjects.Sprite;

  seatInfo?: Seat; //if there is a set, then only one seat

  isEnterNode!: boolean;
  isExitNode!: boolean;

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

  setBaggageComparment(direction: Direction, size: number) {
    this.baggageCompartments.set(direction, new BaggageCompartment(size));
  }

  public toString() {
    let baggageStr = "";
    for (const [key, val] of this.baggageCompartments) {
      baggageStr += `{dir: ${key} : cap: ${val.current}/${val.max}}`;
    }

    const objWithout = {
      ...this,
      sprite: undefined,
      baggageCompartments: `[${baggageStr}]`,
    };

    return JSON.stringify(objWithout);
  }
}
