//#region J2kFormat
/**
 * Jpeg2000 format.
 * @constant {Object}
 */
const J2kFormat = {
  Unknown: 0,
  RawCodestream: 1,
  CodestreamInBox: 2,
};
Object.freeze(J2kFormat);
//#endregion

//#region BoxType
/**
 * Jpeg2000 box types.
 * @constant {Object}
 */
const BoxType = {
  Undefined: 0x0,
  Jp2SignatureBox: 0x6a502020,

  FileTypeBox: 0x66747970,
  JP2HeaderBox: 0x6a703268,
  ImageHeaderBox: 0x69686472,
  BitsPerCompBox: 0x62706363,
  ColorSpecBox: 0x636f6c72,
  PaletteBox: 0x70636c72,
  CompMapBox: 0x636d6170,
  ChannelDefBox: 0x63646566,
  ResolutionBox: 0x72657320,
  CaptureResBox: 0x72657363,
  DisplayResBox: 0x72657364,
  CodestreamBox: 0x6a703263,
  IntellectPropRightsBox: 0x6a703269,
  XmlBox: 0x786d6c20,
  UuidBox: 0x75756964,
  UuidInfoBox: 0x75696e66,
  UuidListBox: 0x75637374,
  UrlBox: 0x75726c20,
};
Object.freeze(BoxType);
//#endregion

//#region Marker
/**
 * Jpeg2000 markers.
 * @constant {Object}
 */
const Marker = {
  Soc: 0x4f, // Start of codestream (required)
  Cap: 0x50, // Extended capability
  Siz: 0x51, // Image and tile size (required)
  Cod: 0x52, // Coding style default (required)
  Tlm: 0x55, // Tile-part lengths
  Prf: 0x56, // Profile
  Plm: 0x57, // Packet length, main header
  Plt: 0x58, // Packet length, tile-part header
  Cpf: 0x59, // Corresponding profile values
  Qcd: 0x5c, // Quantization default (required)
  Qcc: 0x5d, // Quantization component
  Com: 0x64, // Comment
  Sot: 0x90, // Start of tile-part
  Sop: 0x91, // Start of packet
  Eph: 0x92, // End of packet
  Sod: 0x93, // Start of data
  Eoc: 0xd9, // End of codestream (required)

  Coc: 0x53, // Coding style component
  Rgn: 0x5e, // Region of interest
  Poc: 0x5f, // Progression order change
  Ppm: 0x60, // Packed packet headers, main header
  Ppt: 0x61, // Packed packet headers, tile-part header
  Crg: 0x63, // Component registration
};
Object.freeze(Marker);
//#endregion

//#region ProgressionOrder
/**
 * Progression orders.
 * @constant {Object}
 */
const ProgressionOrder = {
  // Layer-resolution level-component-position progression
  Lrcp: 0,
  /// Resolution level-layer-component-position progression
  Rlcp: 1,
  // Resolution level-position-component-layer progression
  Rpcl: 2,
  ///Position-component-resolution level-layer progression
  Pcrl: 3,
  // Component-position-resolution level-layer progression
  Cprl: 4,
};
Object.freeze(ProgressionOrder);
//#endregion

//#region CodingStyle
/**
 * Coding styles.
 * @constant {Object}
 */
const CodingStyle = {
  None: 0,
  UsePrecincts: 1,
  UseSopMarker: 2,
  UseEphMarker: 4,
};
Object.freeze(CodingStyle);
//#endregion

//#region CodeblockStyle
/**
 * Codeblock styles.
 * @constant {Object}
 */
const CodeblockStyle = {
  None: 0,
  SelectiveArithmeticCodingBypass: 1,
  ResetContextProbabilitiesOnCodingPassBoundaries: 2,
  TerminateOnEachCodingPass: 4,
  VerticalCausalContext: 8,
  PredictableTermination: 16,
  SegmentationSymbols: 32,
};
Object.freeze(CodeblockStyle);
//#endregion

//#region WaveletTransform
/**
 * Wavelet transforms.
 * @constant {Object}
 */
const WaveletTransform = {
  Irreversible_9_7: 0,
  Reversible_5_3: 1,
};
Object.freeze(WaveletTransform);
//#endregion

//#region Exports
module.exports = {
  BoxType,
  J2kFormat,
  Marker,
  ProgressionOrder,
  CodingStyle,
  CodeblockStyle,
  WaveletTransform,
};
//#endregion
