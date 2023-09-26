import * as Phaser from "phaser";
import * as Level2 from "../levels/level2.json";
import { ButtonUtil } from "../util/ButtonUtil";
import { SceneNames } from "./SceneNames";
import PlaneManager from "../algo/PlaneManager";
import { PassengerSorts } from "../algo/PassengerSorts";

export default class GameScene extends Phaser.Scene {
  private gameText!: Phaser.GameObjects.Text; //any messages for the player to read.
  private statsText!: Phaser.GameObjects.Text; //stats messages

  private simulationStarted: boolean; //stays true when simulation starts.
  private isSimulationOn: boolean; //simulation is running or paused
  private simulateTimer!: Phaser.Time.TimerEvent; //repeats every second
  private simulateSeconds: number; //number of simulated seconds

  private planeManager: PlaneManager;

  private simulateSprite: Phaser.GameObjects.Sprite;

  private algoButtons: Array<Phaser.GameObjects.Sprite>;

  /**
   * constants
   */
  public readonly IS_DEBUG_MODE = false; //turn on to see more information

  constructor() {
    super(SceneNames.GAME_SCENE);
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

    //passenger
    this.load.image("passenger", "assets/passenger.png");
    this.load.image("baggage", "assets/baggage.png");

    //plane
    this.load.image("plane-floor", "assets/plane-floor.png");
    this.load.image("plane-seat-coach", "assets/plane-seat-coach.png");
    this.load.image("plane-seat-first", "assets/plane-seat-first.png");
  }

  /**
   * one time Phaser scene setup.
   */
  create() {
    this.gameText = this.add.text(10, 10, "");
    this.statsText = this.add.text(10, 400, "");

    this.createButtons();

    this.resetScene();
  }

  /**
   * Move back the passengers and other metadata to before "simulate".
   */
  private resetScene() {
    this.planeManager?.destroy();
    this.simulateTimer?.destroy();

    this.planeManager = new PlaneManager(this, Level2);

    this.simulationStarted = false;
    this.isSimulationOn = false;
    this.simulateTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.simulateSeconds += 1;
      },
      callbackScope: this,
      repeat: -1,
    });
    this.simulateTimer.paused = true;
    this.simulateSeconds = 0;

    this.simulateSprite?.setTexture("btn-simulate");

    this.setGameText("algo done: random\nsilverbacksnakes.io");
    this.updateStatsText();
    this.algoButtons.forEach((btn) => btn.clearTint());
  }

  private createButtons(): void {
    this.simulateSprite = this.add
      .sprite(100, 510, "btn-simulate")
      .setInteractive();
    const simulateClickFunc = () => {
      if (this.planeManager.isEveryoneSeated()) {
        this.setGameText("simulation is complete...");
        return;
      }

      //pause the active simulate
      if (this.isSimulationOn) {
        this.setGameText("pausing...");

        this.isSimulationOn = false;
        this.simulateTimer.paused = true;
        this.planeManager.pauseTimers();
        return;
      }

      if (!this.simulationStarted) {
        this.setGameText("simulation started");
      } else {
        this.setGameText("simulation unpaused");
      }

      //start simulation
      this.simulationStarted = true;
      this.isSimulationOn = true;
      this.simulateTimer.paused = false;
      this.planeManager.unpauseTimers();

      this.simulateSprite.setTexture("btn-pause");

      //grey out buttons
      this.algoButtons.forEach((btn) => btn.setTint(0xaaaaaa));
    };
    ButtonUtil.dressUpButton(this.simulateSprite, simulateClickFunc);

    const resetClickFunc = () => {
      this.resetScene();
    };
    const resetSprite = this.add.sprite(300, 510, "btn-reset").setInteractive();
    ButtonUtil.dressUpButton(resetSprite, resetClickFunc);

    /**
     * Algo buttons
     */
    const disableFunc = () => {
      return this.simulationStarted;
    };

    const algoBackToFrontClickFunc = () => {
      if (this.simulationStarted) return;

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
      if (this.simulationStarted) return;

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
      if (this.simulationStarted) return;

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
      if (this.simulationStarted) return;

      this.planeManager.sortPassengers(PassengerSorts.slothSort);
      this.setGameText("algo done: sloth");
    };
    const algoSlothSprite = this.add
      .sprite(700, 470, "btn-algo-sloth")
      .setInteractive();
    ButtonUtil.dressUpButton(algoSlothSprite, algoSlothClickFunc, disableFunc);

    const algoSteffanClickFunc = () => {
      if (this.simulationStarted) return;

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

  /**
   * restarts scene
   */
  restart() {
    this.scene.restart(); //doesnt destroy everything for some reason 🤔
  }

  /**
   * displays the game text. adds new lines if the string is too long
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

  /**
   * displays the text. adds new lines if the string is too long
   * @param newText
   */
  updateStatsText() {
    const numMinutes = Math.floor(this.simulateSeconds / 60);
    const minuteStr = ("" + numMinutes).padStart(2, "0");
    const numSeconds = this.simulateSeconds % 60;
    const secondStr = ("" + numSeconds).padStart(2, "0");
    const timeStr = `${minuteStr}:${secondStr}`;

    this.statsText.text = `Time: ${timeStr}`;
    this.statsText.text += `\nShuffles: ${this.planeManager.getNumShuffles()}`;

    //calc total steps
    let totalSteps = this.planeManager.getTotalSteps();

    this.statsText.text += `\nStep count: ${totalSteps}`;
  }

  update() {
    if (this.isSimulationOn) {
      this.planeManager.simulateFrame();

      this.updateStatsText();
      if (this.planeManager.isEveryoneSeated()) {
        this.simulationComplete();
      }
    }

    if (this.IS_DEBUG_MODE) {
      this.planeManager.colorOccupiedNodes();
    }
  }

  /**
   * called when everyone is seated and done moving
   */
  simulationComplete() {
    this.isSimulationOn = false;

    this.setGameText("everyone is seated");
    this.simulateTimer.paused = true;
  }
}
