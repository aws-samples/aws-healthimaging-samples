const BinaryReader = require('./BinaryReader');
const {
  Segment,
  SizSegment,
  CapSegment,
  CodSegment,
  QcdSegment,
  ComSegment,
  SotSegment,
} = require('./Segment');
const { Marker, ProgressionOrder } = require('./Constants');
const Tile = require('./Tile');
const log = require('./log');

//#region Codestream
class Codestream {
  /**
   * Creates an instance of Codestream.
   * @constructor
   * @param {ArrayBuffer} buffer - Codestream buffer.
   * @param {Object} [opts] - Decoder options.
   * @param {boolean} [opts.logSegmentMarkers] - Flag to indicate whether
   * to log segment markers.
   */
  constructor(buffer, opts) {
    opts = opts || {};
    this.logSegmentMarkers = opts.logSegmentMarkers || false;

    this.binaryReader = new BinaryReader(buffer, false);
    this.segments = [];
    this.tiles = [];
    this.currentTile = 0;
  }

  /**
   * Gets segments.
   * @method
   * @returns {Array<Segment>} Parsed segments.
   */
  getSegments() {
    return this.segments;
  }

  /**
   * Reads the codestream header.
   * @method
   * @returns {Object} header Read header result object.
   * @returns {number} header.width width.
   * @returns {number} header.height height.
   * @returns {number} header.bitDepth bitDepth.
   * @returns {boolean} header.signed signed.
   * @returns {number} header.components components.
   * @returns {boolean} header.decompositionLevels decompositionLevels.
   * @returns {string} header.progressionOrder progressionOrder.
   * @throws Error if codestream ends before finding a tile segment and
   * SIZ, COD and QCD segments are not found.
   */
  readHeader() {
    this.binaryReader.seek(0);
    this.segments.length = 0;
    let tileFound = false;

    for (;;) {
      // Read next segment
      const { position, marker, data } = this._readNextSegment();
      if (position === -1 && marker === -1) {
        log.error('File terminated early');
        break;
      }

      // Stop at the first SOT marker found and rewind stream
      if (marker === Marker.Sot) {
        this.binaryReader.seek(position);
        tileFound = true;
        break;
      }

      // If this is a known segment, parse it
      let segment = undefined;
      if (marker === Marker.Siz) {
        segment = new SizSegment(position, data);
        segment.parse();
      } else if (marker === Marker.Cap) {
        segment = new CapSegment(position, data);
        segment.parse();
      } else if (marker === Marker.Cod) {
        segment = new CodSegment(position, data);
        segment.parse();
      } else if (marker === Marker.Qcd) {
        segment = new QcdSegment(position, data);
        segment.parse();
      } else if (marker === Marker.Com) {
        segment = new ComSegment(position, data);
        segment.parse();
      } else {
        segment = new Segment(marker, position, data);
      }

      // Add segment to segment list
      this._addSegment(segment);
    }

    if (!tileFound) {
      throw new Error('Codestream ended before finding a tile segment');
    }
    const mandatorySegments = [Marker.Siz, Marker.Cod, Marker.Qcd].every((m) =>
      this.segments.some((s) => s.getMarker() === m)
    );
    if (!mandatorySegments) {
      throw new Error('SIZ, COD and QCD segments are required and were not found');
    }

    const siz = this.segments.find((s) => s.getMarker() === Marker.Siz);
    const cod = this.segments.find((s) => s.getMarker() === Marker.Cod);

    return {
      width: siz.getWidth(0),
      height: siz.getHeight(0),
      bitDepth: siz.getBitDepth(0),
      signed: siz.isSigned(0),
      components: siz.getComponents(),
      reversible: cod.isReversible(),
      decompositionLevels: cod.getDecompositionLevels(),
      progressionOrder: Object.keys(ProgressionOrder)[cod.getProgressionOrder()].toUpperCase(),
    };
  }

  /**
   * Decodes the codestream.
   * @method
   * @param {Object} [opts] - Decoding options.
   * @throws Error if a SIZ segment segment was not found,
   */
  decode(/*opts*/) {
    //opts = opts || {};

    // Decode was called without reading the header segments first.
    if (this.segments.length === 0) {
      this.readHeader();
    }

    const siz = this.segments.find((s) => s.getMarker() === Marker.Siz);
    if (!siz) {
      throw new Error('SIZ segment was not found');
    }

    // Header parsing stopped at first tile
    // Continue iterating over tiles
    for (;;) {
      const { marker, position, data } = this._readNextSegment();
      if (position === -1 && marker === -1) {
        log.error('File terminated early');
        break;
      }

      // End of codestream
      if (marker === Marker.Eoc) {
        const segment = new Segment(marker, position, data);
        this._addSegment(segment);
        break;
      }

      // Start of tile
      if (marker === Marker.Sot) {
        const sotSegment = new SotSegment(position, data);
        sotSegment.parse();
        this._addSegment(sotSegment);

        const tileStartPosition = this.binaryReader.position();
        const tilePartIndex = sotSegment.getTilePartIndex();

        if (sotSegment.getTileIndex() > siz.getNumberOfTiles().getArea()) {
          throw new Error(`Wrong tile index [${tilePartIndex}]`);
        }
        if (tilePartIndex) {
          if (sotSegment.getTilePartCount() && tilePartIndex >= sotSegment.getTilePartCount()) {
            throw new Error('Tile part count should be less than total number of tile parts');
          }
        }

        // Read segments inside tile
        let sodFound = false;
        for (;;) {
          const { position, marker, data } = this._readNextSegment();
          if (position === -1 && marker === -1) {
            log.error('File terminated early');
            break;
          }

          // Start of data
          if (marker === Marker.Sod) {
            const segment = new Segment(marker, position, data);
            this._addSegment(segment);

            this.binaryReader.seek(position);
            sodFound = true;
            break;
          }

          const segment = new Segment(marker, position, data);
          this._addSegment(segment);
        }

        if (!sodFound) {
          throw new Error(
            `Codestream terminated early before start of data is found for tile indexed ${sotSegment.getTileIndex()} and tile part ${tilePartIndex}`
          );
        }

        // Parse tile
        this.tiles.push(new Tile(sotSegment, position));

        // Jump to next tile
        const tileEndPosition = tileStartPosition + sotSegment.getPayloadLength();
        this.binaryReader.seek(tileEndPosition);
      }
    }
  }

  //#region Private Methods
  /**
   * Add a segment.
   * @method
   * @private
   * @param {Segment} segment - Segment.
   */
  _addSegment(segment) {
    if (this.logSegmentMarkers) {
      log.info(segment.toString());
    }
    this.segments.push(segment);
  }

  /**
   * Reads the next segment in the codestream.
   * @method
   * @private
   * @returns {Object} segment Read next segment result object.
   * @returns {number} segment.position position.
   * @returns {Marker} segment.marker marker.
   * @returns {number} segment.size size.
   * @returns {ArrayBuffer} segment.data data.
   */
  _readNextSegment() {
    // Position and marker
    let { position, marker } = this._scanNextMarker();
    if (position === -1 && marker === -1) {
      return { position, marker, length: 0, data: undefined };
    }

    // Size
    let length =
      marker !== Marker.Soc &&
      marker !== Marker.Sod &&
      marker !== Marker.Eoc &&
      (marker < 0xd0 || marker > 0xd8)
        ? this.binaryReader.readUint16() - 2
        : 0;

    // Data
    let data = undefined;
    length =
      length > this.binaryReader.length() - this.binaryReader.position()
        ? this.binaryReader.length() - this.binaryReader.position()
        : length;
    if (length > 0) {
      const buffer = this.binaryReader.readUint8Array(length);
      data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    }

    return { position, marker, length, data };
  }

  /**
   * Scans for the next marker in the codestream.
   * @method
   * @private
   * @returns {Object} nextMarker Read next marker result object.
   * @returns {number} nextMarker.position position.
   * @returns {Marker} nextMarker.marker marker.
   * @throws Error if found marker is not valid.
   */
  _scanNextMarker() {
    let position = -1;
    let marker = -1;
    while (!this.binaryReader.isAtEnd()) {
      const m1 = this.binaryReader.readUint8();
      if (m1 === 0xff) {
        position = this.binaryReader.position() - 1;
        const m2 = this.binaryReader.readUint8();

        marker = (m1 << 8) | m2;
        if ((marker & 0xff00) !== 0xff00) {
          throw new Error(`Not a marker: ${marker.toString(16)}`);
        }
        marker &= 0xff;
        break;
      }
    }

    return { position, marker };
  }
  //#endregion
}
//#endregion

//#region Exports
module.exports = Codestream;
//#endregion
