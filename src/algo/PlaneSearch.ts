import { Passenger } from "../data/Passenger";
import { PlaneNode } from "../data/PlaneNode";
import { Ticket } from "../data/Ticket";

/**
 * Contains various methods for pathfinding or searching in a Plane.
 */
export default class PlaneSearch {
  /**
   * Set the passenger's movement path toward the Ticket.
   * @param passenger
   * @param nodeMap
   */
  public static setPassengerToTicketPath(
    passenger: Passenger,
    nodeMap: Map<number, PlaneNode>,
    passengerToNodeMap: Map<Passenger, PlaneNode>
  ): void {
    const currentNode: PlaneNode = passengerToNodeMap.get(passenger);

    let path = PlaneSearch.calculateMinPassengerSeatPath(
      nodeMap,
      currentNode,
      passenger.getTicket()
    );

    if (path == null) throw Error("all target seats should exist");

    passenger.pathToTarget = path;
  }

  /**
   * calculate the min path from startNodeId to passengerId's ticket.
   * @param startNodeId
   * @param ticket
   * @returns a list of node ids from you to the seat. Does not include the start node.
   * The first node is the next node.
   * An empty array means we're already there. Returns null if no path exists.
   */
  public static calculateMinPassengerSeatPath(
    nodeMap: Map<number, PlaneNode>,
    startNode: PlaneNode,
    ticket: Ticket
  ): Array<PlaneNode> | null {
    return PlaneSearch.calculateMinPassengerTargetPathHelper(
      startNode,
      null,
      ticket
    );
  }

  public static calculateMinPassengerTargetPath(
    startNode: PlaneNode,
    targetNode: PlaneNode
  ): Array<PlaneNode> | null {
    return PlaneSearch.calculateMinPassengerTargetPathHelper(
      startNode,
      targetNode,
      null
    );
  }

  /**
   *
   * @param startNode
   * @param targetNode trying to get to this node. supercedes ticket
   * @param ticket trying to get to this node. superceded by Node
   * @returns
   */
  private static calculateMinPassengerTargetPathHelper(
    startNode: PlaneNode,
    targetNode: PlaneNode | null,
    ticket: Ticket
  ): Array<PlaneNode> | null {
    let distMap: Map<PlaneNode, number> = new Map(); //nodeId, distance

    //we're at the ticket seat (ignored if targetNode exists)
    if (targetNode == null && startNode.seatInfo?.isTicketSeat(ticket)) {
      return [];
    }
    //we're at the targetNode
    else if (targetNode != null && startNode == targetNode) {
      return [];
    }

    //calc min distance to goal (BFS)
    let queue = Array.from(startNode.neighbors);
    let level = 1;
    let goalNode: PlaneNode = null;

    let visited: Set<PlaneNode> = new Set();

    while (queue.length > 0) {
      let levelSize = queue.length;

      for (let i = 0; i < levelSize; i++) {
        let currentNode = queue.shift()!;

        if (visited.has(currentNode)) continue;

        visited.add(currentNode);

        distMap.set(currentNode, level);

        //at ticket (ignored if targetNode exists)
        if (targetNode == null && currentNode.seatInfo?.isTicketSeat(ticket)) {
          goalNode = currentNode;
          break;
        }
        //at targetNode
        else if (targetNode != null && currentNode == targetNode) {
          goalNode = currentNode;
          break;
        }

        queue = queue.concat(Array.from(currentNode.neighbors));
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
    let path: Array<PlaneNode> = [goalNode];

    visited.clear();

    let currentNode = goalNode;
    while (level > 0) {
      currentNode.neighbors.forEach((prevNode) => {
        let prevDist = distMap.get(prevNode) ?? level;

        //go back a node
        if (prevDist == level - 1) {
          path.unshift(prevNode);
          currentNode = prevNode;
          return;
        }
      });

      level--;
    }

    return path;
  }

  /**
   * Gets everyone in the aisle blocking the ticket seat.
   * If people move slowly to their window seat, they may be caught by this method.
   * You may have to use this only on sitting people.
   * @param ticket passenger's ticket that they are trying to get to.
   * @param startNode start of the aisle
   * @param nodeMap map of nodes
   * @param nodeToPassengerMap node to passenger map
   * @returns an ordered list of passengers. First one is closest to the startNode.
   */
  public static getPassengersBlockingTicketSeat(
    ticket: Ticket,
    startNode: PlaneNode,
    nodeMap: Map<number, PlaneNode>,
    nodeToPassengerMap: Map<PlaneNode, Passenger>
  ): Array<Passenger> {
    return this.getPassengersBlockingTicketSeatHelper(
      ticket,
      startNode,
      new Set(),
      nodeMap,
      nodeToPassengerMap
    );
  }

  private static getPassengersBlockingTicketSeatHelper(
    ticket: Ticket,
    node: PlaneNode,
    visited: Set<PlaneNode>,
    nodeMap: Map<number, PlaneNode>,
    nodeToPassengerMap: Map<PlaneNode, Passenger>
  ): Array<Passenger> {
    let blockers: Array<Passenger> = [];

    if (visited.has(node)) return blockers;

    visited.add(node);

    //at ticket seat
    if (node.seatInfo?.isTicketSeat(ticket)) return blockers;

    //not at ticket aisle
    if (node.seatInfo?.aisle != ticket.aisle) return blockers;

    //blocker found
    if (nodeToPassengerMap.has(node)) {
      const passenger = nodeToPassengerMap.get(node);
      blockers.push(passenger);
    }

    for (const neighborNode of node.neighbors) {
      blockers = blockers.concat(
        this.getPassengersBlockingTicketSeatHelper(
          ticket,
          neighborNode,
          visited,
          nodeMap,
          nodeToPassengerMap
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
   * @param maxNeeded maximum number of spaces needed in one direction from startNode. Typically num blockers.
   * @param nodeMap -
   * @param nodeToPassengerMap -
   * @returns two lists of PlaneNode. The first list is for the ticket holder. The other list is for blockers.
   */
  public static getFreeSpaceForBlockers(
    pathToSeat: Array<PlaneNode>,
    startNode: PlaneNode,
    maxNeeded: number,
    nodeMap: Map<number, PlaneNode>,
    nodeToPassengerMap: Map<PlaneNode, Passenger>
  ): BlockerSpaces {
    return PlaneSearch.getFreeSpaceForBlockersHelper(
      pathToSeat,
      startNode,
      maxNeeded,
      new Set(),
      nodeMap,
      nodeToPassengerMap
    );
  }

  private static getFreeSpaceForBlockersHelper(
    pathToSeat: Array<PlaneNode>,
    currentNode: PlaneNode,
    maxNeeded: number,
    visited: Set<PlaneNode>,
    nodeMap: Map<number, PlaneNode>,
    nodeToPassengerMap: Map<PlaneNode, Passenger>
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

    for (let neighbor of currentNode.neighbors) {
      //we're done
      if (ticketholderPath != null && maxNeededPath != null) break;

      //assumed that the long-path doesn't eventually loop back into the blocking aisle
      if (neighbor == pathToSeat[0]) continue;

      const path = PlaneSearch.longestFreeMaxLengthPathHelper(
        neighbor,
        maxNeeded,
        visited,
        nodeMap,
        nodeToPassengerMap
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
      for (const nextNode of currentNode.neighbors) {
        //next is occupied
        if (nodeToPassengerMap.has(nextNode)) continue;

        const results = this.getFreeSpaceForBlockersHelper(
          pathToSeat,
          nextNode,
          maxNeeded,
          visited,
          nodeMap,
          nodeToPassengerMap
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

  private static longestFreeMaxLengthPathHelper(
    node: PlaneNode,
    maxLength: number,
    visited: Set<PlaneNode>,
    nodeMap: Map<number, PlaneNode>,
    nodeToPassengerMap: Map<PlaneNode, Passenger>
  ): Array<PlaneNode> {
    if (maxLength == 0 || visited.has(node)) return [];

    //occupied
    if (nodeToPassengerMap.has(node)) {
      return [];
    }

    visited.add(node);

    //try paths
    let maxSubpath = [];
    node.neighbors.forEach((neighbor) => {
      const subPath = this.longestFreeMaxLengthPathHelper(
        neighbor,
        maxLength - 1,
        visited,
        nodeMap,
        nodeToPassengerMap
      );

      if (subPath.length > maxSubpath.length) maxSubpath = subPath;
    });

    visited.delete(node);

    return [node, ...maxSubpath];
  }

  /**
   * Finds the closest baggage node to the seat.
   * Throws an error if there is no baggage node at all.
   * @param pathToSeat a list of nodes to the target seat.
   * @param baggageSize the baggage you have.
   * @returns The closest plane node that can hold your baggage. If none available, return null;
   */
  public static getClosestBaggageNodeToSeat(
    pathToSeat: PlaneNode[],
    baggageSize: number
  ): PlaneNode {
    for (let i = pathToSeat.length - 1; i >= 0; i--) {
      const planeNode = pathToSeat[i];

      if (planeNode.hasOpenBaggageCompartments(baggageSize)) return planeNode;
    }

    return null;
  }
}

/**
 * @param tickerholderSpaces a space for the person trying to get to their seat
 * @param blockerSpaces spaces for the blockers in the ticketholder's aisle. Does not need to be everyone in the aisle.
 * @param hasFreeSpaces
 */
type BlockerSpaces = {
  tickerholderSpaces: Array<PlaneNode>;
  blockerSpaces: Array<PlaneNode>;
  hasFreeSpaces: boolean;
};
