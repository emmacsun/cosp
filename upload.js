// Import required AWS SDK clients and commands for Node.js.
import { PutObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./libs/sampleClient.js";

import * as fs from "fs";
//const fs = require('fs');

// Set the parameters
const params = {
  Bucket: "mycospbucket", // The name of the bucket. For example, 'sample-bucket-101'.
  Key: "test2.dmg", // The name of the object. For example, 'sample_upload.txt'.
  Body: fs.createReadStream("wecom.dmg"), // The content of the object. For example, 'Hello world!".
};

const run = async () => {
  // Create an Amazon S3 bucket.
  const startTime = performance.now();
//   try {
//     const data = await s3Client.send(
//         new CreateBucketCommand({ Bucket: params.Bucket })
//     );
//     console.log(data);
//     console.log("Successfully created a bucket called ", data.Location);
//     return data; // For unit tests.
//   } catch (err) {
//     console.log("Error", err);
//   }

  // Create an object and upload it to the Amazon S3 bucket.
  try {
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
    console.log("Request took", endTime - startTime, "milliseconds");
    return results; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
};
run();
