import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'json');
const MODS_FILE = path.join(DATA_DIR, 'modifications.json');

export interface Reading {
  Time: string;
  Ambient_Temperature_C: number;
  Age_yr: number;
  Maintenance_Count: number;
  No_of_Short_Circuits: number;
  Outages_hours_per_year: number;
  Current_A: number;
  Voltage_kV: number;
  Temp_score: number;
  Age_score: number;
  Maintenance_score: number;
  ShortCircuit_score: number;
  Outage_score: number;
  Current_score: number;
  Voltage_score: number;
  HI: number;
  Predicted_HI: number;
  Transformer?: string;
  Timestamp?: string;
  _id?: string;
}

export interface Transformer {
  _id: string;
  name: string;
  transformerId: string;
  location: string;
  type: string;
  capacity: number;
  status: 'GOOD' | 'MONITOR' | 'WARNING' | 'CRITICAL';
  healthIndex: number;
  ambientTemperatureC: number;
  ageYr: number;
  lastMaintenance: string;
}

// In-memory cache for static info
let transformersCache: Transformer[] = [];
let modifications: Record<string, { added: Reading[]; edited: Record<string, Reading>; deleted: string[] }> = {};

function loadModifications() {
  try {
    if (fs.existsSync(MODS_FILE)) {
      modifications = JSON.parse(fs.readFileSync(MODS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to load modifications:', err);
  }
}

function saveModifications() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(MODS_FILE, JSON.stringify(modifications, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save modifications:', err);
  }
}

// Read the last N bytes of a file and parse them as a JSON array of the last records
export function readLastRecords(transformerId: string, count: number = 200): Reading[] {
  const filePath = path.join(DATA_DIR, `${transformerId}.json`);
  if (!fs.existsSync(filePath)) return [];

  try {
    // Read the last 150KB of the file (should contain at least 200 records)
    const fd = fs.openSync(filePath, 'r');
    const stats = fs.fstatSync(fd);
    const size = stats.size;
    const bytesToRead = Math.min(size, 200000); // 200KB is plenty for 200+ records
    const buffer = Buffer.alloc(bytesToRead);
    
    fs.readSync(fd, buffer, 0, bytesToRead, size - bytesToRead);
    fs.closeSync(fd);

    const tailStr = buffer.toString('utf8');
    const firstObjIndex = tailStr.indexOf('{"Time"');
    if (firstObjIndex === -1) return [];

    let cleanJson = tailStr.substring(firstObjIndex).trim();
    if (!cleanJson.startsWith('[')) {
      cleanJson = '[' + cleanJson;
    }
    if (!cleanJson.endsWith(']')) {
      // Find the last valid closing bracket of an object
      const lastCloseBracket = cleanJson.lastIndexOf('}');
      if (lastCloseBracket !== -1) {
        cleanJson = cleanJson.substring(0, lastCloseBracket + 1) + ']';
      } else {
        return [];
      }
    }

    const records: Reading[] = JSON.parse(cleanJson);
    
    // Map properties to include _id, Transformer and Timestamp
    const mapped = records.map(r => ({
      ...r,
      _id: `${transformerId}_${r.Time.replace(/[: ]/g, '_')}`,
      Transformer: transformerId,
      Timestamp: r.Time
    }));

    return mapped.slice(-count);
  } catch (err) {
    console.error(`Error reading last records for ${transformerId}:`, err);
    return [];
  }
}

export function getTransformerList(): Transformer[] {
  loadModifications();

  const locations = [
    'Substation Alpha', 'Substation Beta', 'Substation Gamma', 'Substation Delta',
    'Main Grid North', 'West Distribution Hub', 'East Industrial Park', 'South Grid Terminal'
  ];

  return Array.from({ length: 25 }, (_, i) => {
    const tId = `T${i + 1}`;
    const padId = String(i + 1).padStart(2, '0');
    const type = i % 3 === 0 ? 'Step-up' : i % 3 === 1 ? 'Step-down' : 'Distribution';
    const capacity = [50, 100, 150, 250, 500][i % 5];
    const location = locations[i % locations.length];

    // Get latest reading
    let readings = readLastRecords(tId, 5);
    
    // Apply modifications
    const trfMods = modifications[tId] || { added: [], edited: {}, deleted: [] };
    
    // Filter out deleted
    readings = readings.filter(r => !trfMods.deleted.includes(r._id || ''));
    
    // Map edited
    readings = readings.map(r => trfMods.edited[r._id || ''] ? { ...r, ...trfMods.edited[r._id || ''] } : r);
    
    // Add new ones
    readings = [...readings, ...trfMods.added];

    const latest = readings[readings.length - 1] || {
      HI: 0.85,
      Ambient_Temperature_C: 25.0,
      Age_yr: 5,
      Time: new Date().toISOString()
    };

    const hi = latest.HI;
    let status: 'GOOD' | 'MONITOR' | 'WARNING' | 'CRITICAL' = 'GOOD';
    if (hi < 0.55) status = 'CRITICAL';
    else if (hi < 0.70) status = 'WARNING';
    else if (hi < 0.80) status = 'MONITOR';

    return {
      _id: tId,
      name: `Transformer ${i + 1}`,
      transformerId: `TRF-${padId}`,
      location,
      type,
      capacity,
      status,
      healthIndex: hi,
      ambientTemperatureC: latest.Ambient_Temperature_C,
      ageYr: latest.Age_yr,
      lastMaintenance: latest.Time
    };
  });
}

export function getTransformerReadings(transformerId: string): Reading[] {
  loadModifications();
  
  let readings = readLastRecords(transformerId, 500); // Get last 500 records
  const trfMods = modifications[transformerId] || { added: [], edited: {}, deleted: [] };

  // Apply modifications
  readings = readings.filter(r => !trfMods.deleted.includes(r._id || ''));
  readings = readings.map(r => trfMods.edited[r._id || ''] ? { ...r, ...trfMods.edited[r._id || ''] } : r);
  readings = [...readings, ...trfMods.added];

  return readings;
}

export function addReading(transformerId: string, reading: Partial<Reading>) {
  loadModifications();
  if (!modifications[transformerId]) {
    modifications[transformerId] = { added: [], edited: {}, deleted: [] };
  }

  const timestamp = reading.Time || new Date().toISOString();
  const newReading: Reading = {
    Time: timestamp,
    Ambient_Temperature_C: Number(reading.Ambient_Temperature_C || 25),
    Age_yr: Number(reading.Age_yr || 5),
    Maintenance_Count: Number(reading.Maintenance_Count || 0),
    No_of_Short_Circuits: Number(reading.No_of_Short_Circuits || 0),
    Outages_hours_per_year: Number(reading.Outages_hours_per_year || 0),
    Current_A: Number(reading.Current_A || 400),
    Voltage_kV: Number(reading.Voltage_kV || 11),
    Temp_score: Number(reading.Temp_score || 1),
    Age_score: Number(reading.Age_score || 1),
    Maintenance_score: Number(reading.Maintenance_score || 1),
    ShortCircuit_score: Number(reading.ShortCircuit_score || 1),
    Outage_score: Number(reading.Outage_score || 1),
    Current_score: Number(reading.Current_score || 1),
    Voltage_score: Number(reading.Voltage_score || 1),
    HI: Number(reading.HI || 0.85),
    Predicted_HI: Number(reading.Predicted_HI || 0.84),
    Transformer: transformerId,
    Timestamp: timestamp,
    _id: `${transformerId}_${timestamp.replace(/[: ]/g, '_')}`
  };

  modifications[transformerId].added.push(newReading);
  saveModifications();
  return newReading;
}

export function updateReading(readingId: string, updatedFields: Partial<Reading>) {
  loadModifications();
  const [transformerId] = readingId.split('_');
  if (!transformerId) return null;

  if (!modifications[transformerId]) {
    modifications[transformerId] = { added: [], edited: {}, deleted: [] };
  }

  // Check if it's an added reading
  const addedIdx = modifications[transformerId].added.findIndex(r => r._id === readingId);
  if (addedIdx !== -1) {
    modifications[transformerId].added[addedIdx] = {
      ...modifications[transformerId].added[addedIdx],
      ...updatedFields
    };
  } else {
    // It's a static reading, add to edited
    modifications[transformerId].edited[readingId] = {
      ...(modifications[transformerId].edited[readingId] || {}),
      ...updatedFields,
      _id: readingId,
      Transformer: transformerId
    } as Reading;
  }

  saveModifications();
  return true;
}

export function deleteReading(readingId: string) {
  loadModifications();
  const [transformerId] = readingId.split('_');
  if (!transformerId) return false;

  if (!modifications[transformerId]) {
    modifications[transformerId] = { added: [], edited: {}, deleted: [] };
  }

  // Check if it's an added reading
  const addedIdx = modifications[transformerId].added.findIndex(r => r._id === readingId);
  if (addedIdx !== -1) {
    modifications[transformerId].added.splice(addedIdx, 1);
  } else {
    // Add to deleted list
    if (!modifications[transformerId].deleted.includes(readingId)) {
      modifications[transformerId].deleted.push(readingId);
    }
  }

  saveModifications();
  return true;
}
