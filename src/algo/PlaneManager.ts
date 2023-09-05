import * as Phaser from "phaser";
import { Baggage } from "../data/Baggage";
import { Direction, toDirection } from "../data/Direction";
import { Passenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import { Ticket } from "../data/Ticket";
import GameScene from "../scenes/GameScene";
import { PassengerSemaphore } from "../util/PassengerSemaphore";
import StringUtil from "../util/StringUtil";
import { BlockerSpaces, PlaneSearch } from "./PlaneSearch";
import { PassengerSorts, PassengerComparator } from "./PassengerSorts";

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
  //new passengers are pop()'d. Add to the end with unshift()
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
  //TODO: could class it
  private passengerStepEvent: Map<Passenger, Map<Number, Function>>; //call function on passenger's step count

  //used by shufflers. events are fired when subsets of shufflers are done moving.
  private passengerSemaphore: PassengerSemaphore;

  private enterNodesMap!: Map<number, PlaneNode>; //<enterId, node>, plane entrance nodes

  //waiting to be placed on a PlaneNode
  public passengerInPortQueue!: Array<Passenger>;

  private currentPlane: any;

  //in milliseconds
  private baggageLoadSpeed: number = 5000; //5000 is good
  private passengerSpeed: number = 400; //400 is good

  private numShuffles: number; //number of passenger shuffles completed.

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
    this.passengerStepEvent = new Map();

    this.enterNodesMap = new Map();

    this.passengerInPortQueue = [];

    this.numShuffles = 0;

    this.createPlaneNodes();

    this.createPassengers();

    PassengerSorts.randomize(
      this.passengerInPortQueue,
      this.passengerInPortQueue.length * 100
    );
  }

  /**
   * Sort passengers using the given passengerComparator.
   * @param passengerComparator -
   */
  public sortPassengers(passengerComparator: PassengerComparator): void {
    this.passengerInPortQueue.sort(passengerComparator);
  }

  private createPlaneNodes(): void {
    const planeXOffset = this.currentPlane.planeOffsetX ?? 0;
    const planeYOffset = this.currentPlane.planeOffsetY ?? 0;

    //make nodes
    this.currentPlane.nodes.forEach((nodeJson: any) => {
      if (!this.nodeMap.has(nodeJson.id))
        this.nodeMap.set(nodeJson.id, new PlaneNode(nodeJson.id));

      const planeNode = this.nodeMap.get(nodeJson.id)!;

      //connect in/out nodes
      nodeJson.out.forEach((outNodeId: number) => {
        if (!this.nodeMap.has(outNodeId))
          this.nodeMap.set(outNodeId, new PlaneNode(outNodeId));

        planeNode.addNeighbor(this.nodeMap.get(outNodeId));
      });

      let sprite: Phaser.GameObjects.Sprite;

      //start node
      if ("enter" in nodeJson) {
        const enterId: number = nodeJson["enter"] as number;
        this.enterNodesMap.set(enterId, planeNode);
        planeNode.isEnterNode = true;
      }

      //seat node
      let imageName = "plane-floor"; //walking node
      if (nodeJson.seat) {
        const seat = nodeJson.seat;
        planeNode.seatInfo = new Seat(
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
          planeNode.setBaggageCompartment(direction, compartment.size);
        }
      }

      sprite = this.gameScene.add
        .sprite(nodeJson.x + planeXOffset, nodeJson.y + planeYOffset, imageName)
        .setInteractive();

      //  Input Event listeners
      sprite.on("pointerover", () => {
        sprite.setTint(0x00bb00);
        const occupier = this.nodeToPassengerMap.get(planeNode);
        const nodeOccupied = `; occupied by: ${occupier};`;

        let debugStr = planeNode.toString();
        if (occupier) {
          debugStr += nodeOccupied;
        }

        this.gameScene.setGameText(debugStr);
      });

      sprite.on("pointerout", () => {
        this.gameScene.setGameText("");
        sprite.clearTint();
      });

      planeNode.sprite = sprite;
    });
  }

  /**
   * Creates and places passengers.
   */
  private createPassengers(): void {
    //make passengers
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

  /**
   * This actually simulates passenger thinking and then orders them to move.
   * simulateTimer calls this every frame.
   */
  public simulateFrame(): void {
    this.unqueuePortToPlane();

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

          const newDirection = Passenger.getFacingDirection(
            startNode,
            nextNode
          );

          //TODO: move to submethod
          //face toward your seat
          passenger.setDirectionAndMove(
            this.gameScene,
            this.passengerSpeed,
            newDirection,
            undefined,
            undefined,
            () => {
              //load the baggage slowly and face the seat
              //HACK: everywhere
              let baggageSprite =
                passenger.sprites.getChildren()[1] as Phaser.GameObjects.Sprite;

              //no support for west/east.
              let directionY =
                passenger.direction == Direction.NORTH ? -15 : 15;

              let newAngle = passenger.direction == Direction.NORTH ? 180 : 0;

              const tweenConfig = {
                targets: baggageSprite, //baggage
                angle: newAngle,
                duration: this.baggageLoadSpeed,
                ease: "Linear",
                y: baggageSprite.y + directionY,
                onComplete: () => {
                  //throw in baggage
                  const baggage = passenger.baggages.pop();
                  startNode.addBaggage(Direction.NORTH, baggage);
                  passenger.sprites.getChildren()[1].destroy(); //HACK:

                  //keep on truckin'
                  this.passengerOnMove.push(passenger);
                },
                callbackScope: this,
              };

              passenger.tween = this.gameScene.tweens.add(tweenConfig);
            }
          );

          continue;
        }
      }

      //no more walking
      if (passenger.pathToTarget.length == 0) {
        this.passengerSemaphore.release(passenger);

        //are we at our seat? sit down
        if (startNode.seatInfo?.isTicketSeat(passengerTicket)) {
          //face toward your seat
          passenger.setDirectionAndMove(
            this.gameScene,
            this.passengerSpeed,
            startNode.seatInfo.direction,
            undefined,
            undefined,
            () => {
              console.log(`p ${passenger.id} seated`);
            }
          );
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

        if (this.gameScene.IS_DEBUG_MODE) {
          const blockersCsv = StringUtil.listOfObjWithIdToCsv(blockers);
          console.log(`p ${passenger.id} blocked! blockers: ${blockersCsv}`);
        }

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
            this.passengerOnMove.unshift(passenger); //move to end of line
            continue;
          }

          const shufflers = new Set([passenger, ...blockers]);

          //1) lock all needed nodes (check first)
          let canLock = this.canLockForShufflers(startNode, freeSpaces);

          if (!canLock) {
            this.passengerOnMove.unshift(passenger);
            continue;
          }

          //1b) actually lock
          this.lockForShufflers(startNode, freeSpaces, shufflers);

          //2) shuffle passenger out and blockers out
          this.shufflersSet.add(passenger);
          blockers.forEach((blocker) => this.shufflersSet.add(blocker));

          //2a) shuffle passenger out
          passenger.pathToTarget = [...freeSpaces.tickerholderSpaces];

          this.passengerOnMove.push(passenger);

          //2b) shuffle blockers out
          const blockerSpacesClone = [...freeSpaces.blockerSpaces];

          if (this.gameScene.IS_DEBUG_MODE) {
            const ticketholderSpacesStr = StringUtil.listOfObjWithIdToCsv(
              freeSpaces.tickerholderSpaces
            );
            const blockerSpacesStr =
              StringUtil.listOfObjWithIdToCsv(blockerSpacesClone);
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
            const passengerShuffledOutStep = passenger.getNumSteps();

            //when passenger takes one step towards their seat...
            const eventMap = new Map();
            eventMap.set(passengerShuffledOutStep + 1, () => {
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
            this.passengerStepEvent.set(passenger, eventMap);

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

              this.numShuffles++;
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
      const newDirection = Passenger.getFacingDirection(startNode, nextNode);

      //move to next spot
      passenger.setDirectionAndMove(
        this.gameScene,
        this.passengerSpeed,
        newDirection,
        nextNode.sprite?.x,
        nextNode.sprite?.y,
        () => {
          this.nodeToPassengerMap.delete(startNode);
          this.passengerToNodeMap.set(passenger, nextNode);
          this.passengerOnMove.push(passenger);
          passenger.incrmentStep();

          //actions on specific steps
          if (this.passengerStepEvent.has(passenger)) {
            const stepEvents = this.passengerStepEvent.get(passenger);
            const passengerSteps = passenger.getNumSteps();
            if (stepEvents.has(passengerSteps)) {
              stepEvents.get(passengerSteps)();
              this.passengerStepEvent.delete(passenger);
            }
          }
        }
      );
    } //end simulate loop
  }

  /**
   * if there is space, unqueue one passenger from the port to the plane.
   */
  private unqueuePortToPlane(): void {
    if (this.passengerInPortQueue.length > 0) {
      //for now, just get the first entrance
      const enterNode = this.enterNodesMap.get(0);

      if (!this.nodeToPassengerMap.has(enterNode)) {
        const passenger = this.passengerInPortQueue.shift()!;

        this.putPassengerOnNode(passenger, enterNode);
        this.passengerOnMove.push(passenger);
      }
    }
  }

  private setPassengerToNodePathAndMove(
    passenger: Passenger,
    targetNode: PlaneNode
  ): void {
    const passengerNode = this.passengerToNodeMap.get(passenger);

    const path = PlaneSearch.calculateMinPassengerTargetPath(
      passengerNode,
      targetNode
    );

    if (path == null) throw Error("all target seats should exist");

    passenger.pathToTarget = path;
    this.passengerOnMove.push(passenger);
  }

  /**
   *
   * @returns number of passengers who have completed shuffling.
   */
  public getNumShuffles() {
    return this.numShuffles;
  }

  /**
   *
   * @returns true if everyone is seated. False, otherwise.
   */
  public isEveryoneSeated(): boolean {
    if (this.passengerOnMove.length > 0) return false;

    //are all passengers really seated?
    for (let [_, passenger] of this.passengerMap) {
      //passenger not on plane
      if (!this.passengerToNodeMap.has(passenger)) {
        return false;
      }

      //passenger not in seat
      const passengerNode = this.passengerToNodeMap.get(passenger);
      if (!passengerNode.seatInfo?.isTicketSeat(passenger.getTicket())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Can we lock the spaces needed for shuffling?
   * @param startNode the node where the tickerholder is standing. in front of aisle.
   * @param freeSpaces the node
   * @returns true if we can lock. Otherwise, false.
   */
  private canLockForShufflers(
    startNode: PlaneNode,
    freeSpaces: BlockerSpaces
  ): boolean {
    if (this.nodeToMultiPassengerMap.has(startNode)) {
      return false;
    }

    for (const node of freeSpaces.tickerholderSpaces) {
      if (this.nodeToMultiPassengerMap.has(node)) {
        return false;
      }
    }

    for (const node of freeSpaces.blockerSpaces) {
      if (this.nodeToMultiPassengerMap.has(node)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Lock all spaces needed for shuffling.
   * @param startNode the place where the tickerholder is standing. Front of aisle.
   * @param freeSpaces required shuffling spaces.
   * @param shufflers the people we are locking
   */
  private lockForShufflers(
    startNode: PlaneNode,
    freeSpaces: BlockerSpaces,
    shufflers: Set<Passenger>
  ): void {
    this.nodeToMultiPassengerMap.set(startNode, shufflers);
    freeSpaces.tickerholderSpaces.forEach((node) =>
      this.nodeToMultiPassengerMap.set(node, shufflers)
    );

    freeSpaces.blockerSpaces.forEach((node) =>
      this.nodeToMultiPassengerMap.set(node, shufflers)
    );
  }

  /**
   *
   * @returns the total number of steps for all passengers
   */
  public getTotalSteps(): number {
    let totalSteps = 0;

    this.passengerMap.forEach((p) => (totalSteps += p.getNumSteps()));

    return totalSteps;
  }

  /**
   * Deletes old sprites
   */
  public destroy() {
    if (!this.nodeMap && !this.passengerMap) return;

    //delete plane sprites
    for (let [_, planeNode] of this.nodeMap) {
      planeNode.destroy();
    }

    //delete passenger sprites
    for (let [_, passenger] of this.passengerMap) {
      passenger.destroy();
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
