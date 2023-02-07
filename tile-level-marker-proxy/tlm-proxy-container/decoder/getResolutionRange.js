// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const Parser = require('./htj2k-js/src/Parser');
const ParserWriter = require('./htj2k-js/src/ParserWriter');

const getStartPosition = (bufferStream, sotSegments, startResolution) => {
    if (startResolution === 0 || startResolution === undefined) {
        return 0;
    }
    if (startResolution >= sotSegments.length) {
        return bufferStream.buffer.length;
    }
    return sotSegments[startResolution].position;
};

const getEndPosition = (bufferStream, sotSegments, endResolution) => {
    if (endResolution === undefined) {
        return bufferStream.buffer.length;
    }
    if (endResolution >= sotSegments.length) {
        return bufferStream.buffer.length;
    }
    return sotSegments[endResolution].position + sotSegments[endResolution].tilePartLength;
};

const createResponse = (bufferStream, sotSegments, startResolution, endResolution, returnAllSegements) => {
    if (returnAllSegements) {
        return sotSegments.map((s) => {
            let startPosition = getStartPosition(bufferStream, sotSegments, s.tilePartIndex);
            let endPosition = getEndPosition(bufferStream, sotSegments, s.tilePartIndex);
            return bufferStream.buffer.slice(startPosition, endPosition);
        });
    } else {
        let startPosition = getStartPosition(bufferStream, sotSegments, startResolution);
        let endPosition = getEndPosition(bufferStream, sotSegments, endResolution);
        return bufferStream.buffer.slice(startPosition, endPosition);
    }
};

const getResolutionRange = async (
    readable,
    startResolution,
    endResolution,
    returnAllSegements = false,
    replyWithFirstLevel = null
) => {
    let parser = undefined;

    let sotSegments = [];

    const segment = (segment) => {
        //console.log(segment)
        if (segment.markerName === 'Sot') {
            if (replyWithFirstLevel != null && sotSegments.length === 0) {
                const bufferStream = parser.getBufferStream();
                const startPosition = getStartPosition(bufferStream, [segment], 0);
                const endPosition = getEndPosition(bufferStream, [segment], 0);
                replyWithFirstLevel.reply.type('application/octet-stream');
                replyWithFirstLevel.reply.code(200).send(bufferStream.buffer.slice(startPosition, endPosition));
            }
            sotSegments.push(segment);
        }

        // cancel the parsing once we have the data we need so we don't
        // waste resources
        // if returnAllSegements is true, continue until the end
        if (endResolution !== undefined && !returnAllSegements) {
            if (sotSegments.length > endResolution) {
                parser.cancel();
                // console.log(parser)
            }
        }
    };

    const handler = { segment };
    parser = new Parser(handler, { trace: true });
    const parserWriter = new ParserWriter(parser);

    // This is called when the parser is cancelled due to early termination
    // TODO: Add logic to detect errors due to early termination/cancelling vs
    //       other error types
    parserWriter.on('error', (err) => {
        //console.log('ERR CAUGHT:', err)
    });

    readable.pipe(parserWriter);

    await parser.complete();

    const bufferStream = parser.getBufferStream();

    return createResponse(bufferStream, sotSegments, startResolution, endResolution, returnAllSegements);
};

module.exports = getResolutionRange;
