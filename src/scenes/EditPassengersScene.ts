import { Passenger } from "../data/Passenger";
import { EditPassengerItem } from "./EditPassengerItem";
import GameScene from "./Game";
import { SceneNames } from "./SceneNames";

/**
 * Ui that displays the entire passenger list.
 * Allows you to order and sort the passengers to be boarded.
 */
export default class EditPassengersScene extends Phaser.Scene {
  parentScene: GameScene;

  passengerUiItems: Map<number, EditPassengerItem>; //<idx, uiItem>
  passengerIdxMap: Map<Passenger, number>; //<Passenger, order idx>

  needsRedraw!: boolean; //some ui only needs to be drawn uncommonly.

  /**
   *
   * @param parentScene should be the primary game scene
   */
  constructor(parentScene: GameScene) {
    super(SceneNames.EDIT_PASSENGERS);

    this.parentScene = parentScene;
    this.passengerUiItems = new Map();
    this.passengerIdxMap = new Map();

    let { width: canvasWidth } = parentScene.sys.game.canvas;
    let width = canvasWidth / 2 - 200;
    let x = (canvasWidth / 4) * 3 + 75;

    EditPassengerItem.setWidth(width);
    EditPassengerItem.setX(x);

    this.needsRedraw = false;
  }

  preload() {}

  create() {
    this.drawCloseBackground();

    this.drawBackground();
  }

  update() {
    if (!this.needsRedraw) return;

    this.redrawPassengerList();

    this.needsRedraw = false;
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
    rect.setAlpha(0.4);
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
      for (let i = 0; i < this.passengerIdxMap.size; i++) {
        let uiItem = this.passengerUiItems.get(i)!;

        uiItem.setY(y);

        y += 50;
      }
    }
  }
}
