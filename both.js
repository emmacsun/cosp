// Import required AWS SDK clients and commands for Node.js.
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "./libs/sampleClient.js";
import * as fs from "fs";

const FILE_TO_UPLOAD = "test.txt";
const FILE_TO_DOWNLOAD = "test2.txt";


// Set the parameters
const paramsUp = {
  Bucket: "mycospbucket", // The name of the bucket. For example, 'sample-bucket-101'.
  Key: "test4.txt", // The name of the object. For example, 'sample_upload.txt'.
  Body: fs.createReadStream(FILE_TO_UPLOAD), // The content of the object. For example, 'Hello world!".
};
// Set the parameters
const paramsDown = {
    Bucket: "mycospbucket", // The name of the bucket. For example, 'sample-bucket-101'.
    Key: FILE_TO_DOWNLOAD, // The name of the object. For example, 'sample_upload.txt'.
  };


const runUp = async () => {
  // Create an Amazon S3 bucket.
  const startTime = performance.now();
  var textUp = "hello"

  // Create an object and upload it to the Amazon S3 bucket.
  try {

    const { size } = fs.statSync(FILE_TO_UPLOAD);
    const results = await s3Client.send(new PutObjectCommand(paramsUp));
    const endTime = performance.now();

    const timeTaken = endTime - startTime

    var textUp = "Successfully created " + paramsUp.Key + " and uploaded it to " + paramsUp.Bucket + "/" + paramsUp.Key +
            "\nLatency: " + (size/1000)/timeTaken + " megabytes/sec" +
            "\nUpload took " + timeTaken + " milliseconds";

    console.log(textUp);

    return results; // For unit tests.
  } catch (err) {
    console.log("Error", err);
  }
};

const runDown = async () => {
    const startTime = performance.now();
    try {
      const localFilePath = './output.dmg';
      const response = await s3Client.send(new GetObjectCommand(paramsDown));
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
          paramsDown.Key +
          " from " +
          paramsDown.Bucket +
          "/" +
          paramsDown.Key
      );
      const endTime = performance.now();
      console.log("Latency: " + (buffer.length/1000)/(endTime - startTime) + " megabytes/sec");
      console.log("Download took " + (endTime - startTime) + " milliseconds");
     
      return response; // For unit tests.
    } catch (err) {
      console.log("Error", err);
    }
  };

runUp();
runDown();
