const CodestreamParser = require('./CodestreamParser');
const log = require('./log');

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
  

class BoxParser {

    constructor() {
        this.lastBoxFound = false
    }

    parse(parser) {
        log.debug('BoxParser.parse()')

        // Read length of box
        const bufferStream = parser.getBufferStream()
        if(4 > bufferStream.buffer.length - bufferStream.position) {
            parser.wait()
            return this
        }
        let length = bufferStream.buffer.readUIntBE(bufferStream.position, 4)

        if(length === 0) {
            length = 4
        }

        // box of length 1 is an extended length box
        if(length === 1) {
            throw new Error("Extended length boxes are not supported")
        }

        // make sure there is enough bytes for this box
        if(length > bufferStream.buffer.length - bufferStream.position ) {
            parser.wait()
            return this
        }

        // read the box type
        let type = bufferStream.buffer.readUIntBE(bufferStream.position + 4, 4)
        
        //console.log("BoxType = ", type)
        Object.entries(BoxType).map((item) => {
            if(item[1] === type) {
                log.debug(`BoxType: ${item[0]} Length: ${length}`)
            }
        })

        parser.advancePosition(length)

        if(type === BoxType.CodestreamBox) {
            parser.advancePosition(4) // TODO - figure out what this is..
            return new CodestreamParser()
        }

        return this
    }
}

module.exports = BoxParser