import { useState } from 'react';

function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function load(key) {
    // returns null if key is not present
    const value = localStorage.getItem(key);
    try {
        return value && JSON.parse(value);
    } catch (e) {
        return undefined;
    }
}

/**
 * Use Amplify's Cache module for local storage
 * Usage:
 * const [value, setValue] = useCache(key, 'defaultValue');
 */
export function useLocalStorage(key, defaultValue) {
    const [value, setValue] = useState(() => load(key) ?? defaultValue);

    function handleValueChange(newValue) {
        setValue(newValue);
        save(key, newValue);
    }

    return [value, handleValueChange];
}
