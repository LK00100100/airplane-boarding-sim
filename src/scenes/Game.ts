import Phaser from "phaser";
import { Direction, toDirection } from "../data/Direction";
import { Passsenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import { Ticket } from "../data/Ticket";
import Level1 from "../levels/level1.json";

export default class Demo extends Phaser.Scene {
  private simulateTimer!: Phaser.Time.TimerEvent;

  private gameText!: Phaser.GameObjects.Text;

  private FPS = 100 / 3; //30 FPS in terms of milliseconds

  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("btn-simulate", "assets/btn-simulate.png");
  }

  create() {
    this.gameText = this.add.text(10, 10, "");

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
        nodeData.seatInfo = new Seat(
          seat.class,
          seat.aisle,
          seat.class,
          toDirection(seat.direction)
        );

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

      passengerMap.set(passenger.id, passenger);

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

      let shape = Phaser.Geom.Triangle.BuildEquilateral(15, 0, 30);

      let triangle = this.add
        .triangle(
          node?.sprite?.x,
          node?.sprite?.y,
          0,
          30,
          30,
          30,
          15,
          0,
          0xbb0000
        )
        .setInteractive(shape, Phaser.Geom.Triangle.Contains);

      let scene = this;
      //  Input Event listeners
      triangle.on("pointerover", function () {
        triangle.fillColor = 0xbbbb00;
        scene.setGameText(passenger.toString());
      });

      triangle.on("pointerout", function () {
        scene.setGameText("");
        triangle.fillColor = 0xbb0000;
      });

      //TODO: extract methods

      //set direction
      triangle.angle = 90 * toDirection(passengerJson.direction);

      passenger.sprite = triangle;
    });

    this.createButtons();
  }

  createButtons(): void {
    let sprite = this.add.sprite(400, 300, "btn-simulate").setInteractive();

    let scene = this;

    sprite.on("pointerdown", function (pointer: Phaser.Input.Pointer) {
      sprite.setTint(0x00bb00);
    });

    sprite.on("pointerout", function (pointer: Phaser.Input.Pointer) {
      sprite.clearTint();
    });

    sprite.on("pointerup", function (pointer: Phaser.Input.Pointer) {
      sprite.clearTint();

      if (scene.simulateTimer && !scene.simulateTimer.paused) {
        scene.simulateTimer.paused = true;
        return;
      }

      scene.simulateTimer = scene.time.addEvent({
        delay: scene.FPS,
        loop: true,
        callback: scene.simulateFrame,
        callbackScope: scene,
      });
    });

    sprite.on("pointerover", function (pointer: Phaser.Input.Pointer) {
      sprite.setTint(0x000099);
    });
  }

  setGameText(newText: string) {
    this.gameText.text = newText;
  }

  /**
   * simulate timer calls this often
   */
  simulateFrame() {
    this.setGameText("" + this.simulateTimer.getProgress());
  }

  update() {
    //this.setGameText
  }
}
