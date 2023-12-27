import * as Phaser from "phaser";
import { ButtonUtil } from "../../util/ButtonUtil";
import PlaneManager from "../../algo/PlaneManager";
import GameScene from "../GameScene";
import { PassengerSorts } from "../../algo/PassengerSorts";

/**
 * Used only by GameScene.ts.
 * Ui that displays, buttons, information and debug text.
 * Doesn't do any heavy calculations.
 */
export default class InfoScene extends Phaser.Scene {
  static readonly HANDLE = "InfoScene"; //has to be same as above

  private gameText!: Phaser.GameObjects.Text; //any messages for the player to read.
  private statsText!: Phaser.GameObjects.Text; //stats messages

  private cam: Phaser.Cameras.Scene2D.Camera;
  private planeManager: PlaneManager;
  private gameScene: GameScene;

  private simulateSprite: Phaser.GameObjects.Sprite;

  private algoButtons: Array<Phaser.GameObjects.Sprite>;

  /**
   *
   * @param {GameScene} gameScene
   */
  constructor(gameScene) {
    super(InfoScene.HANDLE); //has to be same as below

    this.gameScene = gameScene;
  }

  preload() {
    this.load.image("btn-simulate", "assets/btn-simulate.png");
    this.load.image("btn-pause", "assets/btn-pause.png");
    this.load.image("btn-reset", "assets/btn-reset.png");

    //algo buttons
    this.load.image(
      "btn-algo-back-to-front",
      "assets/btn-algo-back-to-front.png"
    );
    this.load.image(
      "btn-algo-front-to-back",
      "assets/btn-algo-front-to-back.png"
    );
    this.load.image("btn-algo-out-to-in", "assets/btn-algo-out-to-in.png");
    this.load.image("btn-algo-sloth", "assets/btn-algo-sloth.png");
    this.load.image("btn-algo-steffan", "assets/btn-algo-steffan.png");
  }

  create() {
    console.log("woo hoo");
    this.gameText = this.add.text(10, 10, "").setDepth(1000).setScrollFactor(0); //don't move UI

    this.statsText = this.add
      .text(10, 400, "")
      .setDepth(1000)
      .setScrollFactor(0); //don't move UI

    //set cam
    this.cam = this.cameras.main;

    this.createButtons();
  }

  private createButtons(): void {
    this.simulateSprite = this.add
      .sprite(100, 510, "btn-simulate")
      .setScrollFactor(0) //don't move UI
      .setInteractive();

    const simulateClickFunc = () => {
      if (this.planeManager.isEveryoneSeated()) {
        this.setGameText("simulation is complete...");
        return;
      }

      //pause the active simulate
      if (this.gameScene.isSimulationOn) {
        this.setGameText("pausing...");

        this.gameScene.isSimulationOn = false;
        this.gameScene.simulateTimer.paused = true;
        this.planeManager.pauseTimers();
        return;
      }

      if (!this.gameScene.simulationStarted) {
        this.setGameText("simulation started");
      } else {
        this.setGameText("simulation unpaused");
      }

      //start simulation
      this.gameScene.simulationStarted = true;
      this.gameScene.isSimulationOn = true;
      this.gameScene.simulateTimer.paused = false;
      this.planeManager.unpauseTimers();

      this.simulateSprite.setTexture("btn-pause");

      //grey out buttons
      this.algoButtons.forEach((btn) => btn.setTint(0xaaaaaa));
    };
    ButtonUtil.dressUpButton(this.simulateSprite, simulateClickFunc);

    const resetClickFunc = () => {
      this.gameScene.resetScene();
      this.resetUi();
    };
    const resetSprite = this.add.sprite(300, 510, "btn-reset").setInteractive();
    ButtonUtil.dressUpButton(resetSprite, resetClickFunc);

    /**
     * Algo buttons
     */
    const disableFunc = () => {
      return this.gameScene.simulationStarted;
    };

    const algoBackToFrontClickFunc = () => {
      if (this.gameScene.simulationStarted) return;

      this.planeManager.sortPassengers(PassengerSorts.backToFront);
      this.setGameText("algo done: back-to-front");
    };
    const algoBackToFrontSprite = this.add
      .sprite(500, 470, "btn-algo-back-to-front")
      .setInteractive();
    ButtonUtil.dressUpButton(
      algoBackToFrontSprite,
      algoBackToFrontClickFunc,
      disableFunc
    );

    const algoFrontToBackClickFunc = () => {
      if (this.gameScene.simulationStarted) return;

      this.planeManager.sortPassengers(PassengerSorts.frontToBack);
      this.setGameText("algo done: front-to-back");
    };
    const algoFrontToBackSprite = this.add
      .sprite(500, 550, "btn-algo-front-to-back")
      .setInteractive();
    ButtonUtil.dressUpButton(
      algoFrontToBackSprite,
      algoFrontToBackClickFunc,
      disableFunc
    );

    const algoOutToInClickFunc = () => {
      if (this.gameScene.simulationStarted) return;

      this.planeManager.sortPassengers(PassengerSorts.outToIn);
      this.setGameText("algo done: out-to-in");
    };
    const algoOutToInSprite = this.add
      .sprite(700, 390, "btn-algo-out-to-in")
      .setInteractive();
    ButtonUtil.dressUpButton(
      algoOutToInSprite,
      algoOutToInClickFunc,
      disableFunc
    );

    const algoSlothClickFunc = () => {
      if (this.gameScene.simulationStarted) return;

      this.planeManager.sortPassengers(PassengerSorts.slothSort);
      this.setGameText("algo done: sloth");
    };
    const algoSlothSprite = this.add
      .sprite(700, 470, "btn-algo-sloth")
      .setInteractive();
    ButtonUtil.dressUpButton(algoSlothSprite, algoSlothClickFunc, disableFunc);

    const algoSteffanClickFunc = () => {
      if (this.gameScene.simulationStarted) return;

      this.planeManager.sortPassengers(PassengerSorts.steffanMethod);
      this.setGameText("algo done: steffan sort");
    };
    const algoSteffanSprite = this.add
      .sprite(700, 550, "btn-algo-steffan")
      .setInteractive();
    ButtonUtil.dressUpButton(
      algoSteffanSprite,
      algoSteffanClickFunc,
      disableFunc
    );

    this.algoButtons = [
      algoBackToFrontSprite,
      algoFrontToBackSprite,
      algoOutToInSprite,
      algoSlothSprite,
      algoSteffanSprite,
    ];
  }

  resetUi() {
    this.simulateSprite?.setTexture("btn-simulate");

    this.algoButtons.forEach((btn) => btn.clearTint());
  }

  setPlaneManager(newPlaneManager: PlaneManager) {
    this.planeManager = newPlaneManager;
  }

  setGameText(newText: string) {
    if (!this.gameText) return;

    this.gameText.text = newText;
  }

  setStatsText(newText: string) {
    if (!this.statsText) return;

    this.statsText.text = newText;
  }
}
