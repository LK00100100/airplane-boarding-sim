import { BaggageCompartment } from "./BaggageCompartment";
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

  baggageCompartments: BaggageCompartment[];

  sprite?: Phaser.GameObjects.Sprite;

  seatInfo?: Seat; //if there is a set, then only one seat

  constructor(id: number) {
    this.id = id;
    this.inNodes = new Set();
    this.outNodes = new Set();
    this.baggageCompartments = [];
  }

  addInNode(newNodeId: number) {
    this.inNodes.add(newNodeId);
  }

  addOutNode(newNodeId: number) {
    this.outNodes.add(newNodeId);
  }

  public toString() {
    const objWithout = { ...this, sprite: undefined };

    return JSON.stringify(objWithout);
  }
}
