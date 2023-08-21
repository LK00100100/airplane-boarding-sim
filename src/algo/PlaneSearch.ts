import { PlaneNode } from "../data/PlaneNode";
import { Ticket } from "../data/Ticket";

export default class PlaneSearch {
  public static calculateMinPath(
    nodeMap: Map<number, PlaneNode>,
    startNodeId: number,
    targetNodeId
  ): Array<number> | null {
    return null;
  }

  public static getAisleInfo() {}

  /**
   * calculate the min path from startNodeId to passengerId's ticket.
   * @param nodeMap
   * @param startNodeId
   * @param ticket
   * @returns a list of node ids from you to the seat. Does not include the start node.
   * The first node is the next node.
   * An empty array means we're already there. Returns null if no path exists.
   */
  public static calculateMinPassengerSeatPath(
    nodeMap: Map<number, PlaneNode>,
    startNodeId: number,
    ticket: Ticket
  ): Array<number> | null {
    let distMap: Map<number, number> = new Map(); //nodeId, distance
    let startNode = nodeMap.get(startNodeId)!;

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

        let currentNode = nodeMap.get(currentNodeId)!;

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
          currentNode = nodeMap.get(prevId)!;
          path.unshift(prevId);
          return;
        }
      });

      level--;
    }

    return path;
  }
}
