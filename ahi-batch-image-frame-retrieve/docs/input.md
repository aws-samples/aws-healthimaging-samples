# retreival request json

AHIRetrieve takes as input a JSON file which describes the retrieveal request.  This JSON document is a subset of the
AHI ImageSet metadata schema.  AHIRetreieve ignores fields it does not need so you can safely pass the entire AHI ImageSet metadata document.

## Example of the required fields for a single image frame download

```json
{
  "DatastoreID": "169224ef14db49839f628fb887d50291",
  "ImageSetID": "d91be0830da6a8550ddef2491cf1f10b",
  "Study": {
    "Series": {
      "1.2.840.113704.1.111.672.1161866320.1": {
        "Instances": {
          "1.2.840.113704.1.111.2864.1161866350.1420": {
            "ImageFrames": [
              {
                "ID": "7a9d6d62177792250da227bd2815ef7c",
                "FrameSizeInBytes": 524288
              }
            ]
          }
        }
      }
    }
  }
}
```

See a few other examples in the [test folder](../test)

## Input File Parsing

The input file format is described in the [input.ts](../input.ts) file.  [input.h](../include/ahi-retrieve//input.h) is generated using [quicktype](https://quicktype.io/):

```sh
npx quicktype input.ts --lang c++ -o input.h --no-boost
```
