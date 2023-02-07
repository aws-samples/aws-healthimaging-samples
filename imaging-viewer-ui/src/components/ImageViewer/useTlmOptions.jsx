import { useState, useEffect } from 'react';

// App
import { useLocalStorage } from '../../hooks/useLocalStorage';

export function useTlmOptions(updateConfig) {
    const [levelOptions, setLevelOptions] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [cachedTlmLevel, setCachedTlmLevel] = useLocalStorage('Viewer-TLM-Level', -1);

    let levelsUpdated = false;

    // set initial tlm level if cachedTlmLevel is not -1
    // reset imageLoader TLM level on unload
    useEffect(() => {
        if (cachedTlmLevel !== -1 && typeof parseInt(cachedTlmLevel) === 'number') {
            updateConfig({
                tlmDecodeLevel: parseInt(cachedTlmLevel),
            });
        }
        return () => {
            updateConfig({
                tlmDecodeLevel: -1,
            });
        };
    }, [cachedTlmLevel, updateConfig]);

    // set cached tlm level when selectedLevel changes. if the selected value is the max, set cache value to -1
    useEffect(() => {
        if (!selectedLevel) return;
        if (parseInt(selectedLevel.value) + 1 === levelOptions.length) {
            setCachedTlmLevel(-1);
        } else {
            setCachedTlmLevel(selectedLevel.value);
        }
    }, [levelOptions, selectedLevel, setCachedTlmLevel]);

    /**
     * Update levelOptions from decompositionData from the TLM worker
     * @param {object} decompositionData object with numeric keys and value of { width: #, height: # }
     */
    function updateLevels(decompositionData = {}) {
        if (levelsUpdated) return;

        const parsedOptions = Object.keys(decompositionData).map((k, i) => {
            const resolution = `${decompositionData[k]?.width} x ${decompositionData[k]?.height}`;
            return {
                label: `TLM Level ${k}`,
                value: k,
                labelTag: resolution,
            };
        });

        setLevelOptions(parsedOptions);

        // if cachedTlmLevel is set to -1, select the largest level
        // otherwise, attempt to selectedLevel to the cached one
        if (cachedTlmLevel !== -1) {
            if (cachedTlmLevel < Object.keys(decompositionData).length) {
                setSelectedLevel(parsedOptions.find((o) => o.value === cachedTlmLevel));
            }
        } else {
            setSelectedLevel(parsedOptions[parsedOptions.length - 1]);
        }

        levelsUpdated = true;
    }

    function resetLevels() {
        levelsUpdated = false;
        setLevelOptions([]);
    }

    return {
        levelOptions,
        updateLevels,
        resetLevels,
        selectedLevel,
        setSelectedLevel,
    };
}
