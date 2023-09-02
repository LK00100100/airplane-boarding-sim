import { describe, expect, test } from "@jest/globals";
import { PlaneNode } from "../data/PlaneNode";
import { Passenger } from "../data/Passenger";
import PlaneSearch from "../algo/PlaneSearch";
import { Seat } from "../data/Seat";
import { Direction } from "../data/Direction";
import { Ticket } from "../data/Ticket";

describe("PlaneSearch", () => {
  const nodeMap = new Map<number, PlaneNode>();
  const passengerToNodeMap = new Map<Passenger, PlaneNode>();

  beforeEach(() => {
    nodeMap.clear();
    passengerToNodeMap.clear();

    //make nodes
    for (let i = 0; i < 4; i++) {
      nodeMap.set(i, new PlaneNode(i));
    }

    /**
     * connect nodes
     *         3
     *         |
     * 0 - 1 - 2
     *         |
     *         4
     *         |
     *         5
     */
    nodeMap.get(0).addOutNode(1);
    nodeMap.get(1).addOutNode(0);
    nodeMap.get(1).addOutNode(2);
    nodeMap.get(2).addOutNode(1);
    nodeMap.get(2).addOutNode(3);
    nodeMap.get(2).addOutNode(4);
    nodeMap.get(3).addOutNode(2);
    nodeMap.get(4).addOutNode(2);
    nodeMap.get(4).addOutNode(5);
    nodeMap.get(5).addOutNode(4);

    nodeMap.get(3).seatInfo = new Seat("coach", 1, "C", Direction.WEST);
    nodeMap.get(4).seatInfo = new Seat("coach", 1, "B", Direction.WEST);
    nodeMap.get(5).seatInfo = new Seat("coach", 1, "A", Direction.WEST);
  });

  test("should add 2", () => {
    //give ticket to passenger
    const ticket = new Ticket("coach", 1, "A");
    const passenger = new Passenger(0);
    passenger.setTicket(ticket);

    //put passenger on first node
    passengerToNodeMap.set(passenger, nodeMap.get(0));

    PlaneSearch.setPassengerToTicketPath(
      passenger,
      nodeMap,
      passengerToNodeMap
    );

    //assert
    const path = passenger.pathToTarget;
    expect(path[0]).toBe(nodeMap.get(1));
  });
});
