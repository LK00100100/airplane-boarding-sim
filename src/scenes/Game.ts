import Phaser from "phaser";
import { Passsenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import { Ticket } from "../data/Ticket";
import Level1 from "../levels/level1.json";

export default class Demo extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("logo", "assets/phaser3-logo.png");
  }

  create() {
    let nodeMap: Map<number, PlaneNode> = new Map();
    let passengerMap: Map<number, Passsenger> = new Map();

    //TODO: check input data is not goofy. dont go too nuts

    //make nodes
    Level1.nodes.forEach((nodeJson) => {
      let nodeData = new PlaneNode(nodeJson.id);
      let sprite;

      //seat node
      if (nodeJson.seat) {
        let seat = nodeJson.seat;
        nodeData.seatInfo = new Seat(seat.class, seat.aisle, seat.class);

        sprite = this.add.rectangle(nodeJson.x, nodeJson.y, 30, 30, 0x0000aa);
      }
      //walking node
      else {
        sprite = this.add.rectangle(nodeJson.x, nodeJson.y, 30, 30, 0xaaaaaa);
      }

      nodeData.sprite = sprite;

      nodeMap.set(nodeJson.id, nodeData);
    });

    //make passengers
    Level1.passengers.forEach((passengerJson) => {
      let passenger = new Passsenger(passengerJson.id);

      if (!passengerJson.ticket) {
        throw Error("ticket required");
      }

      let ticketJson = passengerJson.ticket;
      passenger.ticket = new Ticket(
        ticketJson.seat,
        ticketJson.aisle,
        ticketJson.seat
      );

      if (!nodeMap.has(passengerJson.node)) {
        throw Error(`node id doesn't exist: ${passengerJson.node}`);
      }

      let node = nodeMap.get(passengerJson.node);

      var triangle = this.add.triangle(
        node?.sprite?.x,
        node?.sprite?.y,
        0,
        30,
        30,
        30,
        15,
        0,
        0xbb0000
      );
      //triangle.angle = 30;

      passenger.sprite = triangle;
    });
  }
}
