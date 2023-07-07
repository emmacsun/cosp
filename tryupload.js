AWS.config.update({
  accessKeyId: "ASIASA4VTLYRIJ4UE7UR",
  secretAccessKey: "Y7IwfyXX/kzUmy764woqodksmO/3FVt+HdeF1WoG"
}); 

//for simplicity. In prod, use loadConfigFromFile, or env variables, or if logged in using 

var s3 = new AWS.S3({ region: "us-west-2" }); //region can be set in here

// var params = {
//   Bucket: "mycospbucket", 
//   Key: "july5.txt", 
//   Body: "file_content",
// };

// ------------------------------------------------------------------------------------------

const FILE_TO_UPLOAD = "test.txt";

let myVariable;

function setValue() {
  const inputField = document.getElementById('inputField');
  myVariable = inputField.value;
  console.log('myVariable:', myVariable);
  const resultParagraph = document.getElementById('result');
  resultParagraph.textContent = 'Result: ' + myVariable;
}

let file_content;
let file_size;

function readFile(input) {
    return new Promise((resolve, reject) => {
      const file = input.files[0];
      const reader = new FileReader();
  
      // Handle FileReader load event
      reader.onload = (event) => {
        const { result } = event.target;
        file_content = result;
        file_size = file.size;
        console.log(file_content);
        const resultParagraph = document.getElementById('result2');
        resultParagraph.textContent = 'Hello ' + file_content;
        resolve();
      };
  
      // Handle FileReader error event
      reader.onerror = reject;
  
      // Read the file as text
      reader.readAsText(file);
    });
  }

const upload = new AWS.S3.ManagedUpload({
    params: {
        Bucket: "mycospbucket", // The name of the bucket. For example, 'sample-bucket-101'.
        Key: "july5.txt", // The name of the object. For example, 'sample_upload.txt'.
        Body: 'file_content',
    }
  });

const run = async (size2) => {
    const startTime = performance.now();
  
    try {  
  
      const promise = upload.send();
  
      // const data = await promise.promise();
  
      console.log("Successfully uploaded file.");
      const endTime = performance.now();
      console.log("Latency: " + (size2 / 1000) / (endTime - startTime) + " megabytes/sec");
      console.log("Upload took " + (endTime - startTime) + " milliseconds");
      const resultParagraph = document.getElementById('result3');
      // resultParagraph.textContent = "Latency: " + (file_size / 1000) / (endTime - startTime) + " megabytes/sec";
      resultParagraph.textContent = "Size: " + size2;
      console.log("size: " + size2);
      const resultParagraph2 = document.getElementById('result4');
      resultParagraph2.textContent = "Upload took " + (endTime - startTime) + " milliseconds";
  
      return data; // For unit tests.
    } catch (err) {
      console.log("Error", err);
    }
  };
