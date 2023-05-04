// convert array of objects with key/value keys into an object of key/value pairs
export function keyValueToObj(keyValueArray) {
    return keyValueArray.reduce((obj, item) => Object.assign(obj, { [item.key]: item.value }), {});
}
