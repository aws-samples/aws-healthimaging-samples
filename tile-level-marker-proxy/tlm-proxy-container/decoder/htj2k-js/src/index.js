const Codestream = require('./Codestream');
const Decoder = require('./Decoder');
const {
  Segment,
  SizSegment,
  CapSegment,
  CodSegment,
  QcdSegment,
  ComSegment,
  SotSegment,
} = require('./Segment');
const { Box, BoxReader } = require('./Box');
const {
  J2kFormat,
  Marker,
  ProgressionOrder,
  CodingStyle,
  CodeblockStyle,
  WaveletTransform,
} = require('./Constants');
const Tile = require('./Tile');
const { Point, Size } = require('./Helpers');
const log = require('./log');
const version = require('./version');

//#region helpers
const helpers = {
  Point,
  Size,
};
//#endregion

//#region segments
const segments = {
  Segment,
  SizSegment,
  CapSegment,
  CodSegment,
  QcdSegment,
  ComSegment,
  SotSegment,
};
//#endregion

//#region boxes
const boxes = {
  Box,
  BoxReader,
};
//#endregion

//#region constants
const constants = {
  J2kFormat,
  Marker,
  ProgressionOrder,
  CodingStyle,
  CodeblockStyle,
  WaveletTransform,
};
//#endregion

const HtJ2kJs = {
  Decoder,
  Codestream,
  Tile,
  boxes,
  segments,
  helpers,
  constants,
  log,
  version,
};

//#region Exports
module.exports = HtJ2kJs;
//#endregion
