import Phaser from "phaser";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import Level1 from "../levels/level1.json";

export default class Demo extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("logo", "assets/phaser3-logo.png");
  }

  create() {
    //var c1 = this.add.circle(200, 200, 10, 0x6666ff);

    //var r1 = this.add.rectangle(200, 300, 148, 148, 0x6666ff);

    //console.log(Level1);

    let nodeMap: Map<number, PlaneNode> = new Map();

    //make nodes
    Level1.nodes.forEach((node) => {
      let nodeData = new PlaneNode(node.id);
      let sprite;

      //seat node
      if (node.seat) {
        let seat = node.seat;
        nodeData.seatInfo = new Seat(seat.class, seat.aisle, seat.class);

        sprite = this.add.rectangle(node.x, node.y, 30, 30, 0x0000aa);
      }
      //walking node
      else {
        sprite = this.add.rectangle(node.x, node.y, 30, 30, 0xaaaaaa);
      }

      nodeData.sprite = sprite;

      nodeMap.set(node.id, nodeData);
    });
  }
}
