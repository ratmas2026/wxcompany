const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const DATA_FILE = path.join(__dirname, 'data.json');

let db;
let SQL;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY,
  name TEXT, phone TEXT, title TEXT, department TEXT, company TEXT,
  email TEXT, address TEXT, avatar TEXT, bio TEXT,
  status INTEGER DEFAULT 1, created_at TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  name TEXT, company TEXT, phone TEXT, title TEXT,
  areas TEXT, message TEXT, status TEXT DEFAULT 'new', remark TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS positions (
  id INTEGER PRIMARY KEY,
  name TEXT, sort INTEGER, "desc" TEXT, count INTEGER, department TEXT
);

CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY,
  title TEXT, cover TEXT, url TEXT, category TEXT,
  status TEXT DEFAULT 'draft', duration TEXT, views INTEGER DEFAULT 0,
  created_at TEXT, description TEXT
);

CREATE TABLE IF NOT EXISTS splash_images (
  id INTEGER PRIMARY KEY,
  url TEXT, sort INTEGER, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS company_profiles (
  id INTEGER PRIMARY KEY,
  title TEXT, sort_order INTEGER DEFAULT 0,
  cover TEXT, detail TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS company_performances (
  id INTEGER PRIMARY KEY,
  title TEXT, sort_order INTEGER DEFAULT 0,
  cover TEXT, detail TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS business_modules (
  id INTEGER PRIMARY KEY,
  name TEXT, cover_image TEXT, cover_aspect_ratio TEXT DEFAULT '16:9',
  layout_type TEXT DEFAULT 'carousel', sort_order INTEGER DEFAULT 0,
  status INTEGER DEFAULT 1, sections TEXT, cards TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS honors (
  id INTEGER PRIMARY KEY,
  name TEXT, "desc" TEXT, date TEXT, image TEXT, created_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY,
  name TEXT, location TEXT, year TEXT, "desc" TEXT,
  tags TEXT, image TEXT, images TEXT,
  address TEXT, scale TEXT, period TEXT, investment TEXT,
  highlights TEXT, detail TEXT, detail_images TEXT, results TEXT
);

CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY,
  project_name TEXT, stage TEXT, stage_value TEXT,
  location TEXT, "desc" TEXT, image TEXT,
  created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS company_infos (
  id INTEGER PRIMARY KEY,
  name TEXT, legal_person TEXT, phone TEXT, address TEXT,
  longitude REAL, latitude REAL, website TEXT, description TEXT,
  sort_order INTEGER DEFAULT 0, status INTEGER DEFAULT 1,
  created_at TEXT, updated_at TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT
);
`;

function jsonVal(v) {
  if (v === undefined || v === null) return null;
  return JSON.stringify(v);
}

function jsonParse(v) {
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

function initDatabase() {
  return initSqlJs().then(function(SQLModule) {
    SQL = SQLModule;

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
      db.run('PRAGMA journal_mode=OFF');
    }

    db.run(SCHEMA);

    // Migration: drop legacy company_info table (replaced by company_infos)
    db.run('DROP TABLE IF EXISTS company_info');

    // Migration: drop legacy business table (replaced by business_modules)
    db.run('DROP TABLE IF EXISTS business');

    const row = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='cards'");
    const hasData = row.length > 0 && db.exec("SELECT COUNT(*) AS c FROM cards")[0].values[0][0] > 0;

    if (!hasData) {
      migrateFromJSON();
      save();
    }

    return { db, SQL };
  });
}

function save() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function migrateFromJSON() {
  if (!fs.existsSync(DATA_FILE)) return;

  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  // Cards
  const insCard = db.prepare(
    'INSERT INTO cards (id,name,phone,title,department,company,email,address,avatar,bio,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  (data.cards || []).forEach(function(c) {
    insCard.run([c.id, c.name||'', c.phone||'', c.title||'', c.department||'', c.company||'',
      c.email||'', c.address||'', c.avatar||'', c.bio||'', c.status?1:0, c.createdAt||'']);
  });
  insCard.free();

  // Messages
  const insMsg = db.prepare(
    'INSERT INTO messages (id,name,company,phone,title,areas,message,status,remark,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  (data.messages || []).forEach(function(m) {
    insMsg.run([m.id, m.name||'', m.company||'', m.phone||'', m.title||'',
      m.areas||'', m.message||'', m.status||'new', m.remark||'', m.createdAt||'']);
  });
  insMsg.free();

  // Positions
  const insPos = db.prepare(
    'INSERT INTO positions (id,name,sort,"desc",count,department) VALUES (?,?,?,?,?,?)'
  );
  (data.positions || []).forEach(function(p) {
    insPos.run([p.id, p.name||'', p.sort||0, p.desc||'', p.count||0, p.department||'']);
  });
  insPos.free();

  // Videos
  const insVid = db.prepare(
    'INSERT INTO videos (id,title,cover,url,category,status,duration,views,created_at,description) VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  (data.videos || []).forEach(function(v) {
    insVid.run([v.id, v.title||'', v.cover||'', v.url||'', v.category||'',
      v.status||'draft', v.duration||'', v.views||0, v.createdAt||'', v.description||'']);
  });
  insVid.free();

  // Splash Images
  const insSplash = db.prepare('INSERT INTO splash_images (id,url,sort,updated_at) VALUES (?,?,?,?)');
  (data.splashImages || []).forEach(function(s) {
    insSplash.run([s.id, s.url||'', s.sort||0, s.updatedAt||'']);
  });
  insSplash.free();

  // Company Profiles
  const insProf = db.prepare(
    'INSERT INTO company_profiles (id,title,sort_order,cover,detail,created_at) VALUES (?,?,?,?,?,?)'
  );
  (data.companyProfiles || []).forEach(function(p) {
    insProf.run([p.id, p.title||'', p.sortOrder||0, jsonVal(p.cover), jsonVal(p.detail), p.createdAt||'']);
  });
  insProf.free();

  // Company Performances
  const insPerf = db.prepare(
    'INSERT INTO company_performances (id,title,sort_order,cover,detail,created_at) VALUES (?,?,?,?,?,?)'
  );
  (data.companyPerformances || []).forEach(function(p) {
    insPerf.run([p.id, p.title||'', p.sortOrder||0, jsonVal(p.cover), jsonVal(p.detail), p.createdAt||'']);
  });
  insPerf.free();

  // Business Modules
  const insBM = db.prepare(
    'INSERT INTO business_modules (id,name,cover_image,cover_aspect_ratio,layout_type,sort_order,status,sections,cards,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
  );
  (data.businessModules || []).forEach(function(m) {
    insBM.run([m.id, m.name||'', m.coverImage||'', m.coverAspectRatio||'16:9',
      m.layoutType||'carousel', m.sortOrder||0, m.status?1:0,
      jsonVal(m.sections), jsonVal(m.cards), m.createdAt||'']);
  });
  insBM.free();

  // Honors
  const insHon = db.prepare(
    'INSERT INTO honors (id,name,"desc",date,image,created_at) VALUES (?,?,?,?,?,?)'
  );
  (data.honors || []).forEach(function(h) {
    insHon.run([h.id, h.name||'', h.desc||'', h.date||'', h.image||'', h.createdAt||'']);
  });
  insHon.free();

  // Projects
  const insProj = db.prepare(
    'INSERT INTO projects (id,name,location,year,"desc",tags,image,images,address,scale,period,investment,highlights,detail,detail_images,results) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  (data.projects || []).forEach(function(p) {
    insProj.run([p.id, p.name||'', p.location||'', p.year||'', p.desc||'',
      jsonVal(p.tags), p.image||'', jsonVal(p.images),
      p.address||'', p.scale||'', p.period||'', p.investment||'',
      jsonVal(p.highlights), p.detail||'', jsonVal(p.detailImages), jsonVal(p.results)]);
  });
  insProj.free();

  // Sites
  const insSite = db.prepare(
    'INSERT INTO sites (id,project_name,stage,stage_value,location,"desc",image,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
  );
  (data.sites || []).forEach(function(s) {
    insSite.run([s.id, s.projectName||'', s.stage||'', s.stageValue||'',
      s.location||'', s.desc||'', s.image||'', s.createdAt||'', s.updatedAt||'']);
  });
  insSite.free();

  // Configs
  const insCfg = db.prepare('INSERT OR REPLACE INTO config (key,value) VALUES (?,?)');
  insCfg.run(['companyProfileConfig', jsonVal((data.companyProfileConfig || {}).sections || [])]);
  insCfg.run(['companyPerformanceConfig', jsonVal((data.companyPerformanceConfig || {}).sections || [])]);
  insCfg.run(['casePageConfig', jsonVal((data.casePageConfig || {}).sections || [])]);
  insCfg.run(['businessModulePageConfig', jsonVal((data.businessModulePageConfig || {}).sections || [])]);
  insCfg.run(['nextId', jsonVal(data.nextId || {})]);
  insCfg.free();
}

// -- readData() replacement: assemble full data object from DB --
function queryAll(table, mapFn) {
  try {
    var result = db.exec('SELECT * FROM ' + table);
    if (result.length === 0) return [];
    var columns = result[0].columns;
    var rows = result[0].values;
    return rows.map(function(row) {
      var obj = {};
      columns.forEach(function(col, i) { obj[col] = row[i]; });
      return mapFn ? mapFn(obj) : obj;
    });
  } catch (e) {
    return [];
  }
}

function readData() {
  // Cards
  var cards = queryAll('cards', function(c) {
    return {
      id: c.id, name: c.name || '', phone: c.phone || '', title: c.title || '',
      department: c.department || '', company: c.company || '', email: c.email || '',
      address: c.address || '', avatar: c.avatar || '', bio: c.bio || '',
      status: !!c.status, createdAt: c.created_at || ''
    };
  });

  // Messages
  var messages = queryAll('messages', function(m) {
    return {
      id: m.id, name: m.name || '', company: m.company || '', phone: m.phone || '',
      title: m.title || '', areas: m.areas || '', message: m.message || '',
      status: m.status || 'new', remark: m.remark || '', createdAt: m.created_at || ''
    };
  });

  // Positions
  var positions = queryAll('positions', function(p) {
    return {
      id: p.id, name: p.name || '', sort: p.sort || 0,
      desc: p.desc || '', count: p.count || 0, department: p.department || ''
    };
  });

  // Videos
  var videos = queryAll('videos', function(v) {
    return {
      id: v.id, title: v.title || '', cover: v.cover || '', url: v.url || '',
      category: v.category || '', status: v.status || 'draft',
      duration: v.duration || '', views: v.views || 0,
      createdAt: v.created_at || '', description: v.description || ''
    };
  });

  // Splash Images
  var splashImages = queryAll('splash_images', function(s) {
    return { id: s.id, url: s.url || '', sort: s.sort, updatedAt: s.updated_at || '' };
  });

  // Company Profiles
  var companyProfiles = queryAll('company_profiles', function(p) {
    return {
      id: p.id, title: p.title || '', sortOrder: p.sort_order || 0,
      cover: jsonParse(p.cover) || { backgroundImage: '', video: '', zones: {} },
      detail: jsonParse(p.detail) || { title: '', body: '', images: [], video: '', detailEntry: true },
      createdAt: p.created_at || ''
    };
  });

  // Company Performances
  var companyPerformances = queryAll('company_performances', function(p) {
    return {
      id: p.id, title: p.title || '', sortOrder: p.sort_order || 0,
      cover: jsonParse(p.cover) || { backgroundImage: '', video: '', zones: {} },
      detail: jsonParse(p.detail) || { title: '', body: '', images: [], video: '', detailEntry: true },
      createdAt: p.created_at || ''
    };
  });

  // Business Modules
  var businessModules = queryAll('business_modules', function(m) {
    return {
      id: m.id, name: m.name || '', coverImage: m.cover_image || '',
      coverAspectRatio: m.cover_aspect_ratio || '16:9',
      layoutType: m.layout_type || 'carousel', sortOrder: m.sort_order || 0,
      status: !!m.status,
      sections: jsonParse(m.sections) || [],
      cards: jsonParse(m.cards) || [],
      createdAt: m.created_at || ''
    };
  });

  // Honors
  var honors = queryAll('honors', function(h) {
    return {
      id: h.id, name: h.name || '', desc: h.desc || '',
      date: h.date || '', image: h.image || '', createdAt: h.created_at || ''
    };
  });

  // Projects
  var projects = queryAll('projects', function(p) {
    return {
      id: p.id, name: p.name || '', location: p.location || '', year: p.year || '',
      desc: p.desc || '', tags: jsonParse(p.tags) || [],
      image: p.image || '', images: jsonParse(p.images) || [],
      address: p.address || '', scale: p.scale || '', period: p.period || '',
      investment: p.investment || '', highlights: jsonParse(p.highlights) || [],
      detail: p.detail || '', detailImages: jsonParse(p.detail_images) || [],
      results: jsonParse(p.results) || []
    };
  });

  // Sites
  var sites = queryAll('sites', function(s) {
    return {
      id: s.id, projectName: s.project_name || '', stage: s.stage || '',
      stageValue: s.stage_value || '', location: s.location || '',
      desc: s.desc || '', image: s.image || '',
      createdAt: s.created_at || '', updatedAt: s.updated_at || ''
    };
  });

  // Company Infos (new multi-row table)
  var companyInfos = queryAll('company_infos', function(ci) {
    return {
      id: ci.id, name: ci.name || '', legalPerson: ci.legal_person || '',
      phone: ci.phone || '', address: ci.address || '',
      longitude: ci.longitude || null, latitude: ci.latitude || null,
      website: ci.website || '', description: ci.description || '',
      sortOrder: ci.sort_order || 0, status: !!ci.status,
      createdAt: ci.created_at || '', updatedAt: ci.updated_at || ''
    };
  });

  // Configs
  var configs = {};
  try {
    var cfgRows = db.exec('SELECT * FROM config');
    if (cfgRows.length > 0) {
      cfgRows[0].values.forEach(function(row) {
        configs[row[0]] = jsonParse(row[1]);
      });
    }
  } catch (e) { /* ignore */ }

  // NextId
  var defaultNextId = {
    cards: 1, messages: 1, positions: 1, videos: 1,
    honors: 1, projects: 1, sites: 1, splashImages: 4,
    companyProfiles: 1, companyPerformances: 1, businessModules: 1, companyInfos: 1
  };
  var nextId = configs.nextId || defaultNextId;

  // Assemble
  return {
    cards: cards,
    messages: messages,
    positions: positions,
    videos: videos,
    splashImages: splashImages.length > 0 ? splashImages : [
      { id: 1, url: '', sort: 1 },
      { id: 2, url: '', sort: 2 },
      { id: 3, url: '', sort: 3 }
    ],
    companyProfiles: companyProfiles,
    companyPerformances: companyPerformances,
    businessModules: businessModules,
    honors: honors,
    projects: projects,
    sites: sites,
    companyInfos: companyInfos,
    companyProfileConfig: { sections: configs.companyProfileConfig || [] },
    companyPerformanceConfig: { sections: configs.companyPerformanceConfig || [] },
    casePageConfig: { sections: configs.casePageConfig || [] },
    businessModulePageConfig: { sections: configs.businessModulePageConfig || [] },
    nextId: nextId
  };
}

// -- writeData() replacement: sync all tables from data object --
function writeData(data) {
  function syncTable(table, columns, dataArr, mapFn) {
    db.run('DELETE FROM ' + table);
    if (!dataArr || dataArr.length === 0) return;
    var placeholders = columns.map(function() { return '?'; }).join(',');
    var stmt = db.prepare('INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES (' + placeholders + ')');
    dataArr.forEach(function(item) {
      stmt.run(mapFn(item));
    });
    stmt.free();
  }

  // Cards
  syncTable('cards',
    ['id','name','phone','title','department','company','email','address','avatar','bio','status','created_at'],
    data.cards,
    function(c) { return [c.id, c.name||'', c.phone||'', c.title||'', c.department||'', c.company||'',
      c.email||'', c.address||'', c.avatar||'', c.bio||'', c.status?1:0, c.createdAt||'']; }
  );

  // Messages
  syncTable('messages',
    ['id','name','company','phone','title','areas','message','status','remark','created_at'],
    data.messages,
    function(m) { return [m.id, m.name||'', m.company||'', m.phone||'', m.title||'',
      m.areas||'', m.message||'', m.status||'new', m.remark||'', m.createdAt||'']; }
  );

  // Positions
  syncTable('positions',
    ['id','name','sort','desc','count','department'],
    data.positions,
    function(p) { return [p.id, p.name||'', p.sort||0, p.desc||'', p.count||0, p.department||'']; }
  );

  // Videos
  syncTable('videos',
    ['id','title','cover','url','category','status','duration','views','created_at','description'],
    data.videos,
    function(v) { return [v.id, v.title||'', v.cover||'', v.url||'', v.category||'',
      v.status||'draft', v.duration||'', v.views||0, v.createdAt||'', v.description||'']; }
  );

  // Splash Images
  syncTable('splash_images',
    ['id','url','sort','updated_at'],
    data.splashImages,
    function(s) { return [s.id, s.url||'', s.sort||0, s.updatedAt||'']; }
  );

  // Company Profiles
  syncTable('company_profiles',
    ['id','title','sort_order','cover','detail','created_at'],
    data.companyProfiles,
    function(p) { return [p.id, p.title||'', p.sortOrder||0, jsonVal(p.cover), jsonVal(p.detail), p.createdAt||'']; }
  );

  // Company Performances
  syncTable('company_performances',
    ['id','title','sort_order','cover','detail','created_at'],
    data.companyPerformances,
    function(p) { return [p.id, p.title||'', p.sortOrder||0, jsonVal(p.cover), jsonVal(p.detail), p.createdAt||'']; }
  );

  // Business Modules
  syncTable('business_modules',
    ['id','name','cover_image','cover_aspect_ratio','layout_type','sort_order','status','sections','cards','created_at'],
    data.businessModules,
    function(m) { return [m.id, m.name||'', m.coverImage||'', m.coverAspectRatio||'16:9',
      m.layoutType||'carousel', m.sortOrder||0, m.status?1:0,
      jsonVal(m.sections), jsonVal(m.cards), m.createdAt||'']; }
  );

  // Honors
  syncTable('honors',
    ['id','name','desc','date','image','created_at'],
    data.honors,
    function(h) { return [h.id, h.name||'', h.desc||'', h.date||'', h.image||'', h.createdAt||'']; }
  );

  // Projects
  syncTable('projects',
    ['id','name','location','year','desc','tags','image','images','address','scale','period','investment','highlights','detail','detail_images','results'],
    data.projects,
    function(p) { return [p.id, p.name||'', p.location||'', p.year||'', p.desc||'',
      jsonVal(p.tags), p.image||'', jsonVal(p.images),
      p.address||'', p.scale||'', p.period||'', p.investment||'',
      jsonVal(p.highlights), p.detail||'', jsonVal(p.detailImages), jsonVal(p.results)]; }
  );

  // Sites
  syncTable('sites',
    ['id','project_name','stage','stage_value','location','desc','image','created_at','updated_at'],
    data.sites,
    function(s) { return [s.id, s.projectName||'', s.stage||'', s.stageValue||'',
      s.location||'', s.desc||'', s.image||'', s.createdAt||'', s.updatedAt||'']; }
  );

  // Company Infos (new multi-row table)
  syncTable('company_infos',
    ['id','name','legal_person','phone','address','longitude','latitude','website','description','sort_order','status','created_at','updated_at'],
    data.companyInfos,
    function(ci) { return [ci.id, ci.name||'', ci.legalPerson||'', ci.phone||'', ci.address||'',
      ci.longitude||null, ci.latitude||null, ci.website||'', ci.description||'',
      ci.sortOrder||0, ci.status?1:0, ci.createdAt||'', ci.updatedAt||'']; }
  );

  // Configs
  db.run('DELETE FROM config');
  var insCfg = db.prepare('INSERT INTO config (key,value) VALUES (?,?)');
  insCfg.run(['companyProfileConfig', jsonVal((data.companyProfileConfig || {}).sections || [])]);
  insCfg.run(['companyPerformanceConfig', jsonVal((data.companyPerformanceConfig || {}).sections || [])]);
  insCfg.run(['casePageConfig', jsonVal((data.casePageConfig || {}).sections || [])]);
  insCfg.run(['businessModulePageConfig', jsonVal((data.businessModulePageConfig || {}).sections || [])]);
  insCfg.run(['nextId', jsonVal(data.nextId || {})]);
  insCfg.free();

  save();
}

function getDb() {
  return db;
}

module.exports = { initDatabase, readData, writeData, getDb, save };
