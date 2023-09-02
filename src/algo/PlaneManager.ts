import * as Phaser from "phaser";
import { Baggage } from "../data/Baggage";
import { Direction, toDirection } from "../data/Direction";
import { Passenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import { Ticket } from "../data/Ticket";
import GameScene from "../scenes/GameScene";
import { PassengerSemaphore } from "../util/PassengerSemaphore";
import { SpriteUtils } from "../util/SpriteUtils";
import PassengerSorts from "./PassengerSorts";
import PlaneSearch from "./PlaneSearch";

/**
 * Manages the spaces on the Plane and the Passengers in it
 */
export default class PlaneManager {
  private gameScene: GameScene;

  private nodeMap!: Map<number, PlaneNode>; //<node id, PlaneNode>
  private passengerMap!: Map<number, Passenger>;

  //passengers here will be simulated.
  //you can add on to this while simulating.
  //only the old passengers will be processed per frame.
  private passengerOnMove!: Array<Passenger>;

  //passengerId is not moving in nodeId. key is removed if passenger is moving.
  private passengerToNodeMap!: Map<Passenger, PlaneNode>;

  //used when passenger is entering and/or exiting.
  //when occupied, no one is allowed to enter except the passenger. used as a lock.
  //no node key means no passenger.
  private nodeToPassengerMap!: Map<PlaneNode, Passenger>; //<nodeId, passengerId in this nodeId>

  //<nodeId, passengersId>
  private nodeToMultiPassengerMap!: Map<PlaneNode, Set<Passenger>>; //same as above but with multiple passengers. used ONLY for seat shuffling
  private shufflersSet: Set<Passenger>; //people who are actively shuffling.

  //used by shufflers. events are fired when subsets of shufflers are done moving.
  private passengerSemaphore: PassengerSemaphore;

  private enterNodesMap!: Map<number, PlaneNode>; //<enterId, node>, plane entrance nodes

  //waiting to be placed on a PlaneNode
  public passengerInPortQueue!: Array<Passenger>;

  private currentPlane: any; //JSON TODO: json -> class converter thing

  private baggageLoadSpeed: number = 40;
  private passengerSpeed: number = 40; //400 is good

  constructor(gameScene: GameScene, planeJson: any) {
    this.gameScene = gameScene;
    this.currentPlane = planeJson;

    this.nodeMap = new Map();
    this.passengerMap = new Map();
    this.passengerOnMove = [];

    this.passengerToNodeMap = new Map();
    this.nodeToPassengerMap = new Map();
    this.nodeToMultiPassengerMap = new Map();
    this.passengerSemaphore = new PassengerSemaphore();
    this.shufflersSet = new Set();

    this.enterNodesMap = new Map();

    this.passengerInPortQueue = [];

    this.createPlaneNodes();

    this.createPassengers();

    //TODO: test sort passengers here. remove later
    //this.passengerInPortQueue.sort(PassengerSorts.frontToBack);
    //this.passengerInPortQueue.sort(PassengerSorts.backToFront);
    //this.passengerInPortQueue.sort(PassengerSorts.outToIn);
    //this.passengerInPortQueue.sort(PassengerSorts.steffanMethod);
    PassengerSorts.randomize(
      this.passengerInPortQueue,
      this.passengerInPortQueue.length * 100
    );

    //this.passengerInPortQueue.sort(PassengerSorts.slothSort);
  }

  private createPlaneNodes(): void {
    const planeXOffset = this.currentPlane.planeOffsetX ?? 0;
    const planeYOffset = this.currentPlane.planeOffSetY ?? 0;

    //make nodes
    //TODO: use interface to read json, verify, and spit out a class
    this.currentPlane.nodes.forEach((nodeJson: any) => {
      //TODO: rewire to default to multi-directional node.
      if (!this.nodeMap.has(nodeJson.id))
        this.nodeMap.set(nodeJson.id, new PlaneNode(nodeJson.id));

      const nodeData = this.nodeMap.get(nodeJson.id)!;

      //connect in/out nodes
      nodeJson.out.forEach((outNodeId: number) => {
        if (!this.nodeMap.has(outNodeId))
          this.nodeMap.set(outNodeId, new PlaneNode(outNodeId));

        nodeData.addOutNode(outNodeId);

        this.nodeMap.get(outNodeId)!.addInNode(nodeJson.id);
        this.nodeMap.get(outNodeId)!.addOutNode(nodeJson.id); //HACK:
      });

      let sprite: Phaser.GameObjects.Sprite;

      //start node
      if ("enter" in nodeJson) {
        const enterId: number = nodeJson["enter"] as number;
        this.enterNodesMap.set(enterId, nodeData);
        nodeData.isEnterNode = true;
      }

      //seat node
      let imageName = "plane-floor"; //walking node
      if (nodeJson.seat) {
        const seat = nodeJson.seat;
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

      sprite = this.gameScene.add
        .sprite(nodeJson.x + planeXOffset, nodeJson.y + planeYOffset, imageName)
        .setInteractive();

      //  Input Event listeners
      sprite.on("pointerover", () => {
        sprite.setTint(0x00bb00);
        const nodeOccupied = `; occupied by: ${this.nodeToPassengerMap.get(
          nodeData
        )};`;
        this.gameScene.setGameText(nodeData.toString() + nodeOccupied);
      });

      sprite.on("pointerout", () => {
        this.gameScene.setGameText("");
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
      const passenger = new Passenger(passengerJson.id);

      this.passengerMap.set(passenger.id, passenger);

      const ticketJson = passengerJson.ticket;
      if (!ticketJson) {
        throw Error("ticket required");
      }
      passenger.setTicket(
        new Ticket(ticketJson.class, ticketJson.aisle, ticketJson.number)
      );

      var passengerSpriteGroup = this.gameScene.add.group();
      //build passenger sprite
      const shape = new Phaser.Geom.Rectangle(2, 10, 26, 12);

      const passengerSprite = passengerSpriteGroup
        .create(-100, -100, "passenger")
        .setInteractive(shape, Phaser.Geom.Rectangle.Contains);

      //  Input Event listeners
      passengerSprite.on("pointerover", () => {
        passengerSprite.setTint(0xbbbb00);
        this.gameScene.setGameText(passenger.toString());
      });

      passengerSprite.on("pointerout", () => {
        this.gameScene.setGameText("");
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
          this.gameScene.setGameText(baggage.toString());
        });

        baggageSprite.on("pointerout", () => {
          this.gameScene.setGameText("");
          baggageSprite.clearTint();
        });
      }

      passenger.sprites = passengerSpriteGroup;

      //TODO: can remove this later and set
      //set direction if specified
      if ("direction" in passengerJson) {
        const directionStr: string = passengerJson["direction"] as string;
        passenger.direction = toDirection(directionStr);
        passengerSpriteGroup.angle(90 * toDirection(directionStr));
      } else {
        passenger.direction = Direction.NORTH;
        passengerSpriteGroup.angle(90 * Direction.NORTH);
      }

      //set on starting node in plane
      if ("node" in passengerJson) {
        const nodeId: number = passengerJson["node"] as number;
        this.putPassengerOnNode(passenger, this.nodeMap.get(nodeId));
        this.passengerOnMove.push(passenger);
      } else {
        this.passengerInPortQueue.push(passenger);
      }
    });
  }

  private putPassengerOnNode(passenger: Passenger, planeNode: PlaneNode) {
    this.passengerToNodeMap.set(passenger, planeNode);
    this.nodeToPassengerMap.set(planeNode, passenger);

    passenger.sprites!.setXY(planeNode.sprite!.x, planeNode.sprite!.y);
  }

  //TODO: refactor to submethods
  /**
   * This actually simulates passenger thinking and then orders them to move.
   * simulateTimer calls this every frame.
   */
  public simulateFrame(): void {
    //unqueue one passenger (if we can) onto a starting PlaneNode
    if (this.passengerInPortQueue.length > 0) {
      //for now, just get the first entrance
      const enterNode = this.enterNodesMap.get(0);

      if (!this.nodeToPassengerMap.has(enterNode)) {
        const passenger = this.passengerInPortQueue.shift()!;

        this.putPassengerOnNode(passenger, enterNode);
        this.passengerOnMove.push(passenger);
      }
    }

    //simulate passengers
    let processAmount = this.passengerOnMove.length;
    while (processAmount--) {
      const passenger = this.passengerOnMove.pop()!;
      const startNode = this.passengerToNodeMap.get(passenger);
      const passengerTicket = passenger.getTicket();

      //need to calc path
      if (
        !this.shufflersSet.has(passenger) &&
        passenger.pathToTarget.length == 0
      ) {
        PlaneSearch.setPassengerToTicketPath(
          passenger,
          this.nodeMap,
          this.passengerToNodeMap
        );
      }

      //do we store our baggage here?
      if (passenger.hasBaggage()) {
        const baggageSize: number = passenger.baggages[0].size; //TODO: multiple baggage support
        const targetBaggageNode = PlaneSearch.getClosestBaggageNodeToSeat(
          passenger.pathToTarget,
          baggageSize
        );

        //we are at the target storage node
        if (targetBaggageNode == null) {
          //TODO: assume this direction has space. fix later >:)
          //TODO: assume baggageNode != target seat

          const nextNode = passenger.pathToTarget[0];

          this.setFacingDirection(passenger, startNode, nextNode);

          const newAngle = SpriteUtils.shortestAngle(
            passenger.getSpriteAngle(),
            90 * passenger.direction
          );

          //face toward your seat
          passenger.tween = this.gameScene.tweens.add({
            targets: passenger.sprites.getChildren(),
            angle: newAngle,
            duration: this.baggageLoadSpeed,
            ease: "Power2",
            onComplete: () => {
              //throw in baggage
              //TODO: better animation here
              //TODO: just throws the baggage where ever
              //TODO: better sprite group code
              const baggage = passenger.baggages.pop();
              startNode.addBaggage(Direction.NORTH, baggage);
              passenger.sprites.getChildren()[1].destroy(); //TODO: jank

              //keep on truckin'
              this.passengerOnMove.push(passenger);
            },
            callbackScope: this,
          });

          continue;
        }
      }

      //no more walking
      if (passenger.pathToTarget.length == 0) {
        this.passengerSemaphore.release(passenger);

        //are we at our seat? sit down
        if (startNode.seatInfo?.isTicketSeat(passengerTicket)) {
          //TODO: set direction
          //TODO: sat down counter

          const newAngle = SpriteUtils.shortestAngle(
            passenger.getSpriteAngle(),
            90 * startNode.seatInfo.direction
          );

          //face the seat
          passenger.tween = this.gameScene.tweens.add({
            targets: passenger.sprites.getChildren(),
            angle: newAngle,
            duration: this.passengerSpeed,
            ease: "Power2",
            onComplete: function () {},
          });
        }

        continue;
      }

      //can we move one step closer?
      const nextNode = passenger.pathToTarget[0];

      //we are in front of our aisle (but not in)
      //are we blocked? shuffle everyone so you can get in.
      if (
        startNode.seatInfo?.aisle != passengerTicket.aisle &&
        nextNode.seatInfo?.aisle == passengerTicket.aisle &&
        !this.shufflersSet.has(passenger)
      ) {
        const blockers = PlaneSearch.getPassengersBlockingTicketSeat(
          passengerTicket,
          nextNode,
          this.nodeMap,
          this.nodeToPassengerMap
        );

        //TODO: helper method
        const blockersCsv = blockers.map((b) => b.id).join(",");
        console.log(`p ${passenger.id}, blockers: ${blockersCsv}`);

        //blockers present, do the shuffle
        if (blockers.length > 0) {
          const freeSpaces = PlaneSearch.getFreeSpaceForBlockers(
            passenger.pathToTarget,
            startNode,
            blockers.length,
            this.nodeMap,
            this.nodeToPassengerMap
          );

          if (!freeSpaces.hasFreeSpaces) {
            this.passengerOnMove.unshift(passenger);
            continue;
          }

          const shufflers = new Set([passenger, ...blockers]);

          //1) lock all needed nodes
          //1a) can we lock all needed nodes?
          //TODO: simplify all below.
          //note: i shouldn't need to nodeToPassengerMap check since freeSpaces should be free, yet...
          let cannotLock = false;
          if (this.nodeToMultiPassengerMap.has(startNode)) {
            cannotLock = true;
          }

          for (const node of freeSpaces.tickerholderSpaces) {
            if (this.nodeToMultiPassengerMap.has(node)) {
              cannotLock = true;
              break;
            }
          }

          for (const node of freeSpaces.blockerSpaces) {
            if (this.nodeToMultiPassengerMap.has(node)) {
              cannotLock = true;
              break;
            }
          }

          if (cannotLock) {
            this.passengerOnMove.unshift(passenger);
            continue;
          }

          //1b) actually lock
          this.nodeToMultiPassengerMap.set(startNode, shufflers);
          freeSpaces.tickerholderSpaces.forEach((node) =>
            this.nodeToMultiPassengerMap.set(node, shufflers)
          );

          freeSpaces.blockerSpaces.forEach((node) =>
            this.nodeToMultiPassengerMap.set(node, shufflers)
          );

          //2) shuffle passenger out and blockers out
          this.shufflersSet.add(passenger);
          blockers.forEach((blocker) => this.shufflersSet.add(blocker));

          //2a) shuffle passenger out
          passenger.pathToTarget = [...freeSpaces.tickerholderSpaces];

          //TODO: i should loop on "passengers that haven't sat". instead of
          //timers and passengerOnMove
          this.passengerOnMove.push(passenger);

          //2b) shuffle blockers out
          const blockerSpacesClone = [...freeSpaces.blockerSpaces];

          if (this.gameScene.IS_DEBUG_MODE) {
            const ticketholderSpacesStr = freeSpaces.tickerholderSpaces
              .map((b) => b.id)
              .join(",");
            const blockerSpacesStr = blockerSpacesClone
              .map((b) => b.id)
              .join(",");
            console.log(
              `passenger ${passenger.id}; ticketSpots: ${ticketholderSpacesStr};  blockerSpaces: ${blockerSpacesStr}`
            );
          }

          blockers.forEach((blocker) => {
            this.setPassengerToNodePathAndMove(
              blocker,
              blockerSpacesClone.pop()
            );
          });

          //3) after blockers are out...
          this.passengerSemaphore.addEvent(blockers, () => {
            //passenger goes to seat and stops
            PlaneSearch.setPassengerToTicketPath(
              passenger,
              this.nodeMap,
              this.passengerToNodeMap
            );
            this.passengerOnMove.push(passenger);

            //after passenger is in seat...
            this.passengerSemaphore.addEvent([passenger], () => {
              this.shufflersSet.delete(passenger);

              freeSpaces.tickerholderSpaces.forEach((node) =>
                this.nodeToMultiPassengerMap.delete(node)
              );

              //4) blockers go to their seat
              blockers.forEach((blocker) => {
                PlaneSearch.setPassengerToTicketPath(
                  blocker,
                  this.nodeMap,
                  this.passengerToNodeMap
                );
                this.passengerOnMove.push(blocker);
              });

              //5) blockers (and passenger is in the seat).
              this.passengerSemaphore.addEvent(blockers, () => {
                //unlock shuffle spaces
                blockers.forEach((blocker) => {
                  this.shufflersSet.delete(blocker);
                });

                freeSpaces.blockerSpaces.forEach((node) =>
                  this.nodeToMultiPassengerMap.delete(node)
                );

                this.nodeToMultiPassengerMap.delete(startNode);
              });
            });
          });

          continue;
        }
      } //end shuffle

      //next space occupied with person
      if (this.nodeToPassengerMap.has(nextNode)) {
        this.passengerOnMove.unshift(passenger);
        continue;
      }

      //next space occupied by seat shufflers
      if (this.nodeToMultiPassengerMap.has(nextNode)) {
        if (!this.nodeToMultiPassengerMap.get(nextNode).has(passenger)) {
          this.passengerOnMove.unshift(passenger);

          continue;
        }
      }

      //move one step closer
      passenger.pathToTarget.shift();
      this.nodeToPassengerMap.set(nextNode, passenger); //occupy start and next node
      this.setFacingDirection(passenger, startNode, nextNode);

      const newAngle = SpriteUtils.shortestAngle(
        passenger.getSpriteAngle(),
        90 * passenger.direction
      );

      //TODO: set direction
      //move to next spot
      passenger.tween = this.gameScene.tweens.add({
        targets: passenger.sprites.getChildren(),
        x: nextNode.sprite?.x,
        y: nextNode.sprite?.y,
        angle: newAngle, //TODO: hard code
        duration: this.passengerSpeed,
        ease: "Power2",
        onComplete: () => {
          this.nodeToPassengerMap.delete(startNode);
          this.passengerToNodeMap.set(passenger, nextNode);
          this.passengerOnMove.push(passenger);
        },
        callbackScope: this,
      });
    } //end simulate loop
  }

  private setPassengerToNodePathAndMove(
    passenger: Passenger,
    targetNode: PlaneNode
  ): void {
    const passengerNode = this.passengerToNodeMap.get(passenger);

    const path = PlaneSearch.calculateMinPassengerTargetPath(
      this.nodeMap,
      passengerNode,
      targetNode
    );

    if (path == null) throw Error("all target seats should exist");

    passenger.pathToTarget = path;
    this.passengerOnMove.push(passenger);
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
    const nextX = nextNode.sprite!.x - startNode.sprite!.x;
    const nextY = nextNode.sprite!.y - startNode.sprite!.y;

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

  isEveryoneSeated(): boolean {
    return false;
  }

  /**
   * Deletes old sprites
   */
  public destroy() {
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
   * For debug use.
   * Color nodes which are occupied by passengers.
   */
  colorOccupiedNodes() {
    for (let [_, node] of this.nodeMap) {
      node.sprite?.clearTint();
    }

    //color shuffling nodes
    for (let [node, _] of this.nodeToMultiPassengerMap) {
      node.sprite!.tint = 0xf0f000;
    }

    //color hard-occupied nodes
    for (let [node, _] of this.nodeToPassengerMap) {
      node.sprite!.tint = 0xf00000;
    }
  }
}
