/**
 * FaceFlow Pro - System Controller (v7.0 - API Mode + GitHub Pages)
 * รองรับทั้งการ Serve HTML (GAS) และ API Mode (GitHub Pages)
 * API Key ถูกเก็บใน Script Properties เพื่อความปลอดภัย
 */

function doGet(e) {
  var action = (e && e.parameter) ? e.parameter.action : null;

  // ถ้าไม่มี action → serve HTML (backward compatible กับ GAS)
  if (!action) {
    var template = HtmlService.createTemplateFromFile('index');
    template.config = getConfig();
    return template.evaluate()
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
        .setTitle('FaceFlow Pro - Ultimate AI Dashboard')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // API Mode (สำหรับ GitHub Pages)
  return handleApi(action, e.parameter);
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  return handleApi(data.action, data);
}

/** * API Router — รับ action แล้ว route ไปยัง function ที่ถูกต้อง */
function handleApi(action, params) {
  var result;
  try {
    switch(action) {
      case 'getConfig':
        result = getConfig(); break;
      case 'getKnownFaces':
        result = getKnownFaces(); break;
      case 'registerUser':
        result = registerUser(params.name, params.faceDescriptor); break;
      case 'logAttendance':
        result = logAttendance(params.name, params.lat, params.lng); break;
      case 'saveConfig':
        result = saveConfig(params.lat, params.lng, params.radius); break;
      case 'callGemini':
        result = callGemini(params.prompt, params.systemHint); break;
      case 'callGeminiGreeting':
        result = callGeminiGreeting(params.name); break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch(err) {
    result = { error: err.message };
  }

  return ContentService.createTextOutput(JSON.stringify({ result: result }))
      .setMimeType(ContentService.MimeType.JSON);
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/** * ส่วนจัดการเจ้าหน้าที่ (Users) */
function registerUser(name, faceDescriptor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  if (sheet.getLastRow() === 0) sheet.appendRow(['ชื่อเจ้าหน้าที่', 'ข้อมูลใบหน้า (JSON)', 'วันที่ลงทะเบียน']);

  sheet.appendRow([name, JSON.stringify(faceDescriptor), new Date()]);
  return "ลงทะเบียนเจ้าหน้าที่สำเร็จ";
}

function getKnownFaces() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(r => ({
    label: r[0],
    descriptor: JSON.parse(r[1])
  }));
}

/** * ส่วนบันทึกเวลา (Attendance) */
function logAttendance(name, lat, lng) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Attendance') || ss.insertSheet('Attendance');
  if (sheet.getLastRow() === 0) sheet.appendRow(['ชื่อ', 'เวลา', 'วันที่', 'Lat', 'Lng', 'แผนที่']);

  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
  const link = 'https://www.google.com/maps?q=' + lat + ',' + lng;

  sheet.appendRow([name, timeStr, "'" + dateStr, lat, lng, link]);
  return "เช็คอินสำเร็จ!";
}

/** * ส่วนจัดการตั้งค่า (Config) */
function saveConfig(lat, lng, radius) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Config') || ss.insertSheet('Config');
  sheet.getRange("A1:B4").setValues([
    ["หัวข้อตั้งค่า", "ค่าพารามิเตอร์"],
    ["Latitude", lat],
    ["Longitude", lng],
    ["Radius (KM)", radius]
  ]);
  return "บันทึกพิกัดสำนักงานเรียบร้อย";
}

function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Config');
  let config = { lat: 0, lng: 0, radius: 0.5 };
  if (sheet) {
    const data = sheet.getRange("B2:B4").getValues();
    config.lat = parseFloat(data[0][0]) || 0;
    config.lng = parseFloat(data[1][0]) || 0;
    config.radius = parseFloat(data[2][0]) || 0.5;
  }
  return config;
}

/**
 * ส่วน Gemini AI (Server-Side — ปลอดภัย)
 * ตั้งค่า API Key ใน: Project Settings > Script Properties
 * Key: GEMINI_API_KEY | Value: (ใส่ API Key ของคุณ)
 */
function callGemini(prompt, systemHint) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) return "AI ผู้ช่วยพร้อมให้คำปรึกษา (โปรดตั้งค่า GEMINI_API_KEY ใน Script Properties ครับ)";

  const modelName = "gemini-2.0-flash";
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelName + ':generateContent?key=' + apiKey;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  if (systemHint) {
    payload.systemInstruction = { parts: [{ text: systemHint }] };
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const result = JSON.parse(response.getContentText());
    const text = result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text;
    return text || "AI ไม่พร้อมตอบในขณะนี้";
  } catch (e) {
    Logger.log('Gemini Error: ' + e.message);
    return "ติดต่อ AI ไม่ได้ครับ: " + e.message;
  }
}

function callGeminiGreeting(name) {
  return callGemini(
    'เจ้าหน้าที่ชื่อ ' + name + ' เพิ่งเช็คอินเข้างานสำเร็จ ช่วยสร้างประโยคทักทายที่สั้นๆ อบอุ่น และมีคำคมให้กำลังใจเจ้าหน้าที่ 1 ประโยคครับ',
    'คุณคือผู้ช่วย HR ที่เป็นกันเองและชอบให้กำลังใจ'
  );
}
