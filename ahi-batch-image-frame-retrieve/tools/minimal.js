const fs = require('fs')

if(process.argv.length < 3) {
    console.log("must provide input filename as command line argument")
    process.exit(1)
}

const fileName = process.argv[2]


// CLI tool to minimize ImageSet metadata down to just the fields needed by ahi-batch-image-frame-retrieve

const text = fs.readFileSync(fileName, "utf8")

//console.log(text)

imageSetMetaData = JSON.parse(text)

const minimal = {
    DatastoreID: imageSetMetaData.DatastoreID,
	ImageSetID: imageSetMetaData.ImageSetID,
    Study: {
        Series: {}
    }
}

for (const [key, value] of Object.entries(imageSetMetaData.Study.Series)) {
    const instances = {}
    for (const [ikey, ivalue] of Object.entries(imageSetMetaData.Study.Series[key].Instances)) {
        const instance = imageSetMetaData.Study.Series[key].Instances[ikey]
        
        instances[ikey] = {
            ImageFrames: []
        }

        for(i=0;i < instance.ImageFrames.length; i++) {
            instances[ikey].ImageFrames.push(            {
                ID: instance.ImageFrames[i].ID,
                FrameSizeInBytes: instance.ImageFrames[i].FrameSizeInBytes
            })
        }
    }
    minimal.Study.Series[key] = {
        Instances: instances
    }
}



console.log(JSON.stringify(minimal, undefined, 2))