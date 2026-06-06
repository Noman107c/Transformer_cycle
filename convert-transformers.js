// convert-transformers.js

const fs = require('fs');
const path = require('path');

const dataFolder = path.join(__dirname, 'Data');
const outputFolder = path.join(__dirname, 'json');

if (!fs.existsSync(outputFolder)) {
  fs.mkdirSync(outputFolder, { recursive: true });
}

function csvToJson(csvText) {
  const lines = csvText.trim().split(/\r?\n/);

  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(',')
    .map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(',');

    const row = {};

    headers.forEach((header, index) => {
      let value = values[index]?.trim() ?? '';

      if (value !== '' && !isNaN(value)) {
        value = Number(value);
      }

      row[header] = value;
    });

    return row;
  });
}

for (let i = 1; i <= 25; i++) {
  const csvFile = path.join(
    dataFolder,
    `Transformer_${i}_Predicted_HI.csv`
  );

  const jsonFile = path.join(
    outputFolder,
    `T${i}.json`
  );

  if (!fs.existsSync(csvFile)) {
    console.log(`❌ File not found: Transformer_${i}_Predicted_HI.csv`);
    continue;
  }

  try {
    const csvContent = fs.readFileSync(csvFile, 'utf8');

    const jsonData = csvToJson(csvContent);

    fs.writeFileSync(
      jsonFile,
      JSON.stringify(jsonData, null, 2),
      'utf8'
    );

    console.log(`✅ Created T${i}.json`);
  } catch (err) {
    console.error(`❌ Error processing Transformer_${i}`, err);
  }
}

console.log('🎉 All conversions completed');