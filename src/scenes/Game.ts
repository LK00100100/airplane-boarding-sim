import * as Phaser from "phaser";
import { Direction, toDirection } from "../data/Direction";
import { Passenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import { Ticket } from "../data/Ticket";
//import * as Level1 from "../levels/level1.json";
import * as Level2 from "../levels/level2.json";
import { ButtonUtils } from "../util/ButtonUtils";
import { SpriteUtils } from "../util/SpriteUtils";
import { SceneNames } from "./SceneNames";
import { Baggage } from "../data/Baggage";

//TODO: use const
//TODO: refactor methods by moving them.
export default class GameScene extends Phaser.Scene {
  private simulateTimer!: Phaser.Time.TimerEvent; //runs every frame. simulates passengers.

  private timers!: Set<Phaser.Time.TimerEvent>; //all Phaser timers
  private activeTweens: Set<Phaser.Tweens.Tween>;

  private gameText!: Phaser.GameObjects.Text; //any messages for the player to read.

  private nodeMap!: Map<number, PlaneNode>; //<node id, PlaneNode>
  private passengerMap!: Map<number, Passenger>;

  //neds calculation from current node to seat
  //TODO: just use passenger
  private passengerOnMove!: Array<number>; //<passenger ids>, a stack

  //passengerId is not moving in nodeId. key is removed if passenger is moving.
  private passengerToNodeMap!: Map<number, number>;

  //used when passenger is entering and/or exiting.
  //when occupied, no one is allowed to enter except the passenger. used as a lock.
  //no node key means no passenger.
  private nodeToPassengerMap!: Map<number, number>; //<nodeId, passengerId in this nodeId>

  //no passenger means no path. Need to calculate.
  //an empty array means we have arrived.
  private passengerToSeatPath!: Map<number, Array<number>>; //<passengerId, list of nodeIds to our seat

  private enterNodesMap!: Map<number, PlaneNode>; //<enterId, nodeid>, plane entrance nodes

  //waiting to be placed on a PlaneNode
  public passengerInPortQueue!: Array<Passenger>;

  private isSimulationOn: boolean; //simulation has begun

  private currentPlane: any; //JSON TODO: json -> class converter thing

  /**
   * subscenes
   */

  /**
   * constants
   */
  private FPS = 100 / 3; //30 FPS in terms of milliseconds
  private IS_DEBUG_MODE = true;

  constructor() {
    super(SceneNames.GAME_SCENE);

    //put it in create() for when we restart().
  }

  preload() {
    this.load.image("btn-simulate", "assets/btn-simulate.png");
    this.load.image("btn-reset", "assets/btn-reset.png");
    this.load.image("btn-complete-reset", "assets/btn-complete-reset.png");

    this.load.image("passenger", "assets/passenger.png");
    this.load.image("baggage", "assets/baggage.png");

    this.load.image("plane-floor", "assets/plane-floor.png");
    this.load.image("plane-seat-coach", "assets/plane-seat-coach.png");
    this.load.image("plane-seat-first", "assets/plane-seat-first.png");
  }

  /**
   * one time Phaser scene setup.
   */
  create() {
    //TODO: actual reader and validator
    this.currentPlane = Level2;

    //TODO: find a way to just destroy the scene
    //TODO: need to destroy all the stuff before reset.
    //stuff isnt destroyed on reset

    this.timers = new Set();
    this.activeTweens = new Set();

    this.gameText = this.add.text(10, 10, "");

    this.initSubscenes();

    this.createButtons();

    this.resetScene();
  }

  /**
   * init subscenes to be made once and turned on/off.
   */
  private initSubscenes() {}

  /**
   * Move back the passengers and other metadata to before "simulate".
   */
  private resetScene() {
    this.deleteOldSprites();

    this.resetTimers();
    this.resetTweens();

    /**
     * reset, part 2
     */

    this.nodeMap = new Map();
    this.passengerMap = new Map();
    this.passengerOnMove = [];

    this.passengerToNodeMap = new Map();
    this.nodeToPassengerMap = new Map();
    this.passengerToSeatPath = new Map();

    this.enterNodesMap = new Map();

    this.passengerInPortQueue = [];

    this.simulateTimer.paused = true;
    this.isSimulationOn = false;

    //TODO: check input data is not goofy. dont go too nuts
    this.createPlaneNodes();

    this.createPassengers();
  }

  /**
   * When you reset the game, you'll have to delete the old sprites.
   * Only used by resetScene().
   */
  private deleteOldSprites() {
    if (!this.nodeMap && !this.passengerMap) return;

    //delete plane sprites

    for (let [_, planeNode] of this.nodeMap) {
      planeNode.sprite.destroy();
    }

    //delete passenger sprites
    for (let [_, passenger] of this.passengerMap) {
      passenger.sprites.destroy();
    }
  }

  /**
   * Reset all timers
   */
  private resetTimers() {
    for (let timer of this.timers) {
      timer.destroy();
    }

    this.timers.clear();

    this.simulateTimer = this.time.addEvent({
      delay: this.FPS,
      loop: true,
      paused: true,
      callback: this.simulateFrame,
      callbackScope: this,
    });

    this.timers.add(this.simulateTimer);
  }

  private resetTweens() {
    for (let activeTween of this.activeTweens) {
      activeTween.destroy();
    }

    this.activeTweens.clear();
  }

  private createPlaneNodes(): void {
    let planeXOffset = this.currentPlane.planeOffsetX ?? 0;
    let planeYOffset = this.currentPlane.planeOffSetY ?? 0;

    //make nodes
    //TODO: use interface to read json, verify, and spit out a class
    this.currentPlane.nodes.forEach((nodeJson: any) => {
      if (!this.nodeMap.has(nodeJson.id))
        this.nodeMap.set(nodeJson.id, new PlaneNode(nodeJson.id));

      let nodeData = this.nodeMap.get(nodeJson.id)!;

      //connect in/out nodes
      nodeJson.out.forEach((outNodeId: number) => {
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
      let imageName = "plane-floor"; //walking node
      if (nodeJson.seat) {
        let seat = nodeJson.seat;
        nodeData.seatInfo = new Seat(
          seat.class,
          seat.aisle,
          seat.number,
          toDirection(seat.direction)
        );

        imageName = "plane-seat-" + seat.class;
      }

      //add baggage compartments
      if ("compartments" in nodeJson) {
        const compartments = nodeJson["compartments"];

        for (const compartment of compartments) {
          const direction = toDirection(compartment.direction);
          nodeData.setBaggageComparment(direction, compartment.size);
        }
      }

      sprite = this.add
        .sprite(nodeJson.x + planeXOffset, nodeJson.y + planeYOffset, imageName)
        .setInteractive();

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

  /**
   * Creates and places passengers.
   */
  private createPassengers(): void {
    //make passengers
    //TODO: use interface that reads and validates json.
    this.currentPlane.passengers.forEach((passengerJson: any) => {
      let passenger = new Passenger(passengerJson.id);

      this.passengerMap.set(passenger.id, passenger);

      const ticketJson = passengerJson.ticket;
      if (!ticketJson) {
        throw Error("ticket required");
      }
      passenger.setTicket(
        new Ticket(ticketJson.class, ticketJson.aisle, ticketJson.number)
      );

      var passengerSpriteGroup = this.add.group();
      //build passenger sprite
      const shape = new Phaser.Geom.Rectangle(2, 10, 26, 12);

      let passengerSprite = passengerSpriteGroup
        .create(-100, -100, "passenger")
        .setInteractive(shape, Phaser.Geom.Rectangle.Contains);

      //  Input Event listeners
      passengerSprite.on("pointerover", () => {
        passengerSprite.setTint(0xbbbb00);
        this.setGameText(passenger.toString());
      });

      passengerSprite.on("pointerout", () => {
        this.setGameText("");
        passengerSprite.clearTint();
      });

      //build baggage
      //TODO: handle more than 1 baggage.
      if (passengerJson.baggage) {
        const baggage = new Baggage(
          passenger.id,
          passengerJson.baggage[0].size
        );
        passenger.addBaggage(baggage);

        const baggageShape = new Phaser.Geom.Rectangle(0, 0, 20, 6);

        const baggageSprite = passengerSpriteGroup
          .create(-100, -100, "baggage")
          .setInteractive(baggageShape, Phaser.Geom.Rectangle.Contains);

        //  Input Event listeners
        baggageSprite.on("pointerover", () => {
          baggageSprite.setTint(0xbbbb00);
          this.setGameText(baggage.toString());
        });

        baggageSprite.on("pointerout", () => {
          this.setGameText("");
          baggageSprite.clearTint();
        });
      }

      passenger.sprites = passengerSpriteGroup;

      //TODO: can remove this later and set
      //set direction if specified
      if ("direction" in passengerJson) {
        let directionStr: string = passengerJson["direction"] as string;
        passenger.direction = toDirection(directionStr);
        passengerSpriteGroup.angle(90 * toDirection(directionStr));
      } else {
        passenger.direction = Direction.NORTH;
        passengerSpriteGroup.angle(90 * Direction.NORTH);
      }

      //set on starting node in plane
      if ("node" in passengerJson) {
        let nodeId: number = passengerJson["node"] as number;
        this.putPassengerOnNode(passenger, nodeId);
        this.passengerOnMove.push(passenger.id);
      } else {
        this.passengerInPortQueue.push(passenger);
      }
    });
  }

  private putPassengerOnNode(passenger: Passenger, nodeId: number) {
    if (!this.nodeMap.has(nodeId)) {
      throw Error(`node id doesn't exist: ${nodeId}`);
    }

    let node = this.nodeMap.get(nodeId)!;

    this.passengerToNodeMap.set(passenger.id, nodeId);
    this.nodeToPassengerMap.set(nodeId, passenger.id);

    passenger.sprites!.setXY(node.sprite!.x, node.sprite!.y);
  }

  private createButtons(): void {
    let simulateSprite = this.add
      .sprite(300, 500, "btn-simulate")
      .setInteractive();

    let simulateClickFunc = () => {
      if (this.simulateTimer && !this.simulateTimer.paused) {
        this.setGameText("simulation already running");
        return;
      }

      this.isSimulationOn = true;
      this.simulateTimer.paused = false;
      this.setGameText("simulation started");
    };

    ButtonUtils.dressUpButton(simulateSprite, simulateClickFunc);

    let resetClickFunc = () => {
      this.resetScene();
    };

    let resetSprite = this.add.sprite(500, 500, "btn-reset").setInteractive();
    ButtonUtils.dressUpButton(resetSprite, resetClickFunc);

    // let completeResetSprite = this.add
    //   .sprite(740, 500, "btn-complete-reset")
    //   .setInteractive();
    // ButtonUtils.dressUpButton(completeResetSprite, this.restart.bind(this));
  }

  /**
   * restarts scene
   */
  restart() {
    this.scene.restart(); //doesnt destroy everything
    //TODO: could try another smaller scene that switches to this?
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
          passenger.getTicket(),
          passengerNodeId!
        );

        if (path == null) throw Error("all target seats should exist");

        this.passengerToSeatPath.set(passengerId, path);
      }

      let pathToSeat = this.passengerToSeatPath.get(passengerId)!;

      //do we store our baggage here?
      if (passenger.hasBaggage()) {
        let baggageSize: number = passenger.baggages[0].size; //TODO: multiple baggage support
        let targetBaggageNode = this.getClosestBaggageNodeToSeat(
          pathToSeat,
          baggageSize
        );

        //we are at the target storage node //TODO: make less crappy
        if (targetBaggageNode == null) {
          //TODO: assume this direction has space. fix later >:)
          //TODO: assume baggageNode != target seat

          const nextNodeId = pathToSeat[0];
          let nextNode = this.nodeMap.get(nextNodeId)!;

          this.setFacingDirection(passenger, startNode, nextNode);

          let newAngle = SpriteUtils.shortestAngle(
            passenger.getSpriteAngle(),
            90 * passenger.direction
          );

          //face toward your seat
          passenger.tween = this.tweens.add({
            targets: passenger.sprites.getChildren(),
            angle: newAngle, //TODO: hard code
            duration: 3000, //TODO: hard code
            ease: "Power2",
            onComplete: function () {
              //throw in baggage
              //TODO: better animation here
              //TODO: just throws the baggage where ever
              //TODO: better sprite group code
              const baggage = passenger.baggages.pop();
              startNode.addBaggage(Direction.NORTH, baggage);
              passenger.sprites.getChildren()[1].destroy(); //TODO: jank

              //keep on truckin'
              this.passengerOnMove.push(passengerId);
              this.activeTweens.delete(passenger.tween);
            },
            callbackScope: this,
          });
          this.activeTweens.add(passenger.tween);

          continue;
        }
      }

      //are we at our seat? sit down
      if (startNode.seatInfo?.isTicketSeat(passenger.getTicket())) {
        //TODO: set direction

        let newAngle = SpriteUtils.shortestAngle(
          passenger.getSpriteAngle(),
          90 * startNode.seatInfo.direction
        );

        //face the seat
        passenger.tween = this.tweens.add({
          targets: passenger.sprites.getChildren(),
          angle: newAngle,
          duration: 400, //TODO: hard code
          ease: "Power2",
          onComplete: function () {},
        });

        return; //TODO: do we need return/
      }

      if (pathToSeat.length == 0)
        throw Error(
          "shouldn't be 0. This passenger is sitting down yet still being calculated."
        );

      //else move to step closer (if we can)
      let nextNodeId = pathToSeat[0];

      //next space occupied
      if (this.nodeToPassengerMap.has(nextNodeId)) {
        //try moving there a bit later
        let timer = this.time.addEvent({
          delay: 150, //TODO: hard code
          loop: false,
          callback: () => {
            this.passengerOnMove.push(passengerId);
            timer.destroy();

            this.timers.delete(timer);
          },
          callbackScope: this,
        });

        this.timers.add(timer);
        return; //TODO: do we need return/
      }

      pathToSeat.shift();

      let nextNode = this.nodeMap.get(nextNodeId)!;

      this.nodeToPassengerMap.set(nextNode.id, passengerId); //occupy start and next node

      this.setFacingDirection(passenger, startNode, nextNode);

      let newAngle = SpriteUtils.shortestAngle(
        passenger.getSpriteAngle(),
        90 * passenger.direction
      );

      //TODO: set direction
      //move to next spot
      passenger.tween = this.tweens.add({
        targets: passenger.sprites.getChildren(),
        x: nextNode.sprite?.x,
        y: nextNode.sprite?.y,
        angle: newAngle, //TODO: hard code
        duration: 400, //TODO: hard code
        ease: "Power2",
        onComplete: function () {
          this.nodeToPassengerMap.delete(startNode.id);
          this.passengerToNodeMap.set(passengerId, nextNode.id);
          this.passengerOnMove.push(passengerId);

          this.activeTweens.delete(passenger.tween);
        },
        callbackScope: this,
      });

      this.activeTweens.add(passenger.tween);
    } //end simulate loop
  }

  /**
   * Finds the closest baggage node to the seat.
   * Throws an error if there is no baggage node at all.
   * @param pathToSeat a list of nodes to the target seat.
   * @param baggageSize the baggage you have.
   * @returns The closest plane node that can hold your baggage. If none available, return null;
   */
  private getClosestBaggageNodeToSeat(
    pathToSeat: number[],
    baggageSize: number
  ): PlaneNode {
    //TODO: think more on this
    for (let i = pathToSeat.length - 1; i >= 0; i--) {
      const nodeId = pathToSeat[i];
      const planeNode = this.nodeMap.get(nodeId);

      if (planeNode.hasOpenBaggageCompartments(baggageSize)) return planeNode;
    }

    return null;
  }

  //TODO: also set the sprite angle
  /**
   * Sets the facing direction of the passenger to where they are going.
   */
  private setFacingDirection(
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

    if (this.IS_DEBUG_MODE) this.colorOccupiedNodes();
  }

  /**
   * For debug use.
   * Color nodes which are occupied by passengers.
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
