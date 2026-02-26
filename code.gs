/**
 * FaceFlow Pro - System Controller (v5.0 - AI Enhanced)
 * จัดการการโหลดหน้าหลักเพียงหน้าเดียว (SPA) และเชื่อมต่อ Google Sheets
 */

function doGet(e) {
  // โหลดหน้า index.html เพียงหน้าเดียวเพื่อความเสถียรของสิทธิ์กล้องและ GPS
  var template = HtmlService.createTemplateFromFile('index');
  
  // ส่งค่าการตั้งค่าจาก Sheets ไปที่หน้าเว็บ
  template.config = getConfig();

  return template.evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setTitle('FaceFlow Pro - Ultimate AI Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

/** * ส่วนจัดการพนักงาน (Users) 
 */
function registerUser(name, faceDescriptor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users') || ss.insertSheet('Users');
  if (sheet.getLastRow() === 0) sheet.appendRow(['ชื่อพนักงาน', 'ข้อมูลใบหน้า (JSON)', 'วันที่ลงทะเบียน']);
  
  sheet.appendRow([name, JSON.stringify(faceDescriptor), new Date()]); 
  return "ลงทะเบียนพนักงานสำเร็จ";
}

function getKnownFaces() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Users');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  // กรองข้อมูลและส่งกลับเป็น Array
  return data.slice(1).map(r => ({ 
    label: r[0], 
    descriptor: JSON.parse(r[1]) 
  }));
}

/** * ส่วนบันทึกเวลา (Attendance) 
 */
function logAttendance(name, lat, lng) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Attendance') || ss.insertSheet('Attendance');
  if (sheet.getLastRow() === 0) sheet.appendRow(['ชื่อ', 'เวลา', 'วันที่', 'Lat', 'Lng', 'แผนที่']);
  
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
  const link = `https://www.google.com/maps?q=${lat},${lng}`;
  
  sheet.appendRow([name, timeStr, "'" + dateStr, lat, lng, link]);
  return "เช็คอินสำเร็จ!";
}

/** * ส่วนจัดการตั้งค่า (Config) 
 */
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
