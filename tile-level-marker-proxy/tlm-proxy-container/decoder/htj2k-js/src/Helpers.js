//#region Point
class MathFunction {
  /**
   * Performs integer addition, division and returns the ceil value.
   * @method
   * @param {number} a - A value.
   * @param {number} b - B value.
   * @returns {number} Result.
   */
  static divCeil(a, b) {
    // ~~ is a faster Math.floor
    return ~~((a + b - 1) / b);
  }
}
//#endregion

//#region Point
class Point {
  /**
   * Creates an instance of Point.
   * @constructor
   * @param {number} [x] - X value.
   * @param {number} [y] - Y value.
   */
  constructor(x, y) {
    this.x = x || 0;
    this.y = y || 0;
  }

  /**
   * Gets X value.
   * @method
   * @returns {number} X value.
   */
  getX() {
    return this.x;
  }

  /**
   * Sets X value.
   * @method
   * @param {number} x - X value.
   */
  setX(x) {
    this.x = x;
  }

  /**
   * Gets Y value.
   * @method
   * @returns {number} Y value.
   */
  getY() {
    return this.y;
  }

  /**
   * Sets Y value.
   * @method
   * @param {number} y - Y value.
   */
  setY(y) {
    this.y = y;
  }

  /**
   * Gets the point description.
   * @method
   * @returns {string} Point description.
   */
  toString() {
    return `Point [x: ${this.getX()}, y: ${this.getY()}]`;
  }
}
//#endregion

//#region Size
class Size {
  /**
   * Creates an instance of Size.
   * @constructor
   * @param {number} [width] - Width value.
   * @param {number} [height] - Height value.
   */
  constructor(width, height) {
    this.width = width || 0;
    this.height = height || 0;
  }

  /**
   * Gets width value.
   * @method
   * @returns {number} Width value.
   */
  getWidth() {
    return this.width;
  }

  /**
   * Sets width value.
   * @method
   * @param {number} width - Width value.
   */
  setWidth(width) {
    this.width = width;
  }

  /**
   * Gets height value.
   * @method
   * @returns {number} Height value.
   */
  getHeight() {
    return this.height;
  }

  /**
   * Sets height value.
   * @method
   * @param {number} height - Height value.
   */
  setHeight(height) {
    this.height = height;
  }

  /**
   * Gets area.
   * @method
   * @returns {number} Area.
   */
  getArea() {
    return this.width * this.height;
  }

  /**
   * Gets the size description.
   * @method
   * @returns {string} Size description.
   */
  toString() {
    return `Size [width: ${this.getWidth()}, height: ${this.getHeight()}, area: ${this.getArea()}]`;
  }
}
//#endregion

//#region Exports
module.exports = { MathFunction, Point, Size };
//#endregion
