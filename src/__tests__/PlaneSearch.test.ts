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
    for (let i = 0; i < 6; i++) {
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
    nodeMap.get(0).addNeighbor(nodeMap.get(1));
    nodeMap.get(1).addNeighbor(nodeMap.get(2));
    nodeMap.get(2).addNeighbor(nodeMap.get(3));
    nodeMap.get(2).addNeighbor(nodeMap.get(4));
    nodeMap.get(4).addNeighbor(nodeMap.get(5));

    //make seats
    nodeMap.get(3).seatInfo = new Seat("coach", 1, "C", Direction.WEST);
    nodeMap.get(4).seatInfo = new Seat("coach", 1, "B", Direction.WEST);
    nodeMap.get(5).seatInfo = new Seat("coach", 1, "A", Direction.WEST);
  });

  test("should set passenger ticket path", () => {
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
    expect(path[1]).toBe(nodeMap.get(2));
    expect(path[2]).toBe(nodeMap.get(4));
    expect(path[3]).toBe(nodeMap.get(5));
  });

  test("should set passenger ticket path", () => {
    //give ticket to passenger
    const ticket = new Ticket("coach", 1, "A");
    const passenger = new Passenger(0);
    passenger.setTicket(ticket);

    //put passenger on first node
    passengerToNodeMap.set(passenger, nodeMap.get(0));

    let path = PlaneSearch.calculateMinPassengerSeatPath(
      nodeMap,
      nodeMap.get(0),
      passenger.getTicket()
    );

    //assert
    expect(path[0]).toBe(nodeMap.get(1));
    expect(path[1]).toBe(nodeMap.get(2));
    expect(path[2]).toBe(nodeMap.get(4));
    expect(path[3]).toBe(nodeMap.get(5));
  });
});
