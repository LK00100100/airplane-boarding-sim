export class ButtonUtil {
  /**
   * add standardized functionality to a game button.
   * Such as tinting.
   * @param sprite
   * @param onUpFunc function to do stuff. when clicked up. "this" is the button
   * @param disableFunc disable button on condition
   */
  static dressUpButton(
    sprite: Phaser.GameObjects.Sprite,
    onUpFunc: Function,
    disableFunc: any = () => {
      return false;
    }
  ): void {
    sprite.setDepth(1000).setScrollFactor(0); //don't move UI

    sprite.on("pointerdown", function (pointer: Phaser.Input.Pointer) {
      if (disableFunc()) return;

      sprite.setTint(0x00bb00);
    });

    sprite.on("pointerout", function (pointer: Phaser.Input.Pointer) {
      if (disableFunc()) return;

      sprite.clearTint();
    });

    sprite.on("pointerup", function (pointer: Phaser.Input.Pointer) {
      if (disableFunc()) return;

      sprite.setTint(0x000099);

      onUpFunc();
    });

    sprite.on("pointerover", function (pointer: Phaser.Input.Pointer) {
      if (disableFunc()) return;

      sprite.setTint(0x000099);
    });
  }
}
