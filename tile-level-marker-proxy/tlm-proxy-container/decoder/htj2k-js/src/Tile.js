//#region Segment
class Tile {
  /**
   * Creates an instance of Tile.
   * @constructor
   * @param {SotSegment} sotSegment - SOT segment.
   * @param {number} sodPosition - SOD marker position.
   */
  constructor(sotSegment, sodPosition) {
    this.sotSegment = sotSegment;
    this.sodPosition = sodPosition;
  }
}
//#endregion

//#region Exports
module.exports = Tile;
//#endregion
