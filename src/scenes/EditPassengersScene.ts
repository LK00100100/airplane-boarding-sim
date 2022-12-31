import GameScene from "./Game";

/**
 * Ui that displays the passenger list.
 * Allows you to order and sort the passengers to be boarded.
 */
export default class EditPassengersScene extends Phaser.Scene {
  parentScene!: GameScene;

  /**
   *
   * @param parentScene should be the primary game scene
   */
  constructor(parentScene: GameScene) {
    super("EditPassengersScene");

    this.parentScene = parentScene;
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
}
