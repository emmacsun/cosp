// Import required AWS SDK clients and commands for Node.js.
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./libs/sampleClient.js";
import * as fs from "fs";

// Set the parameters
const params = {
  Bucket: "mycospbucket", // The name of the bucket. For example, 'sample-bucket-101'.
  Key: "test2.txt", // The name of the object. For example, 'sample_upload.txt'.
};

const run = async () => {
  const startTime = performance.now();
  try {
    const localFilePath = './output.txt';
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
    console.log("Latency:", (buffer.length/1000)/(endTime - startTime), "megabytes/sec");
    console.log("Download took", endTime - startTime, "milliseconds");
   
    return response; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
};
run();
