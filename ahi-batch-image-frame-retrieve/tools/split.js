const fs = require('fs')

if(process.argv.length < 4) {
    console.log("must provide input filename and number of splits as command line arguments")
    process.exit(1)
}

const fileName = process.argv[2]
const splitCount = parseInt(process.argv[3])

console.log('fileName=', fileName)
console.log("splitCount=", splitCount)

// CLI tool to minimize ImageSet metadata down to just the fields needed by ahi-batch-image-frame-retrieve

const text = fs.readFileSync(fileName, "utf8")

//console.log(text)

imageSetMetaData = JSON.parse(text)

const splits = []
for(i =0; i < splitCount; i++) {
    splits.push({
        DatastoreID: imageSetMetaData.DatastoreID,
        ImageSetID: imageSetMetaData.ImageSetID,
        Study: {
            Series: {}
        }
    })
}

let imageFrameCount = 0

let seriesUID = ''

function addImageframe(instanceUID, instance, imageFrameNumber) {
    let splitNum = imageFrameCount % splitCount
    const split = splits[splitNum]
    //console.log(JSON.stringify(split, undefined, 2))
    if(!split.Study.Series[seriesUID].Instances[instanceUID]) {
        split.Study.Series[seriesUID].Instances[instanceUID] = {
            ImageFrames: []
        }
    }
    split.Study.Series[seriesUID].Instances[instanceUID].ImageFrames.push(instance.ImageFrames[imageFrameNumber])
    imageFrameCount++
}


for (const [key, value] of Object.entries(imageSetMetaData.Study.Series)) {
    seriesUID = key
    console.log('seriesUID=', key)
    for(i =0; i < splitCount; i++) {
        splits[i].Study.Series[seriesUID] = {
            Instances: {
            }
        }
    }
    for (const [ikey, ivalue] of Object.entries(imageSetMetaData.Study.Series[key].Instances)) {
        const instance = imageSetMetaData.Study.Series[key].Instances[ikey]

        for(i=0;i < instance.ImageFrames.length; i++) {
            addImageframe(ikey, instance, i)
        }
    }
}

for(i =0; i < splitCount; i++) {
    fs.writeFileSync(fileName + "-" + i + ".json", JSON.stringify(splits[i], undefined, 2))
}


