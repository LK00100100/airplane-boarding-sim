export class SpriteUtils {
  /**
   * Used so your sprite doesn't spin 360 degrees.
   * So tweening 90 degrees may cause your sprite to spin 360. This
   * depends on the current angle. You want to just go -90 instead of +270.
   * -90 would be the solution.
   * @param oldAngle sprite's current angle
   * @param newAngle sprite's final angle
   * @returns the angle you want to input so when you tween, it doesn't spin 360 degrees.
   */
  static shortestAngle(oldAngle: number, newAngle: number): number {
    /*
     * photonstorm's code
     */
    var difference = newAngle - oldAngle;
    var times = Math.floor((difference - -180) / 360);

    let minus = (difference - times * 360) * -1;

    return oldAngle - minus;
  }
}
