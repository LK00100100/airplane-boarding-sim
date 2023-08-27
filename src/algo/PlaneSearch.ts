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
    startNode: PlaneNode,
    ticket: Ticket
  ): Array<PlaneNode> | null {
    return PlaneSearch.calculateMinPassengerTargetPathHelper(
      nodeMap,
      startNode,
      null,
      ticket
    );
  }

  public static calculateMinPassengerTargetPath(
    nodeMap: Map<number, PlaneNode>,
    startNode: PlaneNode,
    targetNode: PlaneNode
  ): Array<PlaneNode> | null {
    return PlaneSearch.calculateMinPassengerTargetPathHelper(
      nodeMap,
      startNode,
      targetNode,
      null
    );
  }

  /**
   *
   * @param nodeMap
   * @param startNode
   * @param targetNode trying to get to this node. supercedes ticket
   * @param ticket trying to get to this node. superceded by Node
   * @returns
   */
  private static calculateMinPassengerTargetPathHelper(
    nodeMap: Map<number, PlaneNode>,
    startNode: PlaneNode,
    targetNode: PlaneNode | null,
    ticket: Ticket
  ): Array<PlaneNode> | null {
    let distMap: Map<number, number> = new Map(); //nodeId, distance

    //we're at the ticket seat (ignored if targetNode exists)
    if (targetNode == null && startNode.seatInfo?.isTicketSeat(ticket)) {
      return [];
    }
    //we're at the targetNode
    else if (targetNode != null && startNode == targetNode) {
      return [];
    }

    //calc min distance to goal (BFS)
    let queue = Array.from(startNode.outNodes);
    let level = 1;
    let goalNode: PlaneNode = null;

    let visited: Set<number> = new Set();

    while (queue.length > 0) {
      let levelSize = queue.length;

      for (let i = 0; i < levelSize; i++) {
        let currentNodeId = queue.shift()!;

        if (visited.has(currentNodeId)) continue;

        visited.add(currentNodeId);

        distMap.set(currentNodeId, level);

        let currentNode = nodeMap.get(currentNodeId)!;

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
    let path: Array<PlaneNode> = [goalNode];

    visited.clear();

    let currentNode = goalNode;
    while (level > 0) {
      currentNode.outNodes.forEach((prevId) => {
        let prevDist = distMap.get(prevId) ?? level;

        //go back a node
        if (prevDist == level - 1) {
          currentNode = nodeMap.get(prevId)!;
          path.unshift(currentNode);
          return;
        }
      });

      level--;
    }

    return path;
  }
}
