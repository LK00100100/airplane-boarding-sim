export class SpriteUtils {
  /**
   * Used so your sprite doesn't spin too many degrees.
   * So tweening 90 degrees clockwise may cause your sprite to spin 270 counter-clockwise.
   * This depends on the current angle. You want to just go -90 instead of +270.
   * -90 would be the solution.
   * @param oldAngle sprite's current angle
   * @param newAngle sprite's final angle
   * @returns the angle you want to input so when you tween, it doesn't spin 360 degrees.
   */
  static shortestAngle(oldAngle: number, newAngle: number): number {
    return oldAngle + Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);
  }
}
