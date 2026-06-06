const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "json");

for (let i = 1; i <= 25; i++) {
  const file = path.join(dir, `T${i}.json`);

  if (!fs.existsSync(file)) {
    console.log(`⚠️ Missing T${i}.json`);
    continue;
  }

  try {
    const data = fs.readFileSync(file, "utf8");
    JSON.parse(data);
    console.log(`✅ T${i}.json OK`);
  } catch (e) {
    console.log(`❌ T${i}.json BROKEN → ${e.message}`);
  }
}