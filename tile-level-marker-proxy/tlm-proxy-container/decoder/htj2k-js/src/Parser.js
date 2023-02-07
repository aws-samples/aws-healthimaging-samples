const FileParser = require('./FileParser')
const log = require('./log');

const ParserState = {
    LIVE: 1, 
    WAITING: 2,
    SUSPENDED: 3,
    CANCELLED: 4
}

//TODO:
// * Get rid of suspended state?
// * Turn this.done into a ParserState
// * Extract the BufferStream code into a separate class (getBufferStream, advancePosition)
// * Cleanup the promise code
// * Add support for rejecting the promise on error

//#region Parser
class Parser {
    /**
     * Creates an instance of a Parser
     * @param {} handler callback handler for the parser
     * @param {*} opts 
     */
    constructor(handler, opts) {
        this.handler = handler
        this.opts = opts || {}

        this.state = ParserState.WAITING
        this.chunks = []
        this.buffer = Buffer.alloc(0)
        this.position = 0
        this.offset = 0 // offset from beginning of HTJ2K code stream
        this.parser = new FileParser()
        this.done = false
        this.promises = []
    }

    /**
     * Returns a promise that resolves once the parsing is complete.  Parsing is complete
     * once the end() or cancel() is called.  
     * 
     * @returns promise
     */
    complete() {
        const promiseWrapper = {}
        promiseWrapper.promise = new Promise((resolve, reject) => {
            promiseWrapper.resolve = resolve
            promiseWrapper.reject = reject
        })
        
        this.promises.push(promiseWrapper)
        return promiseWrapper.promise
    }

    getBufferStream() {
        const bs =  {
            handler: this.handler,
            buffer: this.buffer,
            position: this.position,
            offset: this.offset
        }
        //console.log(bs)
        return bs
    }

    getHandler() {
        return this.handler
    }

    advancePosition(length) {
        //console.log('advancePosition', length)
        this.position += length
    }

    /**
     * Writes a buffer chunk to the parser.  Parsing will resume if it is waiting for data
     * @param {Buffer} chunk 
     */
    write(chunk) {
        log.debug(`Parser.write(${chunk.length})`)

        if(this.state === ParserState.CANCELLED) {
            return false // write has failed
        }

        // save the chunk and create a bigger contiguous buffer
        this.chunks.push(chunk)
        this.buffer = Buffer.concat(this.chunks)

        // resume parsing if we were waiting for more data
        if(this.state === ParserState.WAITING) {
            this.resume()
        }
        return true
    }

    /**
     * Clients should call this after an entire HTJ2K codestream has been passed
     * to the parser via write().
     */
    end() {
        log.debug('Parser.end()')
        this.done = true
        this.promises.forEach((promise) => {
            promise.resolve()
        })
    }

    /**
     * Resumes parsing after suspend() was previously called
     */
    resume() {
        log.debug('Parser.resume()')

        if(this.state === ParserState.CANCELLED) {  
            throw new Error("Parser cannot be resumed since it was previously cancelled")
        }
        this.state = ParserState.LIVE

        // pickup where we were.
        while(this.state === ParserState.LIVE) {
            this.parser = this.parser.parse(this)
        }
    }

    /**
     * Puts the parser in wait mode.  Parsing will continue once new data is passed 
     * via write()
     */
    wait() {
        log.debug('Parser.wait()')

        if(this.state === ParserState.CANCELLED) {
            throw new Error("Parser cannot be suspended since it was previously cancelled")
        }

        this.state = ParserState.WAITING
    }

    /**
     * Suspends the parser.  Data received will be queued.  Call resume() to continue parsing
     */
    suspend() {
        log.debug('Parser.suspend()')
        if(this.opts.trace) {
            console.info('Parser.suspend()')
        }
        if(this.state === ParserState.CANCELLED) {
            throw new Error("Parser cannot be suspended since it was previously cancelled")
        }

        this.state = ParserState.SUSPENDED
    }

    /**
     * Cancels the parser.  No more data will be queued or parser
     */
    cancel() {
        log.debug('Parser.cancel()')
        if(this.state === ParserState.CANCELLED) {
            throw new Error("Parser cannot be cancelled since it was previously cancelled")
        }

        this.state = ParserState.CANCELLED

        this.promises.forEach((promise) => {
            promise.resolve()
        })

    }
}

//#region Exports
module.exports = Parser;
//#endregion
