function iOS() {
    return (
        ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
            navigator.platform
        ) ||
        // iPad on iOS 13 detection
        (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
    );
}

function getNumWorkers() {
    let numWorkers = 1;
    if (window.navigator.hardwareConcurrency) {
        numWorkers = window.navigator.hardwareConcurrency <= 0 ? 1 : window.navigator.hardwareConcurrency;
        // more than 14 crash chromium on linux at least
        if (numWorkers > 14) {
            numWorkers = 14;
        }
    } else {
        // safari does not support navigator.hardwareConcurrency, use the default upper
        // limits depending on whether this is iOS or Mac OS X
        if (iOS()) {
            numWorkers = 1;
        } else {
            numWorkers = 8;
        }
    }
    return numWorkers;
}

export default getNumWorkers;
