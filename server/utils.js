const {
  readData: _readData, writeData: _writeData,
  syncCards, syncMessages, syncPositions, syncVideos,
  syncSplashImages, syncCompanyProfiles, syncCompanyPerformances,
  syncBusinessModules, syncHonors, syncProjects, syncSites,
  syncCompanyInfos, syncTemplates, saveConfigs
} = require('./db')

// Helper: extract only allowed fields from an object (mass-assignment protection)
function pick(obj, ...keys) {
  const result = {}
  for (const k of keys) { if (k in obj) result[k] = obj[k] }
  return result
}

// Helper: safely parse integer route param, returns NaN if invalid
function parseId(val) {
  const n = parseInt(val)
  return isNaN(n) ? NaN : n
}

function readData() {
  return _readData()
}

function writeData(data) {
  _writeData(data)
}

module.exports = {
  pick, parseId, readData, writeData,
  syncCards, syncMessages, syncPositions, syncVideos,
  syncSplashImages, syncCompanyProfiles, syncCompanyPerformances,
  syncBusinessModules, syncHonors, syncProjects, syncSites,
  syncCompanyInfos, syncTemplates, saveConfigs
}
