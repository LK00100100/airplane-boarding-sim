import { Passenger } from "../data/Passenger";
import EditPassengersScene from "./EditPassengersScene";

/**
 * a Ui element for one passenger in the edit list.
 */
export class EditPassengerItem {
  private backgroundBox!: Phaser.GameObjects.Rectangle;
  private text!: Phaser.GameObjects.Text;

  /**
   * constants
   */
  static height = 50;
  static backgroundColor = 0xdddddd;
  static borderColor = 0xaaaaaa;
  static borderWidth = 1; //px
  static width = -1;
  static x = -1;

  private constructor(
    backgroundBox: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text
  ) {
    this.backgroundBox = backgroundBox;
    this.text = text;

    if (EditPassengerItem.width == -1) throw Error("width is not set");
    if (EditPassengerItem.x == -1) throw Error("x is not set");
  }

  public static setWidth(newWidth: number) {
    EditPassengerItem.width = newWidth;
  }

  public static setX(newX: number) {
    EditPassengerItem.x = newX;
  }
  /**
   * creates and draws a PassengerItem. To be used for a list.
   * @param parentScene container that holds the items
   * @param y where to draw (center of 'this')
   * @param passenger data
   * @returns PassengerItem
   */
  static createPassengerItem(
    parentScene: EditPassengersScene,
    y: number,
    passenger: Passenger
  ) {
    let rect = parentScene.add.rectangle(
      0,
      0,
      EditPassengerItem.width,
      EditPassengerItem.height,
      EditPassengerItem.backgroundColor
    );

    rect.setStrokeStyle(1, EditPassengerItem.borderColor);
    rect.setDepth(1);

    rect.setInteractive();

    let textStr =
      `id: ${passenger.id}\n` +
      `${passenger.getTicket().toConciseString()}\n` +
      `baggage size: ${passenger.getTotalBaggageSize()}`;

    let text = parentScene.add.text(0, 0, textStr);
    text.setDepth(2);
    text.setColor("black");
    text.setFontSize(16);

    rect.on("pointerover", function (pointer: Phaser.Input.Pointer) {
      //text.text = "aaaa";
    });

    parentScene.input.setDraggable(rect);

    let passengerItem = new EditPassengerItem(rect, text);
    passengerItem.setY(y);

    let currentIdx: number;
    let line: Phaser.GameObjects.Line;
    rect.on("dragstart", function (pointer: Phaser.Input.Pointer) {
      console.log("drag start");

      rect.setAlpha(0.5);

      let lineX = rect.x;
      let lineY = rect.y;

      line = parentScene.add.line(
        lineX,
        lineY,
        0,
        0,
        EditPassengerItem.width,
        0,
        0xff0000
      );

      line.setPosition(lineX, lineY);

      line.setDepth(10);
    });

    rect.on(
      "drag",
      (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
        passengerItem.setY(dragY);

        rect.setDepth(10);
        text.setDepth(10);
      }
    );

    rect.on("dragend", (pointer: Phaser.Input.Pointer) => {
      console.log("drag end");

      rect.setDepth(1);
      text.setDepth(1);

      line.destroy();

      parentScene.needsRedraw = true;
    });

    return passengerItem;
  }

  /**
   * x defaults passengeritem's default.
   * sets y of this item.
   * @param y the center y of backgroundBox
   */
  public setY(y: number) {
    this.backgroundBox.setPosition(EditPassengerItem.x, y);
    this.text.setPosition(EditPassengerItem.x - 95, y - 22);
  }
}
