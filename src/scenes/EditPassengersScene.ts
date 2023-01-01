import { Passenger } from "../data/Passenger";
import { EditPassengerItem } from "./EditPassengerItem";
import GameScene from "./Game";

/**
 * Ui that displays the entire passenger list.
 * Allows you to order and sort the passengers to be boarded.
 */
export default class EditPassengersScene extends Phaser.Scene {
  parentScene: GameScene;

  passengerUiItems: Map<number, EditPassengerItem>; //<idx, item>
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

    console.log("draw close background...");
    let rect = this.add.rectangle(
      backgroundX,
      backgroundY,
      canvasWidth / 2,
      canvasHeight,
      0xeeeeee
    );
    rect.setAlpha(0.2);
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
    let y = EditPassengerItem.height / 2;

    //need to create and draw ui
    if (this.passengerUiItems.size == 0) {
      let idx = 0;
      passengerQueue.forEach((passenger) => {
        let item = EditPassengerItem.createPassengerItem(this, y, passenger);
        this.passengerIdxMap.set(passenger, idx);
        this.passengerUiItems.set(idx, item);

        idx++;
        y += 50;
      });
    }
    //only redraw
    else {
      let newUiItemsMap: Map<number, EditPassengerItem> = new Map();
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
