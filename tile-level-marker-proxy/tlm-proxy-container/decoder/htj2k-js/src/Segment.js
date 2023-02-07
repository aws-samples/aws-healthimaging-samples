const BinaryReader = require('./BinaryReader');
const {
  Marker,
  CodingStyle,
  ProgressionOrder,
  CodeblockStyle,
  WaveletTransform,
} = require('./Constants');
const { MathFunction, Point, Size } = require('./Helpers');

//#region Segment
class Segment {
  /**
   * Creates an instance of Segment.
   * @constructor
   * @param {Marker} marker - Segment marker.
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(marker, position, buffer) {
    this.marker = marker;
    this.position = position;
    this.buffer = buffer;
  }

  /**
   * Gets segment marker.
   * @method
   * @returns {Marker} Segment marker.
   */
  getMarker() {
    return this.marker;
  }

  /**
   * Gets segment position in codestream.
   * @method
   * @returns {number} Segment position.
   */
  getPosition() {
    return this.position;
  }

  /**
   * Gets segment buffer.
   * @method
   * @returns {ArrayBuffer} Segment buffer.
   */
  getBuffer() {
    return this.buffer;
  }

  /**
   * Gets segment length (including marker).
   * @method
   * @returns {number} Segment length.
   */
  getLength() {
    return this.buffer ? this.buffer.byteLength + 2 : 0;
  }

  /**
   * Parses the segment.
   * @method
   * @throws Error if parse is not implemented.
   */
  parse() {
    throw new Error('parse should be implemented');
  }

  /**
   * Gets the segment description.
   * @method
   * @returns {string} Segment description.
   */
  toString() {
    return `Segment [Marker: ${this._markerFromValue(
      this.getMarker()
    )}, Position: ${this.getPosition()} (0x${this.getPosition().toString(
      16
    )}), Length: ${this.getLength()}]`;
  }

  //#region Private Methods
  /**
   * Gets marker name from value.
   * @method
   * @private
   * @param {number} marker - Marker value.
   * @returns {string} Marker name.
   */
  _markerFromValue(marker) {
    return Object.keys(Marker).find((m) => Marker[m] === marker) || `0x${marker.toString(16)}`;
  }
  //#endregion
}
//#endregion

//#region SizSegment
class SizSegment extends Segment {
  /**
   * Creates an instance of SizSegment.
   * @constructor
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(position, buffer) {
    super(Marker.Siz, position, buffer);

    this.profile = 0;
    this.refGridSize = new Size();
    this.imageOffset = new Point();
    this.tileSize = new Size();
    this.tileOffset = new Point();
    this.components = 0;
    this.precisions = [];
    this.subSamplingX = [];
    this.subSamplingY = [];
  }

  /**
   * Gets the profile.
   * @method
   * @returns {string} The profile.
   */
  getProfile() {
    return this.profile;
  }

  /**
   * Gets the reference grid size.
   * @method
   * @returns {Size} The reference grid size.
   */
  getRefGridSize() {
    return this.refGridSize;
  }

  /**
   * Gets the image offset.
   * @method
   * @returns {Point} The image offset.
   */
  getImageOffset() {
    return this.imageOffset;
  }

  /**
   * Gets the reference tile size.
   * @method
   * @returns {Size} The reference tile size.
   */
  getTileSize() {
    return this.tileSize;
  }

  /**
   * Gets the tile offset.
   * @method
   * @returns {Point} The tile offset.
   */
  getTileOffset() {
    return this.tileOffset;
  }

  /**
   * Gets number of components.
   * @method
   * @returns {number} The number of components.
   */
  getComponents() {
    return this.components;
  }

  /**
   * Gets bit depth for a component.
   * @method
   * @param {number} component - Component.
   * @returns {number} The bit depth.
   * @throws Error if requested component is out of range.
   */
  getBitDepth(component) {
    if (component > this.getComponents()) {
      throw new Error(`Requested component is out of range [${component}]`);
    }

    return (this.precisions[component] & 0x7f) + 1;
  }

  /**
   * Gets signedness for a component.
   * @method
   * @param {number} component - Component.
   * @returns {number} The signedness.
   * @throws Error if requested component is out of range.
   */
  isSigned(component) {
    if (component > this.getComponents()) {
      throw new Error(`Requested component is out of range [${component}]`);
    }

    return (this.precisions[component] & 0x80) !== 0;
  }

  /**
   * Gets sub-sampling X a component.
   * @method
   * @param {number} component - Component.
   * @returns {number} The sub-sampling X.
   * @throws Error if requested component is out of range.
   */
  getSubSamplingX(component) {
    if (component > this.getComponents()) {
      throw new Error(`Requested component is out of range [${component}]`);
    }

    return this.subSamplingX[component];
  }

  /**
   * Gets sub-sampling Y a component.
   * @method
   * @param {number} component - Component.
   * @returns {number} The sub-sampling Y.
   * @throws Error if requested component is out of range.
   */
  getSubSamplingY(component) {
    if (component > this.getComponents()) {
      throw new Error(`Requested component is out of range [${component}]`);
    }

    return this.subSamplingY[component];
  }

  /**
   * Gets width for a component.
   * @method
   * @param {number} component - Component.
   * @returns {number} The width.
   * @throws Error if requested component is out of range.
   */
  getWidth(component) {
    if (component > this.getComponents()) {
      throw new Error(`Requested component is out of range [${component}]`);
    }
    const ds = this.getSubSamplingX(component);

    return (
      MathFunction.divCeil(this.getRefGridSize().getWidth(), ds) -
      MathFunction.divCeil(this.getImageOffset().getX(), ds)
    );
  }

  /**
   * Gets number of tiles.
   * @method
   * @returns {Size} The width.
   */
  getNumberOfTiles() {
    const w = this.getRefGridSize().getWidth() - this.getTileOffset().getX();
    const h = this.getRefGridSize().getHeight() - this.getTileOffset().getY();

    return new Size(
      MathFunction.divCeil(w, this.getTileSize().getWidth()),
      MathFunction.divCeil(h, this.getTileSize().getHeight())
    );
  }

  /**
   * Gets height for a component.
   * @method
   * @param {number} component - Component.
   * @returns {number} The height.
   * @throws Error if requested component is out of range.
   */
  getHeight(component) {
    if (component > this.getComponents()) {
      throw new Error(`Requested component is out of range [${component}]`);
    }
    const ds = this.getSubSamplingY(component);

    return (
      MathFunction.divCeil(this.getRefGridSize().getHeight(), ds) -
      MathFunction.divCeil(this.getImageOffset().getY(), ds)
    );
  }

  /**
   * Parses the segment.
   * @method
   */
  parse() {
    const binaryReader = new BinaryReader(this.getBuffer(), false);

    this.profile = binaryReader.readUint16();
    if ((this.profile & 0x4000) === 0) {
      throw new Error('Profile bit 14 not set (this is not an HTJ2K codestream)');
    }

    this.refGridSize.setWidth(binaryReader.readUint32());
    this.refGridSize.setHeight(binaryReader.readUint32());
    if (this.refGridSize.getWidth() === 0 || this.refGridSize.getHeight() === 0) {
      throw new Error('Reference grid width and height must be above zero');
    }

    this.imageOffset.setX(binaryReader.readUint32());
    this.imageOffset.setY(binaryReader.readUint32());
    if (this.imageOffset.getX() === 0xffffffff || this.imageOffset.getY() === 0xffffffff) {
      throw new Error('Image offset must be below the maximal value for the reference grid');
    }

    this.tileSize.setWidth(binaryReader.readUint32());
    this.tileSize.setHeight(binaryReader.readUint32());
    if (this.tileSize.getWidth() === 0 || this.tileSize.getHeight() === 0) {
      throw new Error('Reference tile width and height must be above zero');
    }

    this.tileOffset.setX(binaryReader.readUint32());
    this.tileOffset.setY(binaryReader.readUint32());
    if (this.tileOffset.getX() === 0xffffffff || this.tileOffset.getY() === 0xffffffff) {
      throw new Error('Tile offset must be below the maximal value for the tile size');
    }

    this.components = binaryReader.readUint16();
    if (this.components === 0 || this.components > 1 << 14) {
      throw new Error(`Component count out of valid range [${this.components}]`);
    }
    const sizSegmentLength = 38 + this.components * 3;
    if (this.getLength() !== sizSegmentLength) {
      throw new Error(
        `Component count and length of SIZ segment do not agree [Length: ${this.getLength()}, Component count: ${sizSegmentLength}]`
      );
    }

    for (let c = 0; c < this.components; c++) {
      this.precisions.push(binaryReader.readUint8());
      this.subSamplingX.push(binaryReader.readUint8());
      this.subSamplingY.push(binaryReader.readUint8());

      if (this.subSamplingX[c] === 0 || this.subSamplingY[c] === 0) {
        throw new Error('Sub-sampling must be strictly positive');
      }
    }
  }

  /**
   * Gets the segment description.
   * @method
   * @return {string} Segment description.
   */
  toString() {
    return `${super.toString()} [Width: ${this.getWidth(0)}, Height: ${this.getHeight(
      0
    )}, Bit depth: ${this.getBitDepth(0)}, Signed: ${this.isSigned(
      0
    )}, Components: ${this.getComponents()}]`;
  }
}
//#endregion

//#region CapSegment
class CapSegment extends Segment {
  /**
   * Creates an instance of CapSegment.
   * @constructor
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(position, buffer) {
    super(Marker.Cap, position, buffer);

    this.capabilities = 0;
  }

  /**
   * Gets capabilities.
   * @method
   * @returns {number} The capabilities.
   */
  getCapabilities() {
    return this.capabilities;
  }

  /**
   * Parses the segment.
   * @method
   */
  parse() {
    const binaryReader = new BinaryReader(this.getBuffer(), false);

    this.capabilities = binaryReader.readUint32();
    if (this.capabilities & 0xfffdffff) {
      throw new Error('CAP segment has options that are not supported');
    }
    if ((this.capabilities & 0x00020000) === 0) {
      throw new Error(
        'Capabilities should have its 15th MSB set (this is not an HTJ2K codestream)'
      );
    }

    const count = this._populationCount(this.capabilities);
    if (this.getLength() !== 6 + 2 * count) {
      throw new Error(
        `Capabilities count and length of CAP segment do not agree [Length: ${this.getLength()}, Component count: ${
          6 + 2 * count
        }]`
      );
    }
  }

  /**
   * Gets the segment description.
   * @method
   * @return {string} Segment description.
   */
  toString() {
    return `${super.toString()} [Capabilities: ${(this.getCapabilities() >>> 0).toString(2)}]`;
  }

  //#region Private Methods
  /**
   * Counts the numbers of set bits in an integer.
   * @method
   * @private
   * @returns {number} The numbers of set bits in an integer.
   */
  _populationCount(val) {
    val -= (val >> 1) & 0x55555555;
    val = ((val >> 2) & 0x33333333) + (val & 0x33333333);
    val = ((val >> 4) + val) & 0x0f0f0f0f;
    val += val >> 8;
    val += val >> 16;

    return val & 0x0000003f;
  }
  //#endregion
}
//#endregion

//#region CodSegment
class CodSegment extends Segment {
  /**
   * Creates an instance of CodSegment.
   * @constructor
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(position, buffer) {
    super(Marker.Cod, position, buffer);

    this.codingStyle = CodingStyle.None;
    this.progressionOrder = ProgressionOrder.Lrcp;
    this.qualityLayers = 0;
    this.multipleComponentTransform = 0;
    this.decompositionLevels = 0;
    this.codeblockExpnX = 0;
    this.codeblockExpnY = 0;
    this.codeblockStyle = CodeblockStyle.None;
    this.waveletFilter = WaveletTransform.Reversible_5_3;

    // TODO: Getter with zip
    this.precinctSizeX = [];
    this.precinctSizeY = [];
  }

  /**
   * Gets coding style.
   * @method
   * @returns {CodingStyle} The coding style.
   */
  getCodingStyle() {
    return this.codingStyle;
  }

  /**
   * Gets whether precincts are used.
   * @method
   * @returns {boolean} Flag indicating whether precincts are used.
   */
  usePrecincts() {
    return (this.codingStyle & CodingStyle.UsePrecincts) !== 0;
  }

  /**
   * Gets whether sop marker is used.
   * @method
   * @returns {boolean} Flag indicating whether sop marker is used.
   */
  useSopMarker() {
    return (this.codingStyle & CodingStyle.UseSopMarker) !== 0;
  }

  /**
   * Gets whether eph marker is used.
   * @method
   * @returns {boolean} Flag indicating whether eph marker is used.
   */
  useEphMarker() {
    return (this.codingStyle & CodingStyle.UseEphMarker) !== 0;
  }

  /**
   * Gets progression order.
   * @method
   * @returns {ProgressionOrder} The progression order.
   */
  getProgressionOrder() {
    return this.progressionOrder;
  }

  /**
   * Gets whether color transform is employed.
   * @method
   * @returns {boolean} Flag indicating whether color transform is employed.
   */
  isEmployingColorTransform() {
    return this.multipleComponentTransform === 1;
  }

  /**
   * Gets decomposition levels.
   * @method
   * @returns {number} The decomposition levels.
   */
  getDecompositionLevels() {
    return this.decompositionLevels;
  }

  /**
   * Gets codeblock width.
   * @method
   * @returns {number} The codeblock width.
   */
  getCodeblockSize() {
    return new Size(1 << (this.codeblockExpnX + 2), 1 << (this.codeblockExpnY + 2));
  }

  // TODO: get_log_precinct_size, get_precinct_size, packets_may_use_sop, packets_use_eph

  /**
   * Gets codeblock style.
   * @method
   * @returns {CodeblockStyle} The codeblock style.
   */
  getCodeblockStyle() {
    return this.codeblockStyle;
  }

  /**
   * Gets wavelet filter.
   * @method
   * @returns {WaveletTransform} The wavelet filter.
   */
  getWaveletFilter() {
    return this.waveletFilter;
  }

  /**
   * Gets whether the wavelet transform is reversible.
   * @method
   * @returns {boolean} Flag indicating whether the wavelet transform is reversible.
   */
  isReversible() {
    return this.waveletFilter === WaveletTransform.Reversible_5_3;
  }

  /**
   * Parses the segment.
   * @method
   */
  parse() {
    const binaryReader = new BinaryReader(this.getBuffer(), false);

    this.codingStyle = binaryReader.readUint8();
    if (
      this.codingStyle >
      (CodingStyle.UseEphMarker | CodingStyle.UseSopMarker | CodingStyle.UsePrecincts)
    ) {
      throw new Error('Invalid coding style');
    }

    this.progressionOrder = binaryReader.readUint8();

    this.qualityLayers = binaryReader.readUint16();
    if (this.qualityLayers === 0) {
      throw new Error('Quality layers must be positive');
    }

    this.multipleComponentTransform = binaryReader.readUint8();
    if (this.multipleComponentTransform > 1) {
      throw new Error('Multiple component transform must be 0 or 1');
    }

    this.decompositionLevels = binaryReader.readUint8();
    if (this.decompositionLevels > 32) {
      throw new Error('Decomposition levels must be 32 or less');
    }

    this.codeblockExpnX = binaryReader.readUint8();
    this.codeblockExpnY = binaryReader.readUint8();
    if (
      this.codeblockExpnX > 1 << 4 ||
      this.codeblockExpnY > 1 << 4 ||
      this.codeblockExpnX + this.codeblockExpnY > 8
    ) {
      throw new Error(
        'Codeblock width and height must be at most 1K samples ' +
          ' the area of the codeblock should be at most 4K samples'
      );
    }

    this.codeblockStyle = binaryReader.readUint8();
    this.waveletFilter = binaryReader.readUint8();

    const usePrecincts = (this.codingStyle & CodingStyle.UsePrecincts) !== 0;
    if (usePrecincts) {
      const expectedCodSize = 12 + this.decompositionLevels + 1;
      if (this.getLength() != expectedCodSize) {
        throw new Error('Size mismatch in COD marker segment for precinct specs');
      }
    }

    for (let r = 0; r <= this.decompositionLevels; r++) {
      if (usePrecincts) {
        const val = binaryReader.readUint8();
        this.precinctSizeX.push(val & 0xf);
        this.precinctSizeY.push((val >> 4) & 0xf);
      } else {
        this.precinctSizeX.push(0xf);
        this.precinctSizeY.push(0xf);
      }
    }
  }

  /**
   * Gets the segment description.
   * @method
   * @return {string} Segment description.
   */
  toString() {
    return `${super.toString()} [Progression order: ${Object.keys(ProgressionOrder)[
      this.getProgressionOrder()
    ].toUpperCase()}, Decomposition levels: ${this.getDecompositionLevels()}, Reversible: ${this.isReversible()}]`;
  }
}
//#endregion

//#region QcdSegment
class QcdSegment extends Segment {
  /**
   * Creates an instance of QcdSegment.
   * @constructor
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(position, buffer) {
    super(Marker.Qcd, position, buffer);

    this.decompositionLevels = 0;
    this.quantizationStyle = 0;
    this.quantizationStepSize = [];
  }

  /**
   * Gets decomposition levels.
   * @method
   * @returns {number} The decomposition levels.
   */
  getDecompositionLevels() {
    return this.decompositionLevels;
  }

  /**
   * Gets quantization style.
   * @method
   * @returns {number} The quantization style.
   */
  getQuantizationStyle() {
    return this.quantizationStyle;
  }

  /**
   * Gets quantization step size.
   * @method
   * @returns {Array<number>} The quantization step size.
   */
  getQuantizationStepSize() {
    return this.quantizationStyle;
  }

  /**
   * Parses the segment.
   * @method
   */
  parse() {
    const binaryReader = new BinaryReader(this.getBuffer(), false);

    this.quantizationStyle = binaryReader.readUint8();
    if ((this.quantizationStyle & 0x1f) === 0) {
      this.decompositionLevels = (this.getLength() - 4) / 3;
      if (this.getLength() !== 4 + 3 * this.decompositionLevels) {
        throw new Error('Invalid length value in QCD segment');
      }
      for (let i = 0; i < 1 + 3 * this.decompositionLevels; ++i) {
        this.quantizationStepSize.push(binaryReader.readUint8());
      }
    } else if ((this.quantizationStyle & 0x1f) === 1) {
      this.decompositionLevels = 0;
      throw new Error('Scalar derived quantization is not supported yet in QCD segment');
    } else if ((this.quantizationStyle & 0x1f) === 2) {
      this.decompositionLevels = (this.getLength() - 5) / 6;
      if (this.getLength() != 5 + 6 * this.decompositionLevels) {
        throw new Error('Invalid length value in QCD marker');
      }
      for (let i = 0; i < 1 + 3 * this.decompositionLevels; ++i) {
        this.quantizationStepSize.push(binaryReader.readUint16());
      }
    } else {
      throw new Error('Invalid quantization style value in QCD segment');
    }
  }

  /**
   * Gets the segment description.
   * @method
   * @return {string} Segment description.
   */
  toString() {
    return `${super.toString()} [Decomposition levels: ${this.getDecompositionLevels()}, Quantization style: 0x${this.getQuantizationStyle().toString(
      16
    )}]`;
  }
}
//#endregion

//#region SotSegment
class SotSegment extends Segment {
  /**
   * Creates an instance of SotSegment.
   * @constructor
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(position, buffer) {
    super(Marker.Sot, position, buffer);

    this.tileIndex = 0;
    this.tilePartLength = 0;
    this.tilePartIndex = 0;
    this.tilePartCount = 0;
  }

  /**
   * Gets tile index.
   * @method
   * @returns {number} The tile index.
   */
  getTileIndex() {
    return this.tileIndex;
  }

  /**
   * Gets tile part length.
   * @method
   * @returns {number} The tile part length.
   */
  getTilePartLength() {
    return this.tilePartLength;
  }

  /**
   * Gets tile part index.
   * @method
   * @returns {number} The tile part index.
   */
  getTilePartIndex() {
    return this.tilePartIndex;
  }

  /**
   * Gets tile part count.
   * @method
   * @returns {number} The tile part count.
   */
  getTilePartCount() {
    return this.tilePartCount;
  }

  /**
   * Gets the payload length.
   * @method
   * @returns {number} The payload length.
   */
  getPayloadLength() {
    return this.getTilePartLength() > 0 ? this.getTilePartLength() - 14 : 0;
  }

  /**
   * Parses the segment.
   * @method
   */
  parse() {
    const binaryReader = new BinaryReader(this.getBuffer(), false);

    this.tileIndex = binaryReader.readUint16();
    this.tilePartLength = binaryReader.readUint32();
    this.tilePartIndex = binaryReader.readUint8();
    this.tilePartCount = binaryReader.readUint8();
  }

  /**
   * Gets the segment description.
   * @method
   * @return {string} Segment description.
   */
  toString() {
    return `${super.toString()} [Tile index: ${this.getTileIndex()}, Tile part length: ${this.getTilePartLength()}, Tile part index: ${this.getTilePartIndex()}, Tile part count: ${this.getTilePartCount()}]`;
  }
}
//#endregion

//#region ComSegment
class ComSegment extends Segment {
  /**
   * Creates an instance of ComSegment.
   * @constructor
   * @param {number} position - Segment position in codestream.
   * @param {ArrayBuffer} buffer - Segment buffer.
   */
  constructor(position, buffer) {
    super(Marker.Com, position, buffer);

    this.registration = undefined;
    this.comment = undefined;
  }

  /**
   * Gets comment registration.
   * @method
   * @returns {number} Comment registration.
   */
  getRegistration() {
    return this.registration;
  }

  /**
   * Gets comment string.
   * @method
   * @returns {string} Comment string.
   */
  getComment() {
    return this.comment;
  }

  /**
   * Parses the segment.
   * @method
   */
  parse() {
    const binaryReader = new BinaryReader(this.getBuffer(), false);

    this.registration = binaryReader.readUint16();
    if (this.registration === 1 /*LATIN1_REGISTRATION*/) {
      this.comment = binaryReader.readString(this.getLength() - 4);
    }
  }

  /**
   * Gets the segment description.
   * @method
   * @return {string} Segment description.
   */
  toString() {
    return `${super.toString()} [Registration: ${this.getRegistration()}, Comment: ${
      this.getComment() ?? ''
    }]`;
  }
}
//#endregion

//#region Exports
module.exports = {
  Segment,
  SizSegment,
  CapSegment,
  CodSegment,
  QcdSegment,
  ComSegment,
  SotSegment,
};
//#endregion
