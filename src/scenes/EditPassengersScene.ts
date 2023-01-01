import { Passsenger } from "../data/Passenger";
import GameScene from "./Game";

/**
 * Ui that displays the passenger list.
 * Allows you to order and sort the passengers to be boarded.
 */
export default class EditPassengersScene extends Phaser.Scene {
  parentScene!: GameScene;

  passengerUiItems!: Array<PassengerItem>;

  /**
   *
   * @param parentScene should be the primary game scene
   */
  constructor(parentScene: GameScene) {
    super("EditPassengersScene");

    this.parentScene = parentScene;
    this.passengerUiItems = [];
  }

  preload() {}

  create() {
    this.drawBackground();
  }

  private drawBackground() {
    let { width: canvasWidth, height: canvasHeight } =
      this.parentScene.sys.game.canvas;

    let backgroundX = (canvasWidth / 4) * 3;
    let backgroundY = canvasHeight / 2;

    let background = this.add.rectangle(
      backgroundX,
      backgroundY,
      canvasWidth / 2,
      canvasHeight,
      0xbbbbbb
    );
    background.setStrokeStyle(1, 0);
  }

  /**
   * redraw the passenger list.
   * Could use update() but you don't need to redraw constantly
   */
  public redrawPassengerList() {
    let passengerQueue = this.parentScene.passengerInPortQueue;

    let y = PassengerItem.height / 2;
    passengerQueue.forEach((passenger) => {
      PassengerItem.createPassengerItem(this, y, passenger);

      y += 50;
    });
  }
}

/**
 * a Ui element for one passenger in the edit list.
 */
class PassengerItem {
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
    passenger: Passsenger
  ) {
    let { width: canvasWidth } = parentScene.sys.game.canvas;
    let x = (canvasWidth / 4) * 3 + 75;
    let width = canvasWidth / 2 - 200;

    let background = parentScene.add.rectangle(
      x,
      y,
      width,
      PassengerItem.height,
      PassengerItem.backgroundColor
    );

    background.setStrokeStyle(1, PassengerItem.borderColor);
    background.setDepth(1);

    let textStr =
      `id: ${passenger.id}\n` +
      `${passenger.getTicket().toConciseString()}\n` +
      `baggage size: ${passenger.getTotalBaggageSize()}`;

    let text = parentScene.add.text(x - 95, y - 22, textStr);
    text.setDepth(2);
    text.setColor("black");
    text.setFontSize(16);

    let passengerItem = new PassengerItem(background, text);

    return passengerItem;
  }
}
