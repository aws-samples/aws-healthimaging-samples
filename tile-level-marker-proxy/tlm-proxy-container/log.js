const log = require('loglevel');
const prefix = require('loglevel-plugin-prefix');

prefix.reg(log);

// return a log object with logName, log level
function logger(logName = '', logLevel = process.env.DEFAULT_LOG_LEVEL || 'trace') {
    const namedLog = log.getLogger(logName);
    namedLog.enableAll(false);
    namedLog.setLevel(logLevel);
    prefix.apply(namedLog, {
        format(level, name, timestamp) {
            return `${timestamp} -- ${level.toUpperCase()} -- ${name} --`;
        },
    });

    return namedLog;
}

module.exports = logger;
