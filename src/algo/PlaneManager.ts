import * as Phaser from "phaser";
import { Baggage } from "../data/Baggage";
import { Direction, toDirection } from "../data/Direction";
import { Passenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Seat } from "../data/Seat";
import { Ticket } from "../data/Ticket";
import { BlockerSpaces } from "../data/Types";
import GameScene from "../scenes/Game";
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
  private passengerOnMove!: Array<Passenger>; //<passenger ids>, a stack

  //passengerId is not moving in nodeId. key is removed if passenger is moving.
  private passengerToNodeMap!: Map<Passenger, PlaneNode>;

  //TODO: a big node manager class. and use node instead of id.

  //used when passenger is entering and/or exiting.
  //when occupied, no one is allowed to enter except the passenger. used as a lock.
  //no node key means no passenger.
  private nodeToPassengerMap!: Map<PlaneNode, Passenger>; //<nodeId, passengerId in this nodeId>

  //<nodeId, passengersId>
  private nodeToMultiPassengerMap!: Map<PlaneNode, Set<Passenger>>; //same as above but with multiple passengers. used ONLY for seat shuffling
  private shufflersSet: Set<Passenger>; //people who are actively shuffling.

  //TODO: move into Passenger classes
  //TODO: rename to passengerToPath
  //no passenger means no path. Need to calculate.
  //an empty array means we have arrived. the first node is the next step to take.
  private passengerToSeatPath!: Map<Passenger, Array<PlaneNode>>; //<passengerId, list of nodeIds to our seat

  //used by shufflers. events are fired when subsets of shufflers are done moving.
  private passengerSemaphore: PassengerSemaphore;

  //TODO: move to some plane manager.
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
    this.passengerToSeatPath = new Map();
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
    //this.passengerInPortQueue.sort(PassengerSorts.slothSort);
    PassengerSorts.randomize(
      this.passengerInPortQueue,
      this.passengerInPortQueue.length * 100
    );
  }

  private createPlaneNodes(): void {
    let planeXOffset = this.currentPlane.planeOffsetX ?? 0;
    let planeYOffset = this.currentPlane.planeOffSetY ?? 0;

    //make nodes
    //TODO: use interface to read json, verify, and spit out a class
    this.currentPlane.nodes.forEach((nodeJson: any) => {
      //TODO: rewire to default to multi-directional node.
      if (!this.nodeMap.has(nodeJson.id))
        this.nodeMap.set(nodeJson.id, new PlaneNode(nodeJson.id));

      let nodeData = this.nodeMap.get(nodeJson.id)!;

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
      let passenger = new Passenger(passengerJson.id);

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

      let passengerSprite = passengerSpriteGroup
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
  //TODO: just move to update, no simulate timer
  /**
   * This actually simulates passenger thinking and then orders them to move.
   * simulateTimer calls this every frame.
   */
  public simulateFrame(): void {
    //unqueue one passenger (if we can) onto a starting PlaneNode
    if (this.passengerInPortQueue.length > 0) {
      //TODO: fix if multiple entrances
      let enterNode = this.enterNodesMap.get(0)!;

      if (!this.nodeToPassengerMap.has(enterNode)) {
        let passenger = this.passengerInPortQueue.shift()!;

        this.putPassengerOnNode(passenger, enterNode);
        this.passengerOnMove.push(passenger);
      }
    }

    //TODO: no timers. just for-loop, reuse this
    //simulate passengers
    while (this.passengerOnMove.length > 0) {
      const passenger = this.passengerOnMove.pop()!;
      const startNode = this.passengerToNodeMap.get(passenger);
      const passengerTicket = passenger.getTicket();

      //need to calc path
      //TODO: refactor to put it in the passenger.
      if (!this.passengerToSeatPath.has(passenger)) {
        this.setPassengerToTicketPath(passenger, startNode);
      }

      //TODO: rename pathToTarget
      const pathToSeat = this.passengerToSeatPath.get(passenger)!;

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

          const nextNode = pathToSeat[0];

          this.setFacingDirection(passenger, startNode, nextNode);

          let newAngle = SpriteUtils.shortestAngle(
            passenger.getSpriteAngle(),
            90 * passenger.direction
          );

          //face toward your seat
          passenger.tween = this.gameScene.tweens.add({
            targets: passenger.sprites.getChildren(),
            angle: newAngle, //TODO: hard code
            duration: this.baggageLoadSpeed,
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
              this.passengerOnMove.push(passenger);
              this.gameScene.activeTweens.delete(passenger.tween);
            },
            callbackScope: this,
          });
          this.gameScene.activeTweens.add(passenger.tween);

          continue;
        }
      }

      //no more walking
      if (pathToSeat.length == 0) {
        this.passengerSemaphore.release(passenger);

        //are we at our seat? sit down
        if (startNode.seatInfo?.isTicketSeat(passengerTicket)) {
          //TODO: set direction
          //TODO: sat down counter

          let newAngle = SpriteUtils.shortestAngle(
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
      let nextNode = pathToSeat[0];

      //we are in front of our aisle (but not in)
      //are we blocked? shuffle everyone so you can get in.
      if (
        startNode.seatInfo?.aisle != passengerTicket.aisle &&
        nextNode.seatInfo?.aisle == passengerTicket.aisle &&
        !this.shufflersSet.has(passenger)
      ) {
        const blockers = this.getPassengersBlockingTicketSeat(
          passengerTicket,
          nextNode
        );

        //TODO: helper method
        const blockersCsv = blockers.map((b) => b.id).join(",");
        console.log(`p ${passenger.id}, blockers: ${blockersCsv}`);

        //blockers present, do the shuffle
        if (blockers.length > 0) {
          const freeSpaces = this.getFreeSpaceForBlockers(
            pathToSeat,
            startNode,
            blockers.length
          );

          if (!freeSpaces.hasFreeSpaces) {
            this.addToPassengersToMoveQueueLater(passenger);
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
            this.addToPassengersToMoveQueueLater(passenger);
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

          this.passengerToSeatPath.delete(passenger);

          //2a) shuffle passenger out
          this.passengerToSeatPath.set(passenger, [
            ...freeSpaces.tickerholderSpaces,
          ]);

          //TODO: i should loop on "passengers that haven't sat". instead of
          //timers and passengerOnMove
          this.passengerOnMove.push(passenger);

          //2b) shuffle blockers out
          const blockerSpacesClone = [...freeSpaces.blockerSpaces];

          //TODO: remove debug
          const ticketholderSpacesStr = freeSpaces.tickerholderSpaces
            .map((b) => b.id)
            .join(",");
          const blockerSpacesStr = blockerSpacesClone
            .map((b) => b.id)
            .join(",");
          console.log(
            `passenger ${passenger.id}; ticketSpots: ${ticketholderSpacesStr};  blockerSpaces: ${blockerSpacesStr}`
          );

          blockers.forEach((blocker) => {
            this.setPassengerToNodePathAndMove(
              blocker,
              blockerSpacesClone.pop()
            );
          });

          //3) after blockers are out...
          this.passengerSemaphore.addEvent(blockers, () => {
            //TODO: ugh, should have to just have one thing to get people moving
            //passenger goes to seat and stops

            //TODO: refactor to just use node
            const passengerNode = this.passengerToNodeMap.get(passenger);
            this.setPassengerToTicketPath(passenger, passengerNode);
            this.passengerOnMove.push(passenger);

            //after passenger is in seat...
            this.passengerSemaphore.addEvent([passenger], () => {
              this.shufflersSet.delete(passenger);

              freeSpaces.tickerholderSpaces.forEach((node) =>
                this.nodeToMultiPassengerMap.delete(node)
              );

              //4) blockers go to their seat
              blockers.forEach((blocker) => {
                const blockerNode = this.passengerToNodeMap.get(blocker);
                this.setPassengerToTicketPath(blocker, blockerNode);
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
        this.addToPassengersToMoveQueueLater(passenger);
        continue;
      }

      //next space occupied by seat shufflers
      if (this.nodeToMultiPassengerMap.has(nextNode)) {
        if (!this.nodeToMultiPassengerMap.get(nextNode).has(passenger)) {
          this.addToPassengersToMoveQueueLater(passenger);

          continue;
        }
      }

      //move one step closer
      pathToSeat.shift();
      this.nodeToPassengerMap.set(nextNode, passenger); //occupy start and next node
      this.setFacingDirection(passenger, startNode, nextNode);

      let newAngle = SpriteUtils.shortestAngle(
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
        onComplete: function () {
          this.nodeToPassengerMap.delete(startNode);
          this.passengerToNodeMap.set(passenger, nextNode);
          this.passengerOnMove.push(passenger);

          this.gameScene.activeTweens.delete(passenger.tween);
        },
        callbackScope: this,
      });

      this.gameScene.activeTweens.add(passenger.tween);
    } //end simulate loop
  }

  private addToPassengersToMoveQueueLater(passenger: Passenger) {
    let timer = this.gameScene.time.addEvent({
      delay: 150, //TODO: hard code
      loop: false,
      callback: () => {
        this.passengerOnMove.push(passenger);
        timer.destroy();

        //TODO: use one timer for a bundle of passengers...
        this.gameScene.timers.delete(timer);
      },
      callbackScope: this,
    });
    this.gameScene.timers.add(timer);
  }

  //TODO: simplify
  private setPassengerToTicketPath(
    passenger: Passenger,
    currentNode: PlaneNode
  ): void {
    let path = PlaneSearch.calculateMinPassengerSeatPath(
      this.nodeMap,
      currentNode,
      passenger.getTicket()
    );

    if (path == null) throw Error("all target seats should exist");

    this.passengerToSeatPath.set(passenger, path);
  }

  private setPassengerToNodePathAndMove(
    passenger: Passenger,
    targetNode: PlaneNode
  ): void {
    const passengerNode = this.passengerToNodeMap.get(passenger);

    let path = PlaneSearch.calculateMinPassengerTargetPath(
      this.nodeMap,
      passengerNode,
      targetNode
    );

    if (path == null) throw Error("all target seats should exist");

    this.passengerToSeatPath.set(passenger, path);
    this.passengerOnMove.push(passenger);
  }

  /**
   * Finds the closest baggage node to the seat.
   * Throws an error if there is no baggage node at all.
   * @param pathToSeat a list of nodes to the target seat.
   * @param baggageSize the baggage you have.
   * @returns The closest plane node that can hold your baggage. If none available, return null;
   */
  private getClosestBaggageNodeToSeat(
    pathToSeat: PlaneNode[],
    baggageSize: number
  ): PlaneNode {
    //TODO: think more on this
    for (let i = pathToSeat.length - 1; i >= 0; i--) {
      const planeNode = pathToSeat[i];

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
   * Gets everyone in the aisle blocking the ticket seat.
   * If people move slowly to their window seat, they may be caught by this method.
   * You may have to use this only on sitting people.
   * @param ticket passenger's ticket that they are trying to get to.
   * @param startNode start of the aisle
   * @returns an ordered list of passengers. First one is closest to the startNode.
   */
  private getPassengersBlockingTicketSeat(
    ticket: Ticket,
    startNode: PlaneNode
  ): Array<Passenger> {
    return this.getPassengersBlockingTicketSeatHelper(
      ticket,
      startNode,
      new Set()
    );
  }

  private getPassengersBlockingTicketSeatHelper(
    ticket: Ticket,
    node: PlaneNode,
    visited: Set<PlaneNode>
  ): Array<Passenger> {
    let blockers: Array<Passenger> = [];

    if (visited.has(node)) return blockers;

    visited.add(node);

    //at ticket seat
    if (node.seatInfo?.isTicketSeat(ticket)) return blockers;

    //not at ticket aisle
    if (node.seatInfo?.aisle != ticket.aisle) return blockers;

    //blocker found
    if (this.nodeToPassengerMap.has(node)) {
      const passenger = this.nodeToPassengerMap.get(node);
      blockers.push(passenger);
    }

    for (const nodeId of node.outNodes) {
      const neighborNode = this.nodeMap.get(nodeId);
      blockers = blockers.concat(
        this.getPassengersBlockingTicketSeatHelper(
          ticket,
          neighborNode,
          visited
        )
      );
    }

    return blockers;
  }

  /**
   * Gets spaces next to the startNode.
   * Assumes the ticket holder is standing in startNode.
   * Returns two lists of spaces: one for the blocker, the other for the tickerholder. For shuffling.
   * These two paths may have some intersection. These lists start from startNode and extend
   * away from the aisle.
   * @param pathToSeat we have to see what the tickerholder's path is
   * @param startNode where the tickerholder is standing. next to the seat's aisle.
   * @param maxNeeded maximum number of spaces needed in one direction from startNode/
   * @returns two lists of PlaneNode. The first list is for the ticket holder. The other list is for blockers.
   */
  private getFreeSpaceForBlockers(
    pathToSeat: Array<PlaneNode>,
    startNode: PlaneNode,
    maxNeeded: number
  ): BlockerSpaces {
    return this.getFreeSpaceForBlockersHelper(
      pathToSeat,
      startNode,
      maxNeeded,
      new Set()
    );
  }

  private getFreeSpaceForBlockersHelper(
    pathToSeat: Array<PlaneNode>,
    currentNode: PlaneNode,
    maxNeeded: number,
    visited: Set<PlaneNode>
  ): BlockerSpaces {
    if (visited.has(currentNode)) {
      return {
        tickerholderSpaces: null,
        blockerSpaces: null,
        hasFreeSpaces: false,
      };
    }

    visited.add(currentNode);

    //get free paths
    let ticketholderPath: Array<PlaneNode> = null; //only need one node
    let maxNeededPath: Array<PlaneNode> = null;

    for (let outNodeId of currentNode.outNodes) {
      //we're done
      if (ticketholderPath != null && maxNeededPath != null) break;

      const outNode = this.nodeMap.get(outNodeId);

      //assumed that the long-path doesn't eventually loop back into the blocking aisle
      if (outNode == pathToSeat[0]) continue;

      const path = this.longestFreeMaxLengthPathHelper(
        outNode,
        maxNeeded,
        visited
      );

      if (maxNeededPath == null && path.length >= maxNeeded) {
        maxNeededPath = path;
        continue;
      }

      if (ticketholderPath == null && path.length >= 1) {
        ticketholderPath = [path[0]];
        continue;
      }
    }

    //not enough free space at all.
    if (ticketholderPath == null || maxNeededPath == null) {
      //go deeper and see if there's space
      for (let nodeId of currentNode.outNodes) {
        const nextNode = this.nodeMap.get(nodeId);

        //next is occupied
        if (this.nodeToPassengerMap.has(nextNode)) continue;

        const results = this.getFreeSpaceForBlockersHelper(
          pathToSeat,
          nextNode,
          maxNeeded,
          visited
        );

        if (results.hasFreeSpaces) {
          return {
            tickerholderSpaces: [nextNode, ...results.tickerholderSpaces],
            blockerSpaces: [nextNode, ...results.blockerSpaces],
            hasFreeSpaces: true,
          };
        }
      }

      return {
        tickerholderSpaces: null,
        blockerSpaces: null,
        hasFreeSpaces: false,
      };
    }

    return {
      tickerholderSpaces: ticketholderPath,
      blockerSpaces: maxNeededPath,
      hasFreeSpaces: true,
    };
  }

  /**
   * Finds a new startNode which will allow for the tickerholder and the blocker
   * to shuffle around each other.
   * @param startNode
   * @returns the new startNode that allows for room for swapping groups.
   */
  private getFreeSpaceForBlockersNewStartNode(startNode: PlaneNode): PlaneNode {
    return null; //TODO:
  }

  /**
   * Will return a path of empty nodes of maxLength starting at startNode.
   * @param startNode the first node in the path.
   * @param maxLength
   * @returns An array of in-order free nodes. Otherwise, empty array.
   */
  private longestFreeMaxLengthPath(
    startNode: PlaneNode,
    maxLength: number
  ): Array<PlaneNode> {
    if (maxLength <= 0) return [];

    return this.longestFreeMaxLengthPathHelper(startNode, maxLength, new Set());
  }

  private longestFreeMaxLengthPathHelper(
    node: PlaneNode,
    maxLength: number,
    visited: Set<PlaneNode>
  ): Array<PlaneNode> {
    if (maxLength == 0 || visited.has(node)) return [];

    //occupied
    if (this.nodeToPassengerMap.has(node)) {
      return [];
    }

    visited.add(node);

    //try paths
    let maxSubpath = [];
    node.outNodes.forEach((outnodeId) => {
      const outNode = this.nodeMap.get(outnodeId);

      const subPath = this.longestFreeMaxLengthPathHelper(
        outNode,
        maxLength - 1,
        visited
      );

      if (subPath.length > maxSubpath.length) maxSubpath = subPath;
    });

    visited.delete(node);

    return [node, ...maxSubpath];
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
