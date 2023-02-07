const BinaryReader = require('./BinaryReader');
const { BoxType } = require('./Constants');
const log = require('./log');

//#region Box
class Box {
  /**
   * Creates an instance of Box.
   * @constructor
   * @param {BoxType} type - Box type.
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(type, position, buffer) {
    this.type = type;
    this.position = position;
    this.buffer = buffer;
  }

  /**
   * Gets box type.
   * @method
   * @returns {BoxType} Box type.
   */
  getType() {
    return this.type;
  }

  /**
   * Gets box position.
   * @method
   * @returns {number} Box position.
   */
  getPosition() {
    return this.position;
  }

  /**
   * Gets box buffer.
   * @method
   * @returns {ArrayBuffer} Box buffer.
   */
  getBuffer() {
    return this.buffer;
  }

  /**
   * Gets box length.
   * @method
   * @returns {number} Box length.
   */
  getLength() {
    return this.buffer ? this.buffer.byteLength : 0;
  }

  /**
   * Parses the box.
   * @method
   * @throws Error if parse is not implemented.
   */
  parse() {
    throw new Error('parse should be implemented');
  }

  /**
   * Gets the box description.
   * @method
   * @returns {string} Box description.
   */
  toString() {
    return `Box [Type: ${this._typeFromValue(
      this.getType()
    )}, Position: ${this.getPosition()}, Length: ${this.getLength()}]`;
  }

  //#region Private Methods
  /**
   * Gets box type name from value.
   * @method
   * @private
   * @param {number} type - Box type.
   * @returns {string} Box type name.
   */
  _typeFromValue(type) {
    return Object.keys(BoxType).find((m) => BoxType[m] === type) || `0x${type.toString(16)}`;
  }
  //#endregion
}
//#endregion

//#region BoxReader
class BoxReader {
  /**
   * Creates an instance of BoxReader.
   * @constructor
   * @param {ArrayBuffer} buffer - Boxes buffer.
   * @param {Object} [opts] - Reading options.
   * @param {boolean} [opts.logBoxes] - Flag to indicate whether to log boxes.
   */
  constructor(buffer, opts) {
    opts = opts || {};
    this.logBoxes = opts.logBoxes || false;

    this.binaryReader = new BinaryReader(buffer, false);
    this.boxes = [];
  }

  /**
   * Gets boxes.
   * @method
   * @returns {Array<Box>} Read boxes.
   */
  getBoxes() {
    return this.boxes;
  }

  /**
   * Reads boxes.
   * @method
   * @throws Error if extended length boxes are found.
   */
  readBoxes() {
    let lastBoxFound = false;
    while (!lastBoxFound) {
      const position = this.binaryReader.position();

      let length = this.binaryReader.readUint32();
      if (position + length === this.binaryReader.length()) {
        lastBoxFound = true;
      }

      const type = this.binaryReader.readUint32();
      if (length === 0) {
        lastBoxFound = true;
        length = this.binaryReader.length() - this.binaryReader.position();
      } else if (length === 1) {
        throw new Error('Extended length boxes are not supported');
      }

      const data = this.binaryReader.readUint8Array(length);
      const dataBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const box = new Box(type, position, dataBuffer);
      this._addBox(box);

      if (!lastBoxFound) {
        this.binaryReader.seek(position + length);
      }
    }
  }

  //#region Private Methods
  /**
   * Add a box.
   * @method
   * @private
   * @param {Box} box - Box.
   */
  _addBox(box) {
    if (this.logBoxes) {
      log.info(box.toString());
    }
    this.boxes.push(box);
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = { BoxReader, Box };
//#endregion
