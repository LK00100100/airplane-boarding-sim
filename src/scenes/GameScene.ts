import * as Phaser from "phaser";
//import * as Level1 from "../levels/level1.json";
import * as Level2 from "../levels/level2.json";
import { ButtonUtils } from "../util/ButtonUtils";
import { SceneNames } from "./SceneNames";
import PlaneManager from "../algo/PlaneManager";

//TODO: refactor methods by moving them. and everything...
//TODO: unit tests
export default class GameScene extends Phaser.Scene {
  private gameText!: Phaser.GameObjects.Text; //any messages for the player to read.

  private isSimulationOn: boolean; //simulation has begun

  private planeManager: PlaneManager;

  //TODO: variable baggage loading speed
  //TODO: actual reader and validator for plane

  /**
   * constants
   */
  private readonly FPS = 100 / 3; //30 Frames Per Second, in terms of milliseconds
  public readonly IS_DEBUG_MODE = true; //turn on to see more information

  constructor() {
    super(SceneNames.GAME_SCENE);
  }

  preload() {
    this.load.image("btn-simulate", "assets/btn-simulate.png");
    this.load.image("btn-pause", "assets/btn-pause.png");
    this.load.image("btn-reset", "assets/btn-reset.png");
    this.load.image("btn-complete-reset", "assets/btn-complete-reset.png");

    this.load.image("passenger", "assets/passenger.png");
    this.load.image("baggage", "assets/baggage.png");

    this.load.image("plane-floor", "assets/plane-floor.png");
    this.load.image("plane-seat-coach", "assets/plane-seat-coach.png");
    this.load.image("plane-seat-first", "assets/plane-seat-first.png");
  }

  /**
   * one time Phaser scene setup.
   */
  create() {
    this.gameText = this.add.text(10, 10, "");

    this.createButtons();

    this.resetScene();
  }

  /**
   * Move back the passengers and other metadata to before "simulate".
   */
  private resetScene() {
    /**
     * reset, part 2
     */

    if (this.planeManager != null) this.planeManager.destroy();

    this.planeManager = new PlaneManager(this, Level2);

    this.isSimulationOn = false;
  }

  private createButtons(): void {
    const simulateSprite = this.add
      .sprite(300, 500, "btn-simulate")
      .setInteractive();

    const simulateClickFunc = () => {
      if (this.isSimulationOn) {
        this.setGameText("simulation already running");
        return;
      }

      this.isSimulationOn = true;
      this.setGameText("simulation started");
    };

    ButtonUtils.dressUpButton(simulateSprite, simulateClickFunc);

    const resetClickFunc = () => {
      this.resetScene();
    };

    const resetSprite = this.add.sprite(500, 500, "btn-reset").setInteractive();
    ButtonUtils.dressUpButton(resetSprite, resetClickFunc);

    // let completeResetSprite = this.add
    //   .sprite(740, 500, "btn-complete-reset")
    //   .setInteractive();
    // ButtonUtils.dressUpButton(completeResetSprite, this.restart.bind(this));
  }

  /**
   * restarts scene
   */
  restart() {
    //TODO: try to figure this out
    this.scene.restart(); //doesnt destroy everything
  }

  isEveryoneSeated(): boolean {
    return false;
  }

  /**
   * displays the text. adds new lines if the string is too long
   * @param newText
   */
  setGameText(newText: string) {
    let finalText = "";

    const sentenceLength = 75;

    while (newText.length > 0) {
      if (newText.length < sentenceLength) {
        finalText += newText;
        break;
      }

      finalText += newText.substring(0, sentenceLength) + "\n";
      newText = newText.substring(sentenceLength);
    }

    this.gameText.text = finalText;
  }

  update() {
    if (this.isSimulationOn) {
      this.planeManager.simulateFrame();
    }

    if (this.IS_DEBUG_MODE) {
      this.planeManager.colorOccupiedNodes();
    }
  }
}
