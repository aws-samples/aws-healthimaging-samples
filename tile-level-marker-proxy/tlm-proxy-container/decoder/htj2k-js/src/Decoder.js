const Codestream = require('./Codestream');
const { J2kFormat, BoxType } = require('./Constants');
const { BoxReader } = require('./Box');

//#region Decoder
class Decoder {
  /**
   * Creates an instance of Decoder.
   * @constructor
   * @param {ArrayBuffer} buffer - Data buffer.
   * @param {Object} [opts] - Decoder options.
   * @param {boolean} [opts.logBoxes] - Flag to indicate whether to log boxes.
   * @param {boolean} [opts.logSegmentMarkers] - Flag to indicate whether to log segment markers.
   */
  constructor(buffer, opts) {
    this.decoderOpts = opts || {};

    this.buffer = buffer;
    this.codestream = undefined;
  }

  /**
   * Reads the header.
   * @method
   * @returns {Object} header Read header result object.
   * @returns {number} header.width width.
   * @returns {number} header.height height.
   * @returns {number} header.bitDepth bitDepth.
   * @returns {boolean} header.signed signed.
   * @returns {number} header.components components.
   * @returns {boolean} header.decompositionLevels decompositionLevels.
   * @returns {string} header.progressionOrder progressionOrder.
   * @throws Error if buffer does not contain an HTJ2K codestream.
   */
  readHeader() {
    const format = this._determineJ2kFormat(this.buffer);
    if (format === J2kFormat.Unknown) {
      throw new Error('Buffer does not contain an HTJ2K codestream (raw or within a box)');
    }

    let codestreamBuffer = this.buffer;
    if (format === J2kFormat.CodestreamInBox) {
      const boxReader = new BoxReader(this.buffer, this.decoderOpts);
      boxReader.readBoxes();
      const boxes = boxReader.getBoxes();
      const firstCodestreamBox = boxes.find((b) => b.getType() === BoxType.CodestreamBox);
      if (!firstCodestreamBox) {
        throw new Error('Buffer does not contain an HTJ2K codestream within a box');
      }
      codestreamBuffer = firstCodestreamBox.getBuffer();
    }
    this.codestream = new Codestream(codestreamBuffer, this.decoderOpts);

    return this.codestream.readHeader();
  }

  /**
   * Performs decoding.
   * @method
   * @param {Object} [opts] - Decoding options.
   */
  decode(opts) {
    if (!this.codestream) {
      this.readHeader();
    }

    this.codestream.decode(opts);
  }

  //#region Private Methods
  /**
   * Determines whether the data is a raw codestream or a file (boxed codestream).
   * @method
   * @private
   * @returns {J2kFormat} The determined format type.
   */
  _determineJ2kFormat(buffer) {
    const Jp2Rfc3745Magic = Uint8Array.from([
      0x00, 0x00, 0x00, 0x0c, 0x6a, 0x50, 0x20, 0x20, 0x0d, 0x0a, 0x87, 0x0a,
    ]);
    const Jp2Magic = Uint8Array.from([0x0d, 0x0a, 0x87, 0x0a]);
    const J2kCodestreamMagic = Uint8Array.from([0xff, 0x4f, 0xff, 0x51]);

    let format = J2kFormat.Unknown;
    const buf12 = new Uint8Array(buffer.slice(0, 12));
    if (
      this._compareUint8ArrayBytes(buf12, Jp2Rfc3745Magic, 12) === true ||
      this._compareUint8ArrayBytes(buf12, Jp2Magic, 4) === true
    ) {
      format = J2kFormat.CodestreamInBox;
    } else if (this._compareUint8ArrayBytes(buf12, J2kCodestreamMagic, 4) === true) {
      format = J2kFormat.RawCodestream;
    }

    return format;
  }

  /**
   * Compares two Uint8Array object for data equality.
   * @method
   * @private
   * @param {Uint8Array} u1 - First array.
   * @param {Uint8Array} u2 - Second array.
   * @param {number} length - Data length to compare.
   * @returns {boolean} Comparison result.
   */
  _compareUint8ArrayBytes(u1, u2, length) {
    for (let i = 0; i < length; i++) {
      if (u1[i] !== u2[i]) {
        return false;
      }
    }

    return true;
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = Decoder;
//#endregion
