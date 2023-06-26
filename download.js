// Import required AWS SDK clients and commands for Node.js.
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./libs/sampleClient.js";
import * as fs from "fs";

// Set the parameters
const params = {
  Bucket: "mycospbucket", // The name of the bucket. For example, 'sample-bucket-101'.
  Key: "test2.dmg", // The name of the object. For example, 'sample_upload.txt'.
};

const run = async () => {
  const startTime = performance.now();
  try {
    const localFilePath = './output.dmg';
    const response = await s3Client.send(new GetObjectCommand(params));
    const buffer = Buffer.from(await response.Body.transformToByteArray());
    fs.writeFile(localFilePath, buffer, (err) => {
        if (err) {
            console.error("Error writing file:", err);
        } else {
            console.log("File written successfully.")
        }
    })

    console.log(
        "Successfully downloaded " +
        params.Key +
        " from " +
        params.Bucket +
        "/" +
        params.Key
    );
    const endTime = performance.now();
    //console.log(buffer.length);
    console.log("Latency:", buffer.length/(endTime - startTime) / 1000, "megabytes/sec");
    console.log("Download took", endTime - startTime, "milliseconds");
    // fs.stat(buffer, (err, stats) => {
    //     if (err) {
    //         console.error("Error getting size:", err);
    //     } else {
    //         const fileSize = stats.size;
    //         console.log(fileSize);
            
    //         console.log("Latency:", fileSize/(endTime - startTime));
        
    //     }
    // })
    return response; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
};
run();
