import { describe, expect, test } from "@jest/globals";
import { PlaneNode } from "../data/PlaneNode";
import { Passenger } from "../data/Passenger";
import { PlaneSearch } from "../algo/PlaneSearch";
import { Seat } from "../data/Seat";
import { Direction } from "../data/Direction";
import { Ticket } from "../data/Ticket";

describe("PlaneSearch", () => {
  const nodeMap = new Map<number, PlaneNode>();
  const passengerToNodeMap = new Map<Passenger, PlaneNode>();
  const nodeToPassenger = new Map<PlaneNode, Passenger>();

  beforeAll(() => {
    //make nodes
    for (let i = 0; i <= 6; i++) {
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
     *         5 - 6
     */
    nodeMap.get(0).addNeighbor(nodeMap.get(1));
    nodeMap.get(1).addNeighbor(nodeMap.get(2));
    nodeMap.get(2).addNeighbor(nodeMap.get(3));
    nodeMap.get(2).addNeighbor(nodeMap.get(4));
    nodeMap.get(4).addNeighbor(nodeMap.get(5));
    nodeMap.get(5).addNeighbor(nodeMap.get(6));

    //make seats
    nodeMap.get(3).seatInfo = new Seat("coach", 1, "D", Direction.WEST);
    nodeMap.get(4).seatInfo = new Seat("coach", 1, "C", Direction.WEST);
    nodeMap.get(5).seatInfo = new Seat("coach", 1, "B", Direction.WEST);
    nodeMap.get(6).seatInfo = new Seat("coach", 1, "A", Direction.WEST);
  });

  beforeEach(() => {
    passengerToNodeMap.clear();
    nodeToPassenger.clear();

    //make baggage
    nodeMap.get(2).setBaggageCompartment(Direction.SOUTH, 10);
  });

  test("should set passenger ticket path", () => {
    //give ticket to passenger
    const ticket = new Ticket("coach", 1, "B");
    const passenger = new Passenger(0);
    passenger.setTicket(ticket);

    //put passenger on first node
    passengerToNodeMap.set(passenger, nodeMap.get(0));

    PlaneSearch.setPassengerToTicketPath(passenger, passengerToNodeMap);

    //assert
    const path = passenger.pathToTarget;
    expect(path[0]).toBe(nodeMap.get(1));
    expect(path[1]).toBe(nodeMap.get(2));
    expect(path[2]).toBe(nodeMap.get(4));
    expect(path[3]).toBe(nodeMap.get(5));
  });

  test("should set passenger ticket path", () => {
    //give ticket to passenger
    const ticket = new Ticket("coach", 1, "B");
    const passenger = new Passenger(0);
    passenger.setTicket(ticket);

    //put passenger on first node
    passengerToNodeMap.set(passenger, nodeMap.get(0));

    let path = PlaneSearch.calculateMinPassengerSeatPath(
      nodeMap.get(0),
      passenger.getTicket()
    );

    //assert
    expect(path[0]).toBe(nodeMap.get(1));
    expect(path[1]).toBe(nodeMap.get(2));
    expect(path[2]).toBe(nodeMap.get(4));
    expect(path[3]).toBe(nodeMap.get(5));
  });

  test("should get seat blockers", () => {
    //give ticket to passenger
    const ticket = new Ticket("coach", 1, "A");
    const passenger = new Passenger(0);
    passenger.setTicket(ticket);
    const passengerNode = nodeMap.get(2); //in front of target aisle

    const blocker1 = new Passenger(1);
    const blockerNode1 = nodeMap.get(4);
    const blocker2 = new Passenger(2);
    const blockerNode2 = nodeMap.get(5);

    //place passengers
    passengerToNodeMap.set(passenger, passengerNode);
    passengerToNodeMap.set(blocker1, blockerNode1);
    passengerToNodeMap.set(blocker2, blockerNode2);

    const nodeToPassenger = new Map<PlaneNode, Passenger>();
    nodeToPassenger.set(passengerNode, passenger);
    nodeToPassenger.set(blockerNode1, blocker1);
    nodeToPassenger.set(blockerNode2, blocker2);

    const startOfAisleNode = nodeMap.get(4);

    //act
    const blockers = PlaneSearch.getPassengersBlockingTicketSeat(
      passenger.getTicket(),
      startOfAisleNode,
      nodeMap,
      nodeToPassenger
    );

    //assert
    expect(blockers).toStrictEqual([blocker1, blocker2]);
  });

  test("should get free space for blockers", () => {
    //give ticket to passenger
    const ticket = new Ticket("coach", 1, "A");
    const passenger = new Passenger(0);
    passenger.setTicket(ticket);
    const passengerNode = nodeMap.get(2); //in front of target aisle

    const blocker1 = new Passenger(1);
    const blockerNode1 = nodeMap.get(4);
    const blocker2 = new Passenger(2);
    const blockerNode2 = nodeMap.get(5);

    //place passengers
    passengerToNodeMap.set(passenger, passengerNode);
    passengerToNodeMap.set(blocker1, blockerNode1);
    passengerToNodeMap.set(blocker2, blockerNode2);

    nodeToPassenger.set(passengerNode, passenger);
    nodeToPassenger.set(blockerNode1, blocker1);
    nodeToPassenger.set(blockerNode2, blocker2);

    PlaneSearch.setPassengerToTicketPath(passenger, passengerToNodeMap);

    //act
    const blockerSpaces = PlaneSearch.getFreeSpaceForBlockers(
      passenger.pathToTarget,
      passengerNode,
      2,
      nodeMap,
      nodeToPassenger
    );

    //assert
    expect(blockerSpaces.hasFreeSpaces).toBe(true);
    expect(blockerSpaces.blockerSpaces).toStrictEqual([
      nodeMap.get(1),
      nodeMap.get(0),
    ]);
    expect(blockerSpaces.tickerholderSpaces).toStrictEqual([nodeMap.get(3)]);
  });

  test("should get closest baggage node to ticket", () => {
    //give ticket to passenger
    const ticket = new Ticket("coach", 1, "A");
    const passenger = new Passenger(0);
    passenger.setTicket(ticket);
    const passengerNode = nodeMap.get(0); //in front of target aisle

    //place passengers
    passengerToNodeMap.set(passenger, passengerNode);

    PlaneSearch.setPassengerToTicketPath(passenger, passengerToNodeMap);

    //act
    const baggageNode = PlaneSearch.getClosestBaggageNodeToSeat(
      passenger.pathToTarget,
      1
    );

    //assert
    expect(baggageNode).toBe(nodeMap.get(2));
  });
});
