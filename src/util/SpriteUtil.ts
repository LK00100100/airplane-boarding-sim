export class SpriteUtil {
  /**
   * Used so your sprite doesn't spin too many degrees.
   * From angle 0,
   * tweening 90 degrees clockwise may cause your sprite to spin 270 counter-clockwise.
   * This depends on the current angle. You want to just go -90 instead of +270.
   * -90 would be the solution.
   * @param oldAngle sprite's current angle
   * @param newAngle sprite's final angle
   * @returns the angle you want to input so when you tween, it doesn't spin 360 degrees.
   */
  static shortestAngle(oldAngle: number, newAngle: number): number {
    //this causes tests to fail, due to phaser
    //return oldAngle + Phaser.Math.Angle.ShortestBetween(oldAngle, newAngle);

    //calc shorter turning distance
    let clockwiseDist;
    let counterclockwiseDist;
    if (oldAngle < newAngle) {
      counterclockwiseDist = oldAngle + (360 - newAngle);
      clockwiseDist = newAngle - oldAngle;
    } else {
      counterclockwiseDist = oldAngle - newAngle;
      clockwiseDist = 360 - oldAngle + newAngle;
    }

    //add shorter turning distance
    return (
      oldAngle +
      (counterclockwiseDist < clockwiseDist
        ? -counterclockwiseDist
        : clockwiseDist)
    );
  }
}
