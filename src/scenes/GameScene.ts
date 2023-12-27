import * as Phaser from "phaser";
import * as TheLevel from "../levels/level2.json";
//import * as TheLevel from "../levels/boeing-747-korean-air.json";
import { SceneNames } from "./SceneNames";
import PlaneManager from "../algo/PlaneManager";
import InfoScene from "./ui/InfoScene";

export default class GameScene extends Phaser.Scene {
  public simulationStarted: boolean; //stays true once the simulation starts.
  public isSimulationOn: boolean; //simulation is running or paused
  public simulateTimer!: Phaser.Time.TimerEvent; //repeats every second
  public simulateSeconds: number; //number of simulated seconds

  private planeManager: PlaneManager;

  //for input and camera
  private controls: Phaser.Cameras.Controls.SmoothedKeyControl;
  private cam: Phaser.Cameras.Scene2D.Camera;
  private readonly defaultZoomLevel = 1;

  /**
   * constants
   */
  public readonly IS_DEBUG_MODE = false; //turn on to see more information

  /**
   * UI
   */
  private infoScene: InfoScene;

  constructor() {
    super(SceneNames.GAME_SCENE);
  }

  preload() {
    //passenger
    this.load.image("passenger", "assets/passenger.png");
    this.load.image("baggage", "assets/baggage.png");

    //plane
    this.load.image("plane-floor", "assets/plane-floor.png");
    this.load.image("plane-seat-business", "assets/plane-seat-business.png");
    this.load.image("plane-seat-coach", "assets/plane-seat-coach.png");
    this.load.image("plane-seat-first", "assets/plane-seat-first.png");
  }

  /**
   * one time Phaser scene setup.
   */
  create() {
    //turn on this scene
    this.infoScene = this.infoScene ?? new InfoScene(this);
    this.scene.add(InfoScene.HANDLE, this.infoScene, false);
    this.scene.launch(InfoScene.HANDLE);

    this.resetScene();

    this.initCamera();

    this.infoScene.setPlaneManager(this.planeManager);
  }

  /**
   * Move back the passengers and other metadata to before "simulate".
   */
  public resetScene() {
    this.planeManager?.destroy();
    this.simulateTimer?.destroy();

    this.planeManager = new PlaneManager(this, TheLevel);

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

    this.setGameText("algo done: random\nsilverbacksnakes.io");
    this.updateStatsText();
  }

  private initCamera(): void {
    /**
     * Camera stuff
     */
    //let cursors = this.input.keyboard.createCursorKeys(); //cursors.right
    let keys: any = this.input.keyboard.addKeys("W,S,A,D");
    var controlConfig = {
      camera: this.cameras.main,
      left: keys.A,
      right: keys.D,
      up: keys.W,
      down: keys.S,
      zoomIn: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      zoomOut: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      acceleration: 1.0,
      drag: 0.01,
      maxSpeed: 1.0,
    };

    this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(
      controlConfig
    );
    this.cam = this.cameras.main;
    this.cam.setBounds(0, 0, 5000, 6000).setZoom(this.defaultZoomLevel);
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

    this.infoScene.setGameText(finalText);
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

    let newText = `Time: ${timeStr}`;
    newText += `\nShuffles: ${this.planeManager.getNumShuffles()}`;

    //calc total steps
    let totalSteps = this.planeManager.getTotalSteps();

    newText += `\nStep count: ${totalSteps}`;

    this.infoScene.setStatsText(newText);
  }

  update(time, delta) {
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

    this.controls.update(delta);
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
