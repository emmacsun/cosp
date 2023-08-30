const CHUNKSIZE = 10000000-1        // 10MB
const FILESIZE = 100000000          // 100 MB
const NUM_TO_RUN = 5

// aws
const BUCKETBASE = "mycospbucket";
const REGIONS = ["us-west-1", "us-east-1", "eu-west-3", "ap-northeast-1"]; 
const AWS_LOC = ["San Francisco", "Virginia", "Paris", "Tokyo"]
const AWS_LOC_COORDS = [[37.773972, -122.431297],[37.926868, -78.024902],[48.858093, 2.294694],[35.652832, 139.839478]] // [lat, lng]

// cos
const BUCKETNAMES_COS = ["mycospbucket-1312549385", "mycospbucketgz-1312549385"];
const BUCKETURLS_COS = ['https://mycospbucket-1312549385.cos.na-siliconvalley.myqcloud.com','https://mycospbucketgz-1312549385.cos.ap-guangzhou.myqcloud.com'];
const REGIONS_COS = ["na-siliconvalley", "ap-guangzhou"];
const ENDPOINTS = ["cos.na-siliconvalley.myqcloud.com", "cos.ap-guangzhou.myqcloud.com"]
const COS_LOC= ["San Francisco", "Guangzhou"]
const COS_LOC_COORDS = [[37.773972, -122.431297],[23.128994, 113.253250]]

// general
var isp;
var city;
var state;
var country;
var longitude;
var latitude;
var myCSV = [["Ref Num","Provider","Endpoint","Location","Distance (1000s km)","Latency (ms)","Upload Speed (MB/s)","Download Speed (MB/s)"]];



// RUN TESTS ------------------------------------------------------------------------------------------------------------------------------]

// fills in latencies in table and myCSV
async function doLatencies() {
  for (var i = 0; i < REGIONS.length + REGIONS_COS.length; i++) {
    updateCell(i+1,4,"working...");

    provider = myCSV[i + 1][1];
    referenceNumber = myCSV[i + 1][0];
    var l;

    if (provider == "aws s3") {
        l = await measureNetworkLatency(getURLfromRegion(referenceNumber))
    }
    else {
        l = await measureNetworkLatency(BUCKETURLS_COS[referenceNumber]);
    }
    updateCell(i+1,4,l.toFixed(1));
    myCSV[i+1].push(l)
    console.log(getURLfromRegion(referenceNumber))

  }
  return 0;
}


/*
UTIL: performs download from prepared bucket, returns mb/s
----------------------------------------------------------
- pass in bucket name and corresponding s3
- factor is a calculated value based on latency to adjust number of bytes requested
*/
async function download(bucketname, s3, factor) {
  const timeStart = performance.now();
  let byteStart = 0;
  var promises = [];
  const sizef = FILESIZE * factor
  // console.log(bucketname);

  while (byteStart < sizef) {
    const byteRange = `bytes=${byteStart}-${byteStart + CHUNKSIZE}`;
    const params = {
      Bucket: bucketname,
      Key: '1GB.bin',
      Range: byteRange,
    };

    promises.push(
      (async () => {
        const startTime = performance.now();

        try {
          const response = await s3.getObject(params).promise();
          const waitingTime = performance.now() - startTime;
          // console.log("Waiting for server response time:", waitingTime, "ms");
        } catch (error) {
          console.error("Error making AWS request:", error);
        }
      })()
    );

    byteStart += CHUNKSIZE + 1;
    console.log("Progress:", byteStart, "bytes");
  }

  await Promise.all(promises);

  const timeTotal = performance.now() - timeStart; // in milliseconds
  console.log("Total time:", timeTotal, "ms");
  console.log("mb uploaded:", sizef * .000001)
  return (sizef / (timeTotal)) * 0.001;
}
  
/*
UTIL: performs upload to prepared bucket, returns mb/s
------------------------------------------------------
- pass in bucket name and corresponding s3
- factor is a calculated value based on latency to adjust number of bytes requested
*/
async function upload(bucketname, s3, factor) {
  const buffer = new TextEncoder().encode("x".repeat(Math.round(FILESIZE * factor)));
  const multipartUp = await s3.createMultipartUpload({
    Bucket: bucketname,
    Key: "multi.txt"
  }).promise();

  const uploadPromises = [];
  const numParts = FILESIZE * factor/ (CHUNKSIZE + 1);

  const timeStart = performance.now();
  var j;
  for (let i = 0; i < numParts; i++) {
    
    const start = i * CHUNKSIZE;
    const end = start + CHUNKSIZE;
    const chunk = buffer.slice(start, end);
    uploadPromises.push(
      s3.uploadPart({
        Bucket: bucketname,
        Key: "multi.txt",
        UploadId: multipartUp.UploadId,
        Body: chunk,
        PartNumber: i + 1,
      }).promise().then((d) => {
        const endTime = performance.now();
        console.log("Part", i + 1, "uploaded. Waiting for server response time:", endTime - timeStart, "ms");
        j = i
        return d;
      })
    );
  }
  const uploadResults = await Promise.all(uploadPromises);
  const completeResult = await s3.completeMultipartUpload({
    Bucket: bucketname,
    Key: "multi.txt",
    UploadId: multipartUp.UploadId,
    MultipartUpload: {
      Parts: uploadResults.map(({ ETag }, i) => ({
        ETag,
        PartNumber: i + 1,
      })),
    },
  }).promise();

  const timeTotal = performance.now() - timeStart;
  console.log("Total time:", timeTotal, "ms");

  return FILESIZE * factor/timeTotal * .001;
}

/*
UTIL: returns average latency by running numSamples times and removing outliers
-------------------------------------------------------------------------------
- must convert endpoint to url first
*/
async function measureNetworkLatency(url, numSamples = 20) { 
  let latencies = [];
  for (let i = 0; i < numSamples; i++) {
      const startTime = performance.now();
      await fetch(url, { method: 'HEAD' });
      const latency = performance.now() - startTime;
      const index = latencies.findIndex(element => element > latency);
      latencies.splice(index, 0, latency);
  }

  latencies = latencies.slice(3, -3); // removes 3 lowest/highest values from data set
  var sum = latencies.reduce((accumulator, currentValue) => {
      return accumulator + currentValue
    },0);

  return sum/latencies.length;
}

/*
CRED: aws permissions through Cognito
-------------------------------------
- temp, keeps access keys private
*/
function configAWS() {
  AWS.config = new AWS.Config();
  var creds = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: "us-west-1:6321bb40-bc6d-4e32-adcc-08a028eba4d4"
  })
  AWS.config.update({
      region: 'us-west-1',
      credentials: creds,
  })
  
  return new AWS.S3({ region: "us-west-1" });
}

/*
CRED: aws permissions through access keys
-----------------------------------------
- role is limited to cosp buckets
*/
function configCOS(region, endpoint) {
  AWS.config = new AWS.Config();
  AWS.config.update({
      accessKeyId: 'AKIDuvzviLoGmGYi4NYXLxYnuvjJfswnRtAS',
      secretAccessKey: 'IJKL8sSt660nKchaEc6NWR3eIrbBg8Ui',
      region: region,
      endpoint: endpoint
  })

  return new AWS.S3({ region: "us-west-1" });
}


/*
UTIL HELPERS ---------------------------------------------------------------------------------------------------------------------------]
*/

// aws url endpoint for latency
function getURLfromRegion(index) {
    return 'https://mycospbucket' + REGIONS[index] + '.s3.amazonaws.com/small.txt';
}

// aws bucket name for upload/download
function getBucketnameFromRegionAWS(myregion) {
  return BUCKETBASE + myregion;
}

// ISO 8601 formatting
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0'); 
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`; 
}

// ascii number for unique file name under data folder. intended for files sent to "mycospbucket"
function dateTimeToLabel(dateTime) {
  asciiNumbers = ''
  for (let i = dateTime.length/2; i < dateTime.length; i++) {
    const asciiValue = dateTime.charCodeAt(i);
    asciiNumbers += String(asciiValue).padStart(3, '0');
  }

  return "data/" + (asciiNumbers) 
}

// records user data from maxmind
function setCity() {
  var updateCityText = function(geoipResponse) {
    var cityName = geoipResponse.city.names.en || 'your city';
    city = cityName;
    console.log("ISP:", isp);
    console.log("City:", city + ",", country);
    document.getElementById("userData").innerHTML = "ISP: " + isp;
    document.getElementById("userData2").innerHTML = "City: " + city + ", " + country;
  };
  var onSuccess = function(geoipResponse) {
    updateCityText(geoipResponse);
  };
  var onError = function(error) {
    console.log("error")
  };

  return function() {
    if (typeof geoip2 !== 'undefined') {
      geoip2.city(onSuccess, onError);
    } else {
      console.log('a browser that blocks GeoIP2 requests')
    }
  };
}

// records user data from ipapi
function getIP(json) {
  fetch(`https://ipapi.co/${json.ip}/json/`)
    .then(response => response.json())
    .then(data => {
      isp = data.org;
      state = data.region;
      country = data.country_name;
      setCity()
      longitude = data.longitude;
      latitude = data.latitude;
    })
    .catch(error => {
    });
}

// calculates factor to scale FILESIZE by based on latency
function getFactor(l) {
  var factor = 100/l;
  if (l > 175) factor /= 2;
  if (factor > 1) factor = 1;
  if (factor < .1) factor = .1;

  factor *= .5;
  factor.toFixed(2)
  console.log("factor = ", factor);

  return factor;
}

// uploads json data to mycospbucket
async function sendRow(row) {
  s3 = configAWS()
  const jsonContent = {};
  jsonContent["provider"] = row[0];
  jsonContent["endpoint"] = row[1];
  jsonContent["latency_ms)"] = row[2];
  jsonContent["upload_speed_b/s"] = row[3] * 1000000;
  jsonContent["download_speed_b/s"] = row[4] * 1000000;
  jsonContent["date_time"] = formatTimestamp(performance.now());        
  jsonContent["isp"] = isp;
  jsonContent["location"] = String(city) + ", " + String(country);

  const jsonContentString = JSON.stringify(jsonContent); // Convert JSON object to string

  const upload = new AWS.S3.ManagedUpload({
      params: {
          Bucket: "mycospbucket", 
          Key: dateTimeToLabel(jsonContent["date_time"]), //labeled with first DateTime
          Body: jsonContentString,
          ContentType: 'application/json'
      }
  });
  await upload.send((err, data) => {
      if (err) {
      console.error("Error uploading CSV:", err);
      } else {
      console.log("CSV uploaded successfully:", data.Location);
      }
  });
  console.log("sent row")
}

// calculates distance from b to user location. b is [latitude, longitude] and ---_LOC_COORDS[i]
function getDistance(b) {
  lat1 = latitude;
  lon1 = longitude;
  lat2 = b[0];
  lon2 = b[1];
  const toRadians = (angle) => (angle * Math.PI) / 180;
  const radius = 6371; // Radius of the Earth in kilometers
  const dlat = toRadians(lat2 - lat1);
  const dlon = toRadians(lon2 - lon1);
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  var distance = Math.round(radius * c / 1000); // number of thousand kms
  if (distance == 0) distance = 1;

  return distance;
}

// sorts both html display table and myCSV
function sortTable(columnIndex) {
  const table = document.getElementById("myTable");
  const rows = Array.from(table.querySelectorAll("tbody tr"));

  rows.sort((rowA, rowB) => {
    const cellA = rowA.querySelectorAll("td")[columnIndex].textContent;
    const cellB = rowB.querySelectorAll("td")[columnIndex].textContent;
    return cellA.localeCompare(cellB, undefined, { numeric: true });
  });

  table.querySelector("tbody").innerHTML = "";
  rows.forEach(row => table.querySelector("tbody").appendChild(row));

  myCSV.sort((a, b) => a[columnIndex + 1] - b[columnIndex + 1]); // myCSV contains one reference column that is not displayed on table
}

/*
UI HELPERS -----------------------------------------------------------------------------------------------------------------------------]
*/

function updateTable(thisRound) {
  const tbody = document.querySelector('#myTable tbody');
    tbody.innerHTML = ''; // Clear existing rows

    // Start from index 1 to skip the first vector (header)
    for (let i = 0; i < thisRound.length; i++) {
      const rowData = thisRound[i];
      const formattedRowData = rowData.map((cellData, index) => {
        if (index >= 2 && index <= 4) {
            // Format numeric values in columns 3, 4, and 5 to one decimal place
            return parseFloat(cellData).toFixed(1);
        } else {
            return cellData;
        }
      });
      const row = document.createElement('tr');
      row.innerHTML = formattedRowData.map(cellData => `<td>${cellData}</td>`).join('');
      tbody.appendChild(row);
    }
    console.log("updated table")
}

function clearTable() {
  const tbody = document.querySelector('#myTable tbody');
  tbody.innerHTML = ''; // Clear the table body by setting its content to an empty string
}

function displayAll() {
  clearTable();
  const tbody = document.querySelector('#myTable tbody');

  for (let i = 1; i < myCSV.length; i++) {
      const rowData = myCSV[i];
      const row = document.createElement('tr');

      for (var j = 0; j < rowData.length; j++) {
         
              const cell = document.createElement('td');

              if (j === 2 || j === 3 || j === 4) {
                  // Limit decimal places for columns 3, 4, and 5
                  cell.textContent = parseFloat(myCSV[i][j]).toFixed(1);
              } else {
                  cell.textContent = (myCSV[i][j]);
              }

              row.appendChild(cell);
          // Invoke the function here with current cell data and index
      }

      tbody.appendChild(row);
  }
  setTimeout(() => setButtons(false), 5000);
}

function addRow() {
  var table = document.getElementById("myTable").getElementsByTagName("tbody")[0];
  var newRow = table.insertRow(table.rows.length);

  for (var i = 0; i < myCSV[0].length - 1; i++) {
    var cell = newRow.insertCell(i);
    cell.innerHTML = "";
  }
}

function addMultRows() {
  for (var i = 0; i < REGIONS.length; i++) {
    addRow();
    updateCell(i + 1, 0, "aws s3");
    updateCell(i + 1, 1, REGIONS[i])
    updateCell(i + 1, 2, AWS_LOC[i])
    // updateCell(i + 1, 3, getDistance(AWS_LOC_COORDS[i]))
    var row = [];
    row.push(i,"aws s3",REGIONS[i],AWS_LOC[i])//,getDistance(AWS_LOC_COORDS[i]));
    myCSV.push(row)
  }
  for (var i = 0; i < REGIONS_COS.length; i++) {
    addRow();
    updateCell(REGIONS.length + i + 1, 0, "tencent cos");
    updateCell(REGIONS.length + i + 1, 1, REGIONS_COS[i])
    updateCell(REGIONS.length + i + 1, 2, COS_LOC[i])
    // updateCell(REGIONS.length + i + 1, 3, getDistance(COS_LOC_COORDS[i]))
    var row = [];
    row.push(i,"tencent cos",REGIONS_COS[i],COS_LOC[i])//,getDistance(COS_LOC_COORDS[i]));
    myCSV.push(row)
  }
  setTimeout(function() {addDists()}, 500)
}

function addDists() {
  for (var i = 1; i < myCSV.length; i++) {
    console.log(myCSV[i][0]);
      console.log(AWS_LOC_COORDS[myCSV[i][0]]);
      console.log(myCSV[i][2])
    let d;
    if (myCSV[i][1] == "aws s3") {
      d = getDistance(AWS_LOC_COORDS[myCSV[i][0]]);
    }
    else {
      d = getDistance(COS_LOC_COORDS[myCSV[i][0]]);
    }
    myCSV[i].push(d);
    updateCell(i, 3, d)
  }
  sortTable(3)
}

function updateCell(row, col, content) {
  var table = document.getElementById("myTable");
  var rowCount = table.rows.length;

  // If the row doesn't exist, add a new row first
  if (row >= rowCount) {
      addRow();
  }

  var cell = table.rows[row].cells[col];

  // If the cell doesn't exist, add a new cell in the row
  if (!cell) {
      cell = table.rows[row].insertCell(col);
  }

  cell.innerHTML = content;
}

function setButtons(bool) {
  const buttons = document.querySelectorAll('.nice-button');
  buttons.forEach(button => {
      button.disabled = bool;
  });
  console.log("Buttons set to", bool)
}

function removeColumn(index) {
  var table = document.getElementById("myTable");
  for (var i = 0; i < table.rows.length; i++) {
    var row = table.rows[i];
    row.deleteCell(index);
  } 
}

function removeDistance() {
  removeColumn(2); removeColumn(2);
  setButtons(false)
}

async function setTable() {
  sortTable(3); // initial sorting based on location
  await doLatencies();
  sortTable(4); // sort again based on latency. likely not many changes
  return 0;
}


// graveyard ------------------------------------------------------------------------------------------------------------------------------]

async function sendCSV() {
  if (myCSV.length == 1) {
      console.log("no data to send")
      setButtons(false)
      return;
  }
  configAWS();
  const upload = new AWS.S3.ManagedUpload({
      params: {
          Bucket: "mycospbucket", 
          Key: dateTimeToLabel(formatTimestamp(performance.now())) + ".csv", //labeled with first DateTime
          Body: arrayToCSV(myCSV),
      }
  });
  await upload.send((err, data) => {
      if (err) {
      console.error("Error uploading CSV:", err);
      } else {
      console.log("CSV uploaded successfully:", data.Location);
      }
  });
  setButtons(false)
}

// // 
// function sortDataVectors(vector) {
//   vector.sort((a, b) => a[2] - b[2]);
//   return vector
// }

// var round = 1;
    

//     async function main() {
//         await doRounds(3);
//         sendCSV();
//         displayFinished();
//     }

//     async function doThreeRounds() {
//         for (var i = 0; i < 3; i++) {
//             await oneRound();
//         }
//         setButtons(false);
//     }

//     async function doOneRound() {
//         await oneRound();
//         setButtons(false)
//     }

// async function oneRound() {
//   clearTable();
//   thisRound = []
//   configAWS();
//   // addRow();addRow();addRow();addRow();
//   console.log(round)
//   await runAWS(round, thisRound);
//   await runCOS(round, thisRound);

//   myCSV.push(...thisRound);
//   round++;
// }

// async function runAWS(round, thisRound) {
//   for (r in REGIONS) {
//       addRow();
//       console.log("added row")
//       rowNum = parseInt(r) + 1;
//       updateCell(rowNum,0,"aws s3");
//       updateCell(rowNum,1,REGIONS[r]);
//       var row = ["aws s3", REGIONS[r]]
//       // console.log(r, REGIONS[r])
//       const s3 = new AWS.S3({ region: REGIONS[r] });

//       updateCell(rowNum,4,"working...");
//       var l = await measureNetworkLatency(getURLfromRegion(r))
//       console.log("latency", l)
//       row.push(l);
//       updateCell(rowNum,4,l.toFixed(1));

//       l = getFactor(l)

//       updateCell(rowNum,5,"working...");
//       var u = await upload(getBucketnameFromRegionAWS(REGIONS[r]), s3, l)
//       console.log("finished upload", u)
//       row.push(u);
//       updateCell(rowNum,5,u.toFixed(1));

//       updateCell(rowNum,6,"working...");
//       var d = await download(getBucketnameFromRegionAWS(REGIONS[r]), s3, l);
//       console.log("finished download", d)
//       row.push(d);
//       updateCell(rowNum,6,d.toFixed(1));

//       thisRound.push(row);
//       console.log("round progress", thisRound)
//       thisRound = sortDataVectors(thisRound);
//       console.log("this round sorted", thisRound)
//       console.log(thisRound.length)
//       updateTable(thisRound);
//       sendRow(row);

//   }
//   return 0;
// }

// async function runCOS(round, thisRound) {
//   for (r in REGIONS_COS) {
//       addRow();
//       var s3 = configCOS(REGIONS_COS[r], ENDPOINTS[r])
//       rowNum = parseInt(r) + 1 + REGIONS.length;
//       updateCell(rowNum,0,"tencent cos");
//       updateCell(rowNum,1,REGIONS_COS[r]);
//       var row = ["tencent cos", REGIONS_COS[r]]
//       // console.log(r, REGIONS_COS[r])

//       updateCell(rowNum,4,"working...");
//       var l = await measureNetworkLatency(BUCKETURLS_COS[r])
//       console.log("latency", l)
//       row.push(l);
//       updateCell(rowNum,4,l.toFixed(1));

//       l = getFactor(l)

//       updateCell(rowNum,5,"working...");
//       var u = await upload(BUCKETNAMES_COS[r], s3, l)
//       console.log("finished upload", u)
//       row.push(u);
//       updateCell(rowNum,5,u.toFixed(1));

//       updateCell(rowNum,6,"working...");
//       var d = await download(BUCKETNAMES_COS[r], s3, l);
//       console.log("finished download", d)
//       row.push(d);
//       updateCell(rowNum,6,d.toFixed(1));

//       for (var i = 0; i < row.length; i++) {
//           updateCell(rowNum,i,row[i])
//       }

//       thisRound.push(row);
//       sendRow(row);
//       console.log("round progress", thisRound)
//       thisRound = sortDataVectors(thisRound);
//       console.log("this round sorted", thisRound)
//       console.log(thisRound.length)
//       updateTable(thisRound);
//   }
//   return 0;
// }