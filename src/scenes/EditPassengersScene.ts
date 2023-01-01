import { Passenger } from "../data/Passenger";
import GameScene from "./Game";
import { GameSubScene } from "./GameSubscene";

/**
 * Ui that displays the entire passenger list.
 * Allows you to order and sort the passengers to be boarded.
 */
export default class EditPassengersScene extends Phaser.Scene {
  parentScene: GameScene;

  passengerUiItems: Map<number, PassengerItem>; //<idx, item>
  passengerIdxMap: Map<Passenger, number>; //<Passenger, order idx>

  /**
   *
   * @param parentScene should be the primary game scene
   */
  constructor(parentScene: GameScene) {
    super("EditPassengersScene");

    this.parentScene = parentScene;
    this.passengerUiItems = new Map();
    this.passengerIdxMap = new Map();
  }

  preload() {}

  create() {
    this.drawCloseBackground();

    this.drawBackground();
  }

  reset() {
    this.passengerUiItems = new Map();
    this.passengerIdxMap = new Map();
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

  private drawCloseBackground() {
    let { width: canvasWidth, height: canvasHeight } =
      this.parentScene.sys.game.canvas;

    let backgroundX = canvasWidth / 4;
    let backgroundY = canvasHeight / 2;

    let rect = this.add.rectangle(
      backgroundX,
      backgroundY,
      canvasWidth / 2,
      canvasHeight,
      0xeeeeee,
      0.5
    );
    rect.setStrokeStyle(1, 0);

    rect.setInteractive();

    let onClickFunc = () => {
      this.parentScene.scene.wake();
      this.scene.sleep();
    };

    rect.on("pointerup", function (pointer: Phaser.Input.Pointer) {
      onClickFunc();
    });
  }

  /**
   * redraw the passenger list.
   * Could use update() but you don't need to redraw constantly
   */
  public redrawPassengerList() {
    let passengerQueue = this.parentScene.passengerInPortQueue;
    let y = PassengerItem.height / 2;

    //need to create and draw ui
    if (this.passengerUiItems.size == 0) {
      let idx = 0;
      passengerQueue.forEach((passenger) => {
        let item = PassengerItem.createPassengerItem(this, y, passenger);
        this.passengerIdxMap.set(passenger, idx);
        this.passengerUiItems.set(idx, item);

        idx++;
        y += 50;
      });
    }
    //only redraw
    else {
      let newUiItemsMap: Map<number, PassengerItem> = new Map();
      let newIdxMap: Map<Passenger, number> = new Map();

      let idx = 0;

      passengerQueue.forEach((passenger) => {
        let passengerIdx = this.passengerIdxMap.get(passenger)!;
        let uiItem = this.passengerUiItems.get(passengerIdx)!;

        uiItem.setY(this.parentScene, y);

        newUiItemsMap.set(idx, uiItem);
        newIdxMap.set(passenger, idx);

        idx++;
        y += 50;
      });

      this.passengerUiItems = newUiItemsMap;
      this.passengerIdxMap = newIdxMap;
    }
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
    passenger: Passenger
  ) {
    let { width: canvasWidth } = parentScene.sys.game.canvas;
    let width = canvasWidth / 2 - 200;

    let background = parentScene.add.rectangle(
      0,
      0,
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

    let text = parentScene.add.text(0, 0, textStr);
    text.setDepth(2);
    text.setColor("black");
    text.setFontSize(16);

    let passengerItem = new PassengerItem(background, text);
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
