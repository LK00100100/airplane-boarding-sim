import { BaggageCompartment } from "./BaggageCompartment";

/**
 * Passengers cannot hop over occupied nodes
 * All nodes are walkable .
 */
export class PlaneNode {
  id: number; // unique id

  inNodes: number[]; //node ids going in
  outNodes: number[]; //node ids going out

  baggageCompartments: BaggageCompartment[];

  occupiedLock: number; //occupying passenger id

  x: number; // pixel location
  y: number; // pixel location

  constructor() {
    this.id = 0;
    this.inNodes = [];
    this.outNodes = [];
    this.baggageCompartments = [];

    this.occupiedLock = 0;

    this.x = 0;
    this.y = 0;
  }
}
