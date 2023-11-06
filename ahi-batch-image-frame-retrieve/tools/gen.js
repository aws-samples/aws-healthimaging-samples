const fs = require('fs')

const output = {
    DatastoreID: "169224ef14db49839f628fb887d50291",
    ImageSetID: "d91be0830da6a8550ddef2491cf1f10b",
    Study: {
        Series: {
            "1.2.840.113704.1.111.672.1161866320.1": {
                Instances: {
                }
            }
        }
    }
}

//console.log(JSON.stringify(output))

for(i=0; i < 512; i++) {
    const uid = "" + (i + 1)
    output.Study.Series['1.2.840.113704.1.111.672.1161866320.1'].Instances[uid] = {
        ImageFrames: [
            {
                "ID": "7a9d6d62177792250da227bd2815ef7c",
                "FrameSizeInBytes": 524288
            }
        ]
    }
}


console.log(JSON.stringify(output, null, " "))

  