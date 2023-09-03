export class ButtonUtils {
  /**
   * add standardized functionality to a game button.
   * @param sprite
   * @param onUpFunc function to do stuff. when clicked up. "this" is the button
   */
  static dressUpButton(
    sprite: Phaser.GameObjects.Sprite,
    onUpFunc: Function
  ): void {
    sprite.on("pointerdown", function (pointer: Phaser.Input.Pointer) {
      sprite.setTint(0x00bb00);
    });

    sprite.on("pointerout", function (pointer: Phaser.Input.Pointer) {
      sprite.clearTint();
    });

    sprite.on("pointerup", function (pointer: Phaser.Input.Pointer) {
      sprite.setTint(0x000099);

      onUpFunc();
    });

    sprite.on("pointerover", function (pointer: Phaser.Input.Pointer) {
      sprite.setTint(0x000099);
    });
  }
}
