import { BaggageCompartment } from "./BaggageCompartment";
import { Seat } from "./Seat";

/**
 * This is a directed graph node.
 * All nodes are walkable.
 * Passengers cannot hop over occupied nodes
 * Can have one seat.
 * This may not be a grid.
 */
export class PlaneNode {
  id: number; // unique id

  inNodes: number[]; //node ids going in
  outNodes: number[]; //node ids going out

  baggageCompartments: BaggageCompartment[];

  //when occupied, no one is allowed to enter except the passenger id
  occupiedLock: number | null; //occupying passenger id

  sprite?: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Sprite;

  seatInfo?: Seat; //if there is a set, then only one seat

  constructor(id: number) {
    this.id = id;
    this.inNodes = [];
    this.outNodes = [];
    this.baggageCompartments = [];

    this.occupiedLock = null;
  }
}
