//#region BinaryReader
class BinaryReader {
  /**
   * Creates an instance of BinaryReader.
   * @constructor
   * @param {ArrayBuffer} buffer - Reading data buffer.
   * @param {boolean} [littleEndian] - Data buffer endianness.
   */
  constructor(buffer, littleEndian) {
    this.buffer = buffer;
    this.view = new DataView(this.buffer);
    this.offset = 0;
    this.isLittleEndian = littleEndian || false;
  }

  /**
   * Reads an unsigned integer value.
   * @method
   * @returns {number} The unsigned integer value.
   */
  readUint32() {
    const val = this.view.getUint32(this.offset, this.isLittleEndian);
    this._increment(4);

    return val;
  }

  /**
   * Reads a signed integer value.
   * @method
   * @returns {number} The signed integer value.
   */
  readInt32() {
    const val = this.view.getInt32(this.offset, this.isLittleEndian);
    this._increment(4);

    return val;
  }

  /**
   * Reads an unsigned short value.
   * @method
   * @returns {number} The unsigned short value.
   */
  readUint16() {
    const val = this.view.getUint16(this.offset, this.isLittleEndian);
    this._increment(2);

    return val;
  }

  /**
   * Reads a signed short value.
   * @method
   * @returns {number} The signed short value.
   */
  readInt16() {
    const val = this.view.getInt16(this.offset, this.isLittleEndian);
    this._increment(2);

    return val;
  }

  /**
   * Reads a byte value.
   * @method
   * @returns {number} The byte value.
   */
  readUint8() {
    const val = this.view.getUint8(this.offset);
    this._increment(1);

    return val;
  }

  /**
   * Reads a byte value array.
   * @method
   * @param {number} length - Reading length.
   * @returns {Uint8Array} The byte value array.
   */
  readUint8Array(length) {
    const arr = new Uint8Array(this.buffer, this.offset, length);
    this._increment(length);

    return arr;
  }

  /**
   * Reads a string.
   * @method
   * @param {number} length - Reading length.
   * @returns {string} The string.
   */
  readString(length) {
    const chars = [];
    const start = this.offset;
    const end = this.offset + length;
    for (let i = start; i < end; ++i) {
      chars.push(String.fromCharCode(this.view.getUint8(i)));
      this._increment(1);
    }

    return chars.join('');
  }

  /**
   * Gets the buffer byte length.
   * @method
   * @returns {number} The buffer byte length.
   */
  length() {
    return this.buffer.byteLength;
  }

  /**
   * Gets the read offset.
   * @method
   * @returns {number} The read offset.
   */
  position() {
    return this.offset;
  }

  /**
   * Sets the read offset to given position.
   * Clamps between zero and buffer length.
   * @method
   * @param {number} pos - Position.
   */
  seek(pos) {
    this.offset = Math.max(0, Math.min(this.length(), pos));
  }

  /**
   * Resets the reading offset.
   * @method
   */
  reset() {
    this.seek(0);
  }

  /**
   * Checks if the reading offset is at or beyond the buffer boundaries.
   * @method
   * @returns {boolean} Flag to indicate if the reading offset
   * is beyond the buffer boundaries.
   */
  isAtEnd() {
    return this.offset >= this.buffer.byteLength;
  }

  /**
   * Sets the reading offset to the end of the reading buffer.
   * @method
   */
  toEnd() {
    this.seek(this.buffer.byteLength);
  }

  //#region Private Methods
  /**
   * Increments the reading offset.
   * @method
   * @private
   * @param {number} step - Increment value.
   */
  _increment(step) {
    this.offset += step;
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = BinaryReader;
//#endregion
