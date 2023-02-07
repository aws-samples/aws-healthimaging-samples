const log = require('./log');

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

class SegmentParser {
    parse(parser) {
        log.debug('SegmentParser.parse()');

        const bufferStream = parser.getBufferStream();

        // must have at least two bytes
        if (2 > bufferStream.buffer.length - bufferStream.position) {
            return;
        }

        let m1 = bufferStream.buffer.readUint8(bufferStream.position);
        if (m1 !== 0xff) {
            return;
        }
        let m2 = bufferStream.buffer.readUint8(bufferStream.position + 1);
        let marker = (m1 << 8) | m2;
        marker &= 0xff;

        let length =
            marker !== Marker.Soc && marker !== Marker.Sod && marker !== Marker.Eoc && (marker < 0xd0 || marker > 0xd8)
                ? bufferStream.buffer.readUint16BE(bufferStream.position + 2)
                : 0;

        const markerName = Object.entries(Marker).find((item) => {
            if (item[1] === marker) {
                return item[0];
            }
        });

        if (!markerName) {
            // TODO error?
            return;
        }

        if (marker !== Marker.Sot) {
            if (bufferStream.position + length + 2 > bufferStream.buffer.length) {
                return;
            }
            parser.advancePosition(length + 2);
            return {
                position: bufferStream.position, // position of the marker (0xff)
                markerName: markerName ? markerName[0] : '',
                marker,
                length,
            };
        } else {
            if (bufferStream.position + 12 > bufferStream.buffer.length) {
                return;
            }

            const tileIndex = bufferStream.buffer.readUint16BE(bufferStream.position + 4);
            const tilePartLength = bufferStream.buffer.readUint32BE(bufferStream.position + 4 + 2);
            const tilePartIndex = bufferStream.buffer.readUint8(bufferStream.position + 4 + 6);
            const tilePartCount = bufferStream.buffer.readUint8(bufferStream.position + 4 + 7);

            if (bufferStream.position + tilePartLength > bufferStream.buffer.length) {
                return;
            }

            parser.advancePosition(tilePartLength);

            return {
                position: bufferStream.position, // position of the marker (0xff)
                markerName: markerName ? markerName[0] : '',
                marker,
                length,
                tileIndex,
                tilePartLength,
                tilePartIndex,
                tilePartCount,
            };
        }
    }
}

module.exports = SegmentParser;
