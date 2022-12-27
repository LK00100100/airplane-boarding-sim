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

  private nodeMap!: Map<number, PlaneNode>;
  private passengerMap!: Map<number, Passsenger>;
  private passengerToNodeMap!: Map<number, number>; //passengerId is occupying nodeId

  private FPS = 100 / 3; //30 FPS in terms of milliseconds

  constructor() {
    super("GameScene");

    this.nodeMap = new Map();
    this.passengerMap = new Map();
    this.passengerToNodeMap = new Map();
  }

  preload() {
    this.load.image("btn-simulate", "assets/btn-simulate.png");
  }

  create() {
    this.gameText = this.add.text(10, 10, "");

    //TODO: check input data is not goofy. dont go too nuts

    this.createPlaneNodes();

    this.createPassengers();

    this.createButtons();
  }

  createPlaneNodes(): void {
    //make nodes
    Level1.nodes.forEach((nodeJson) => {
      if (!this.nodeMap.has(nodeJson.id))
        this.nodeMap.set(nodeJson.id, new PlaneNode(nodeJson.id));

      let nodeData = this.nodeMap.get(nodeJson.id);

      //connect in/out nodes
      nodeJson.out.forEach((outNodeId) => {
        if (!this.nodeMap.has(outNodeId))
          this.nodeMap.set(outNodeId, new PlaneNode(outNodeId));

        nodeData!.addOutNode(outNodeId);

        this.nodeMap.get(outNodeId)!.addInNode(nodeJson.id);
      });

      let sprite;

      //seat node
      if (nodeJson.seat) {
        let seat = nodeJson.seat;
        nodeData!.seatInfo = new Seat(
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

      nodeData!.sprite = sprite;
    });
  }

  createPassengers(): void {
    //make passengers
    Level1.passengers.forEach((passengerJson) => {
      let passenger = new Passsenger(passengerJson.id);

      this.passengerMap.set(passenger.id, passenger);

      if (!passengerJson.ticket) {
        throw Error("ticket required");
      }

      let ticketJson = passengerJson.ticket;
      passenger.ticket = new Ticket(
        ticketJson.seat,
        ticketJson.aisle,
        ticketJson.seat
      );

      if (!this.nodeMap.has(passengerJson.node)) {
        throw Error(`node id doesn't exist: ${passengerJson.node}`);
      }

      let node = this.nodeMap.get(passengerJson.node);

      node?.setOccupiedLock(passengerJson.id);

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

      //set direction
      triangle.angle = 90 * toDirection(passengerJson.direction);

      passenger.sprite = triangle;
    });
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
        scene.setGameText("simulation paused");
        return;
      }

      scene.simulateTimer = scene.time.addEvent({
        delay: scene.FPS,
        loop: true,
        callback: scene.simulateFrame,
        callbackScope: scene,
      });

      scene.setGameText("simulation started");
    });

    sprite.on("pointerover", function (pointer: Phaser.Input.Pointer) {
      sprite.setTint(0x000099);
    });
  }

  setGameText(newText: string) {
    this.gameText.text = newText;
  }

  /**
   * This actually simulates passenger thinking and moving.
   * simulateTimer calls this every frame.
   */
  simulateFrame() {
    //this.setGameText("" + this.simulateTimer.getProgress());

    //simulate passengers
    for (let [_, passenger] of this.passengerMap) {
      //are we at the right aisle?
      //if(passenger.)
      //if so, go to my seat
      //else, step up one
    }
  }

  update() {
    //this.setGameText
  }
}
