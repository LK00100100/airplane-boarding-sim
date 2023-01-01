import { Passenger } from "../data/Passenger";

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

  private constructor(
    backgroundBox: Phaser.GameObjects.Rectangle,
    text: Phaser.GameObjects.Text
  ) {
    this.backgroundBox = backgroundBox;
    this.text = text;
  }

  /**
   * creates and draws a PassengerItem. To be used for a list.
   * @param parentScene Holds the items
   * @param y where to draw (center of 'this')
   * @param passenger data
   * @returns PassengerItem
   */
  static createPassengerItem(
    parentScene: Phaser.Scene,
    y: number,
    passenger: Passenger
  ) {
    let { width: canvasWidth } = parentScene.sys.game.canvas;
    let width = canvasWidth / 2 - 200;

    let rect = parentScene.add.rectangle(
      0,
      0,
      width,
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

    let passengerItem = new EditPassengerItem(rect, text);
    passengerItem.setY(parentScene, y);

    return passengerItem;
  }

  /**
   * sets y of this item.
   * @param y the center y of backgroundBox
   */
  public setY(parentScene: Phaser.Scene, y: number) {
    let { width: canvasWidth } = parentScene.sys.game.canvas;
    let x = (canvasWidth / 4) * 3 + 75;

    this.backgroundBox.setPosition(x, y);
    this.text.setPosition(x - 95, y - 22);
  }
}
