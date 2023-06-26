// Import required AWS SDK clients and commands for Node.js.
import { PutObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./libs/sampleClient.js";

import * as fs from "fs";

const FILE_TO_UPLOAD = "wecom.dmg";

// Set the parameters
const params = {
  Bucket: "mycospbucket", // The name of the bucket. For example, 'sample-bucket-101'.
  Key: "test3.txt", // The name of the object. For example, 'sample_upload.txt'.
  Body: fs.createReadStream(FILE_TO_UPLOAD), // The content of the object. For example, 'Hello world!".
};
//printStatements = "";

const run = async () => {
  // Create an Amazon S3 bucket.
  const startTime = performance.now();

  // Create an object and upload it to the Amazon S3 bucket.
  try {

    const { size } = fs.statSync(FILE_TO_UPLOAD);
    const results = await s3Client.send(new PutObjectCommand(params));
    console.log(
        "Successfully created " +
        params.Key +
        " and uploaded it to " +
        params.Bucket +
        "/" +
        params.Key
    );
    const endTime = performance.now();
    console.log("Latency: " + (size/1000)/(endTime - startTime) + " megabytes/sec")
    console.log("Upload took " + (endTime - startTime) + " milliseconds");
    return results; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
};
run();

// module.exports = { printStatements };