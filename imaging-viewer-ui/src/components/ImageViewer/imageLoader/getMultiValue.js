const getMultiValue = (attr) => {
    if (!attr) {
        return undefined;
    }
    if (Array.isArray(attr)) {
        return parseFloat(attr[0]);
    }
    return parseFloat(attr);
};

export default getMultiValue;
