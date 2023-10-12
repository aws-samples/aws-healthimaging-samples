import log from 'loglevel';
import prefix from 'loglevel-plugin-prefix';

prefix.reg(log);

// return a log object with logName, log level
export default function logger(logName = '', logLevel = process.env.PROXY_LOG_LEVEL || 'warn') {
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
