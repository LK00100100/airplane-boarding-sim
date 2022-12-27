import Phaser from "phaser";
import { toDirection } from "../data/Direction";
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
  private passengerToNodeMap!: Map<number, number>; //passengerId is in nodeId. also used as a lock

  //when occupied, no one is allowed to enter except the passenger
  //no node key means no passenger.
  private nodeToPassengerMap!: Map<number, number>; //nodeId has passengerId

  //passengerId to list of nodeIds to our seat.
  //no passenger means no path. Need to calculate.
  //an empty array means we have arrived.
  private passengerToSeatPath!: Map<number, Array<number>>;

  private FPS = 100 / 3; //30 FPS in terms of milliseconds

  constructor() {
    super("GameScene");

    this.nodeMap = new Map();
    this.passengerMap = new Map();
    this.passengerToNodeMap = new Map();
    this.passengerToSeatPath = new Map();
    this.nodeToPassengerMap = new Map();
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

  private createPlaneNodes(): void {
    //make nodes
    Level1.nodes.forEach((nodeJson) => {
      if (!this.nodeMap.has(nodeJson.id))
        this.nodeMap.set(nodeJson.id, new PlaneNode(nodeJson.id));

      let nodeData = this.nodeMap.get(nodeJson.id)!;

      //connect in/out nodes
      nodeJson.out.forEach((outNodeId) => {
        if (!this.nodeMap.has(outNodeId))
          this.nodeMap.set(outNodeId, new PlaneNode(outNodeId));

        nodeData.addOutNode(outNodeId);

        this.nodeMap.get(outNodeId)!.addInNode(nodeJson.id);
      });

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
    });
  }

  private createPassengers(): void {
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

      let node = this.nodeMap.get(passengerJson.node)!;

      this.passengerToNodeMap.set(passenger.id, node.id);

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

  private createButtons(): void {
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
  private simulateFrame(): void {
    //this.setGameText("" + this.simulateTimer.getProgress());

    //TODO: could replace passengermap with needseatSet()

    //simulate passengers
    for (let [passengerId, passenger] of this.passengerMap) {
      let passengerNodeId = this.passengerToNodeMap.get(passengerId);

      let node = this.nodeMap.get(passengerNodeId!)!;

      //TODO: lock and unlock nodes

      //need to calc path
      if (!this.passengerToSeatPath.has(passengerId)) {
        let path = this.calculateMinPassengerSeatPath(
          passenger.ticket,
          passengerNodeId!
        );

        if (path == null) throw Error("all target seats should exist");

        this.passengerToSeatPath.set(passengerId, path);
      }

      let pathToSeat = this.passengerToSeatPath.get(passengerId)!;

      //are we at our seat? sit down
      if (node.seatInfo?.isTicketSeat(passenger.ticket)) {
        //TODO: face the seat direction
        //TODO: passenger ismoving = false, when the animation stops

        return;
      }

      if (pathToSeat.length == 0) throw Error("shouldn't be 0");

      //else move to step closer
      let nextNodeId = pathToSeat.shift()!;
      let nextNode = this.nodeMap.get(nextNodeId)!;

      let tween = this.tweens.add({
        targets: passenger.sprite,
        x: nextNode.sprite?.x,
        y: nextNode.sprite?.y,
        duration: 500,
        ease: "Power2",
      });
    }
  }

  /**
   * calculate the min path from currentNodeId to passengerId's ticket.
   * @param passengerId
   * @param currentNodeId
   * @returns a list of node ids from you to the seat. Does not include currentNode. first node is the next node.
   * an empty array means we're already there. returns null on no path.
   */
  private calculateMinPassengerSeatPath(
    ticket: Ticket,
    startNodeId: number
  ): Array<number> | null {
    let distMap: Map<number, number> = new Map(); //nodeId, distance
    let startNode = this.nodeMap.get(startNodeId)!;

    //we're already there
    if (startNode.seatInfo?.isTicketSeat(ticket)) {
      return [];
    }

    //calc min (BFS)
    let queue = Array.from(startNode.outNodes);
    let level = 1;
    let goalNode = null;

    let visited: Set<number> = new Set();

    while (queue.length > 0) {
      let levelSize = queue.length;

      for (let i = 0; i < levelSize; i++) {
        let currentNodeId = queue.shift()!;

        if (visited.has(currentNodeId)) continue;

        visited.add(currentNodeId);

        distMap.set(currentNodeId, level);

        let currentNode = this.nodeMap.get(currentNodeId)!;

        if (startNode.seatInfo?.isTicketSeat(ticket)) {
          goalNode = currentNode;
          break;
        }

        queue.concat(Array.from(currentNode.outNodes));
      }

      levelSize = queue.length;
      level++;
    }

    //no path found
    if (!goalNode) {
      return null;
    }

    //get the path from start to end
    let path: Array<number> = [goalNode.id];

    visited.clear();

    let currentNode = goalNode;
    while (level > 0) {
      currentNode.inNodes.forEach((prevId) => {
        let prevDist = distMap.get(prevId) ?? level;

        //go back a node
        if (prevDist == level - 1) {
          currentNode = this.nodeMap.get(prevId)!;
          path.unshift(prevId);
          return;
        }
      });

      level--;
    }

    return path;
  }

  update() {
    //this.setGameText
    //TODO: check to see everyone has stopped moving or has their seat
  }
}
