import { useState } from 'react';

import { DATA_STORE_ID_REGEX, IMAGESET_ID_REGEX } from '../consts/apiRegex';

export function useDataStoreImageSetInput({ initSelectedDatastore = null, initImageSetId = '' } = {}) {
    const [errorText, setErrorText] = useState('');
    const [selectedDatastore, setSelectedDatastore] = useState(initSelectedDatastore || null); // selected datastore OBJECT from <Select />
    const [imageSetId, setImageSetId] = useState(initImageSetId || ''); // ImageSet ID

    // Verify string against regex. Set error text and return false if the test fails
    function verifyInput(id, regex, string) {
        if (!regex.test(string)) {
            setErrorText(`${id} must match ${regex}.`);
            return false;
        }
        return true;
    }

    function verifyDatastoreId(oDatastoreId) {
        const testDatastoreId = oDatastoreId ? oDatastoreId : selectedDatastore?.value;
        return verifyInput('Datastore ID', DATA_STORE_ID_REGEX, testDatastoreId);
    }

    function verifyImageSetId(oImageSetId) {
        const testImageSetId = oImageSetId ? oImageSetId : imageSetId;
        return verifyInput('ImageSet ID', IMAGESET_ID_REGEX, testImageSetId);
    }

    return {
        errorText,
        setErrorText,
        selectedDatastore,
        setSelectedDatastore,
        verifyDatastoreId,
        imageSetId,
        setImageSetId,
        verifyImageSetId,
    };
}
