import Phaser from "phaser";
import { Direction, toDirection } from "../data/Direction";
import { Passenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import { Ticket } from "../data/Ticket";
import Level1 from "../levels/level1.json";
import Level2 from "../levels/level2.json";
import { ButtonUtils } from "../util/ButtonUtils";
import { SpriteUtils } from "../util/SpriteUtils";
import EditPassengersScene from "./EditPassengersScene";
import { GameSubScene } from "./GameSubscene";

export default class GameScene extends Phaser.Scene {
  private simulateTimer!: Phaser.Time.TimerEvent; //runs every frame

  private timers!: Set<Phaser.Time.TimerEvent>; //all timers

  private gameText!: Phaser.GameObjects.Text;

  private nodeMap!: Map<number, PlaneNode>;
  private passengerMap!: Map<number, Passenger>;

  //neds calculation from current node to seat
  //TODO: just use passenger
  private passengerOnMove!: Array<number>; //<passenger ids>, a stack

  //passengerId is not moving in nodeId. key is removed if passenger is moving.
  private passengerToNodeMap!: Map<number, number>;

  //used when passenger is entering and/or exiting.
  //when occupied, no one is allowed to enter except the passenger. used as a lock.
  //no node key means no passenger.
  private nodeToPassengerMap!: Map<number, number>; //nodeId has passengerId

  //passengerId to list of nodeIds to our seat.
  //no passenger means no path. Need to calculate.
  //an empty array means we have arrived.
  private passengerToSeatPath!: Map<number, Array<number>>;

  private enterNodesMap!: Map<number, PlaneNode>; //<enterId, nodeid>

  //waiting to be placed on a PlaneNode
  public passengerInPortQueue!: Array<Passenger>;

  private simulationStarted!: boolean; //simulation has begun

  /**
   * subscenes
   */
  private editPassengersScene!: EditPassengersScene;

  /**
   * constants
   */
  private FPS = 100 / 3; //30 FPS in terms of milliseconds

  constructor() {
    super("GameScene");

    //put it in create() for when we reset.
  }

  preload() {
    this.load.image("btn-edit-passengers", "assets/btn-edit-passengers.png");
    this.load.image("btn-simulate", "assets/btn-simulate.png");
    this.load.image("btn-restart", "assets/btn-restart.png");

    this.load.image("passenger", "assets/passenger.png");

    this.load.image("plane-floor", "assets/plane-floor.png");
    this.load.image("plane-seat-coach", "assets/plane-seat-coach.png");
    this.load.image("plane-seat-first", "assets/plane-seat-first.png");
  }

  create() {
    console.log("create");

    //TODO: need to destroy all the stuff before reset.
    //stuff isnt destroyed on reset
    //console.log("timer size: " + this.timers?.size);

    this.timers = new Set();

    this.simulateTimer = this.time.addEvent({
      delay: this.FPS,
      loop: true,
      paused: true,
      callback: this.simulateFrame,
      callbackScope: this,
    });

    this.timers.add(this.simulateTimer);

    this.gameText = this.add.text(10, 10, "");

    this.nodeMap = new Map();
    this.passengerMap = new Map();
    this.passengerOnMove = [];

    this.passengerToNodeMap = new Map();
    this.nodeToPassengerMap = new Map();
    this.passengerToSeatPath = new Map();

    this.enterNodesMap = new Map();

    this.passengerInPortQueue = [];

    this.simulationStarted = false;

    this.initSubscenes();

    //TODO: check input data is not goofy. dont go too nuts

    this.createPlaneNodes();

    this.createPassengers();

    this.createButtons();
  }

  /**
   * init subscenes to be made once and turned on/off.
   */
  private initSubscenes() {
    if (!this.editPassengersScene) {
      this.editPassengersScene = new EditPassengersScene(this);

      this.scene.add(
        GameSubScene.EDIT_PASSENGERS,
        this.editPassengersScene,
        false
      );
    }
  }

  private createPlaneNodes(): void {
    //make nodes
    //TODO: use interface
    Level2.nodes.forEach((nodeJson) => {
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

      let sprite: Phaser.GameObjects.Sprite;

      //start node
      if ("enter" in nodeJson) {
        let enterId: number = nodeJson["enter"] as number;
        this.enterNodesMap.set(enterId, nodeData);
        nodeData.isEnterNode = true;
      }

      //seat node
      if (nodeJson.seat) {
        let seat = nodeJson.seat;
        nodeData.seatInfo = new Seat(
          seat.class,
          seat.aisle,
          seat.number,
          toDirection(seat.direction)
        );

        sprite = this.add
          .sprite(nodeJson.x, nodeJson.y, "plane-seat-" + seat.class)
          .setInteractive();
      }
      //walking node
      else {
        sprite = this.add
          .sprite(nodeJson.x, nodeJson.y, "plane-floor")
          .setInteractive();
      }

      //  Input Event listeners
      sprite.on("pointerover", () => {
        sprite.setTint(0x00bb00);
        this.setGameText(nodeData.toString());
      });

      sprite.on("pointerout", () => {
        this.setGameText("");
        sprite.clearTint();
      });

      nodeData.sprite = sprite;
    });
  }

  private createPassengers(): void {
    //make passengers
    //TODO: use interface
    Level2.passengers.forEach((passengerJson) => {
      let passenger = new Passenger(passengerJson.id);

      this.passengerMap.set(passenger.id, passenger);

      if (!passengerJson.ticket) {
        throw Error("ticket required");
      }

      let ticketJson = passengerJson.ticket;
      passenger.setTicket(
        new Ticket(ticketJson.class, ticketJson.aisle, ticketJson.number)
      );

      //TODO: remove starting node
      if ("node" in passengerJson) {
        let nodeId: number = passengerJson["node"] as number;
        this.putPassengerOnNode(passenger, nodeId);
        this.passengerOnMove.push(passenger.id);
      } else {
        this.passengerInPortQueue.push(passenger);
      }

      let shape = new Phaser.Geom.Rectangle(2, 10, 26, 12);

      let sprite = this.add
        .sprite(-100, -100, "passenger")
        .setInteractive(shape, Phaser.Geom.Rectangle.Contains);

      //  Input Event listeners
      sprite.on("pointerover", () => {
        sprite.setTint(0xbbbb00);
        this.setGameText(passenger.toString());
      });

      sprite.on("pointerout", () => {
        this.setGameText("");
        sprite.clearTint();
      });

      //TODO: can remove this later and set
      //set direction
      if ("direction" in passengerJson) {
        let directionStr: string = passengerJson["direction"] as string;
        passenger.direction = toDirection(directionStr);
        sprite.angle = 90 * toDirection(directionStr);
      } else {
        passenger.direction = Direction.NORTH;
        sprite.angle = 90 * Direction.NORTH;
      }

      passenger.sprite = sprite;
    });
  }

  private putPassengerOnNode(passenger: Passenger, nodeId: number) {
    if (!this.nodeMap.has(nodeId)) {
      throw Error(`node id doesn't exist: ${nodeId}`);
    }

    let node = this.nodeMap.get(nodeId)!;

    this.passengerToNodeMap.set(passenger.id, nodeId);
    this.nodeToPassengerMap.set(nodeId, passenger.id);

    passenger.sprite!.setPosition(node.sprite!.x, node.sprite!.y);
  }

  private createButtons(): void {
    let editPassengersSprite = this.add
      .sprite(300, 500, "btn-edit-passengers")
      .setInteractive();

    let editPassengersClickFunc = () => {
      if (this.simulationStarted) {
        this.setGameText("Simulation is in progress");
        return;
      }

      //turn on editing ui

      if (
        !this.editPassengersScene.scene.isActive(GameSubScene.EDIT_PASSENGERS)
      ) {
        this.scene.launch(GameSubScene.EDIT_PASSENGERS);
        this.editPassengersScene.redrawPassengerList();
        this.scene.pause();
      }
    };

    ButtonUtils.dressUpButton(editPassengersSprite, editPassengersClickFunc);

    let simulateSprite = this.add
      .sprite(500, 500, "btn-simulate")
      .setInteractive();

    let simulateClickFunc = () => {
      if (this.simulateTimer && !this.simulateTimer.paused) {
        this.setGameText("simulation already running");
        return;
      }

      this.simulationStarted = true;
      this.simulateTimer.paused = false;
      this.setGameText("simulation started");
    };

    ButtonUtils.dressUpButton(simulateSprite, simulateClickFunc);

    let restartSprite = this.add
      .sprite(700, 500, "btn-restart")
      .setInteractive();

    let restartClickFunc = () => {
      this.scene.restart();
    };

    ButtonUtils.dressUpButton(restartSprite, restartClickFunc);
  }

  /**
   * displays the text. adds new lines if the string is too long
   * @param newText
   */
  setGameText(newText: string) {
    let newText2 = "";

    let sentenceLength = 75;

    while (newText.length > 0) {
      if (newText.length < sentenceLength) {
        newText2 += newText;
        break;
      }

      newText2 += newText.substring(0, sentenceLength) + "\n";
      newText = newText.substring(sentenceLength);
    }

    this.gameText.text = newText2;
  }

  //TODO: just move to update, no simulate timer
  /**
   * This actually simulates passenger thinking and then orders them to move.
   * simulateTimer calls this every frame.
   */
  private simulateFrame(): void {
    let scene = this;

    //unqueue one passenger (if we can) onto a starting PlaneNode
    if (this.passengerInPortQueue.length > 0) {
      //TODO: fix if multiple entrances
      let enterNode = this.enterNodesMap.get(0)!;

      if (!this.nodeToPassengerMap.has(enterNode!.id)) {
        let passenger = this.passengerInPortQueue.shift()!;

        this.putPassengerOnNode(passenger, enterNode.id);
        this.passengerOnMove.push(passenger.id);
      }
    }

    //simulate passengers
    while (this.passengerOnMove.length > 0) {
      let passengerId = this.passengerOnMove.pop()!;
      let passenger = this.passengerMap.get(passengerId)!;
      let passengerNodeId = this.passengerToNodeMap.get(passengerId);

      let startNode = this.nodeMap.get(passengerNodeId!)!;

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
      if (startNode.seatInfo?.isTicketSeat(passenger.ticket)) {
        //TODO: set direction
        let newAngle = SpriteUtils.shortestAngle(
          passenger.sprite!.angle,
          90 * startNode.seatInfo.direction
        );

        //face the seat
        passenger.tween = this.tweens.add({
          targets: passenger.sprite,
          angle: newAngle,
          duration: 400, //TODO: hard code
          ease: "Power2",
          onComplete: function () {},
        });

        return;
      }

      if (pathToSeat.length == 0) throw Error("shouldn't be 0");

      //else move to step closer (if we can)
      let nextNodeId = pathToSeat[0];

      //next space occupied
      if (this.nodeToPassengerMap.has(nextNodeId)) {
        //try again later
        let timer = this.time.addEvent({
          delay: 150, //TODO: hard code
          loop: false,
          callback: () => {
            this.passengerOnMove.push(passengerId);
            this.timers.delete(timer);
          },
          callbackScope: this,
        });

        this.timers.add(timer);
        return;
      }

      pathToSeat.shift();

      let nextNode = this.nodeMap.get(nextNodeId)!;

      this.nodeToPassengerMap.set(nextNode.id, passengerId); //occupy start and next node

      this.setNextDirection(passenger, startNode, nextNode);

      let newAngle = SpriteUtils.shortestAngle(
        passenger.sprite!.angle,
        90 * passenger.direction
      );

      //TODO: set direction
      passenger.tween = this.tweens.add({
        targets: passenger.sprite,
        x: nextNode.sprite?.x,
        y: nextNode.sprite?.y,
        angle: newAngle, //TODO: hard code
        duration: 400, //TODO: hard code
        ease: "Power2",
        onComplete: function () {
          scene.nodeToPassengerMap.delete(startNode.id);
          scene.passengerToNodeMap.set(passengerId, nextNode.id);
          scene.passengerOnMove.push(passengerId);
        },
      });
    }
  }

  /**
   * Sets the direction of the passenger to where they are going.
   */
  private setNextDirection(
    passenger: Passenger,
    startNode: PlaneNode,
    nextNode: PlaneNode
  ) {
    let nextX = nextNode.sprite!.x - startNode.sprite!.x;
    let nextY = nextNode.sprite!.y - startNode.sprite!.y;

    //horizontal is more powerful
    if (Math.abs(nextX) > Math.abs(nextY)) {
      passenger.direction = Direction.WEST;
      if (startNode.sprite!.x < nextNode.sprite!.x)
        passenger.direction = Direction.EAST;
    }
    //vertical is more powerful
    else {
      passenger.direction = Direction.NORTH;
      if (startNode.sprite!.y < nextNode.sprite!.y)
        passenger.direction = Direction.SOUTH;
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

    //calc min distance to goal (BFS)
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

        if (currentNode.seatInfo?.isTicketSeat(ticket)) {
          goalNode = currentNode;
          break;
        }

        queue = queue.concat(Array.from(currentNode.outNodes));
      }

      if (goalNode) break;

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

    //TODO: remove later
    this.colorOccupiedNodes();
  }

  /**
   * for debug use.
   */
  colorOccupiedNodes() {
    for (let [_, node] of this.nodeMap) {
      node.sprite?.clearTint();
    }

    for (let [nodeId, _] of this.nodeToPassengerMap) {
      let node = this.nodeMap.get(nodeId)!;

      node.sprite!.tint = 0x900000;
    }
  }
}
