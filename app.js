const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline');

const app = express();
app.use(bodyParser.json());

//Port number
const port = process.env.PORT || 3000;


// Helper function to convert a column name to an index
function columnNameToIndex(columnName) {
  let index = 0;
  for (let i = 0; i < columnName.length; i++) {
    index *= 26;
    index += (columnName[i].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) + 1);
  }
  return index - 1; // Convert to zero-based index
}


const startIndex = columnNameToIndex('C');
const endIndex = columnNameToIndex('ACP');

// Function to check temperature
function checkTemperature() {
  return new Promise((resolve, reject) => {
    const path = 'mlxcirt3_log.csv'; // Path to camera csv log
    let maxTemp = -Infinity;

    const rl = readline.createInterface({
      input: fs.createReadStream(path),
      terminal: false
    });

    let lastLine = '';

    rl.on('line', (line) => {
      // Store the last non-empty line
      if (line.trim() !== '') {
        lastLine = line;
      }
    });

    rl.on('close', () => {
      // Split the last line by pipe character
      const entries = lastLine.split('|').map(entry => entry.trim());
      // Extract the temperature entries from the 3rd to the 50th section. These sections represent all the sections the thermal camera analyses.
      const temperatureEntries = entries.slice(2, 50); // Array indices start at 0, so index 2 is the third section

      temperatureEntries.forEach(tempStr => {
        const tempValue = parseFloat(tempStr);
        if (!isNaN(tempValue)) {
          maxTemp = Math.max(maxTemp, tempValue);
        }
      });

      // Resolve the promise with the max temperature found
      if (maxTemp > 15) {
        resolve({ status: true, temperature: maxTemp });
      } else {
        resolve({ status: false, temperature: maxTemp });
      }
    });

    rl.on('error', (err) => {
      reject(err);
    });
  });
}


app.get('/api/checkTemperature', async (req, res) => {
  console.log('Processing /api/checkTemperature request...');
  try {
    const result = await checkTemperature();
    console.log('Temperature check completed:', result);
    res.json({
      message: result.status ? 'Minimum temperature requirement met.' : 'Minimum temperature requirement not met.',
      maxTemperature: result.temperature
    });
  } catch (error) {
    console.error('Error during temperature check:', error);
    res.status(500).json({ message: 'Error reading temperature data', error: error.toString() });
  }
});

//Test URL.
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
