interface Input {
    DatastoreID: string;
    ImageSetID: string;
    Study: {
        Series: {
            [index: string] : {
                Instances: {
                    [index: string]: {
                        ImageFrames: [
                            {
                                ID: string,
                                FrameSizeInBytes: number
                            }
                        ]
                    }
                }
            }
        }
    };
}