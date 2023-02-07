
const BoxParser = require('./BoxParser');
const CodestreamParser = require('./CodestreamParser');
const log = require('./log');

const Jp2Rfc3745Magic = Uint8Array.from([
    0x00, 0x00, 0x00, 0x0c, 0x6a, 0x50, 0x20, 0x20, 0x0d, 0x0a, 0x87, 0x0a,
  ])
 const Jp2Magic = Uint8Array.from([0x0d, 0x0a, 0x87, 0x0a]);
 const J2kCodestreamMagic = Uint8Array.from([0xff, 0x4f, 0xff, 0x51]);

class FileParser {
    parse(parser) {
        log.debug('FileParser.parse()')
        const bufferStream = parser.getBufferStream()
        // make sure there is enough bytes
        if(bufferStream.buffer.length - bufferStream.position < 12) {
            parser.wait()
            return this
        }

        const buf12 = new Uint8Array(bufferStream.buffer.slice(bufferStream.position, bufferStream.position + 12));
        if (
          this._compareUint8ArrayBytes(buf12, Jp2Rfc3745Magic, 12) === true ||
          this._compareUint8ArrayBytes(buf12, Jp2Magic, 4) === true
        ) {
            return new BoxParser()
        } else if (this._compareUint8ArrayBytes(buf12, J2kCodestreamMagic, 4) === true) {
            return new CodestreamParser()
        }
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


}

module.exports = FileParser