/**
 * Google Apps Script - FMCG Asset Management System
 * แก้ไข:
 * - เพิ่ม header validation
 * - Skip header row จากข้อมูลที่ส่งมา
 * - Format วันที่แบบไทย
 * - ใช้ Prompt Font
 */

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getLocations') {
    return getLocations();
  } else if (action === 'getAssets') {
    return getAssets();
  } else if (action === 'initialize') {
    return initializeSheets();
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: 'Invalid action. Use: initialize, getLocations, getAssets'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'saveLocations') {
      return saveLocations(data.data);
    } else if (action === 'saveAssets') {
      return saveAssets(data.data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid action. Use: saveLocations, saveAssets'
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * แปลงวันที่ ISO เป็นรูปแบบไทย
 */
function formatThaiDateTime(isoString) {
  if (!isoString) return '';

  try {
    const date = new Date(isoString);

    // Format: วว/ดด/ปปปป เวลา ชช:นน:วว
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543; // แปลงเป็น พ.ศ.

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return isoString;
  }
}

/**
 * สร้างหรือรับ Sheet
 */
function getOrCreateSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}

/**
 * ตั้งค่า Header สำหรับ Sheet
 */
function formatHeader(sheet, lastColumn) {
  const headerRange = sheet.getRange(1, 1, 1, lastColumn);

  // สี Background
  headerRange.setBackground('#14b8a6'); // Teal color
  headerRange.setFontColor('#ffffff'); // White text

  // Font
  headerRange.setFontFamily('Prompt');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);

  // จัดกลาง
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');

  // ขอบตาราง
  headerRange.setBorder(
    true, true, true, true, false, false,
    '#0d9488', SpreadsheetApp.BorderStyle.SOLID_MEDIUM
  );

  // ล็อค header
  sheet.setFrozenRows(1);
}

/**
 * ตั้งค่า Font สำหรับข้อมูล
 */
function formatDataRows(sheet, startRow, numRows, numCols) {
  if (numRows > 0) {
    const dataRange = sheet.getRange(startRow, 1, numRows, numCols);
    dataRange.setFontFamily('Prompt');
    dataRange.setFontSize(10);

    // ขอบตาราง
    dataRange.setBorder(
      true, true, true, true, true, true,
      '#e0e0e0', SpreadsheetApp.BorderStyle.SOLID
    );

    // สลับสีแถว
    for (let i = 0; i < numRows; i++) {
      const row = sheet.getRange(startRow + i, 1, 1, numCols);
      if (i % 2 === 0) {
        row.setBackground('#f0f9f9'); // Light teal
      } else {
        row.setBackground('#ffffff'); // White
      }
    }
  }
}

/**
 * ตรวจสอบว่าแถวแรกเป็น header หรือไม่
 */
function isHeaderRow(row) {
  if (!row || row.length === 0) return false;

  // ตรวจสอบคำที่มักอยู่ใน header
  const headerKeywords = [
    'ชื่อสถานที่', 'ความจุสูงสุด', 'จำนวนทรัพย์สิน', 'กำหนดเอง', 'อัพเดทล่าสุด',
    'รหัสทรัพย์สิน', 'ชื่อทรัพย์สิน', 'หมวดหมู่', 'สถานที่เก็บ', 'จำนวน', 'หน่วย', 'สถานะ'
  ];

  const firstCell = String(row[0]).trim();
  return headerKeywords.some(keyword => firstCell.includes(keyword));
}

/**
 * เริ่มต้น Sheets ทั้งหมด
 */
function initializeSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // ===== Locations Sheet =====
    let locationsSheet = ss.getSheetByName('Locations');
    if (locationsSheet) {
      ss.deleteSheet(locationsSheet);
    }
    locationsSheet = ss.insertSheet('Locations');

    // สร้างหัวตาราง
    locationsSheet.appendRow([
      'ชื่อสถานที่',
      'ความจุสูงสุด',
      'จำนวนทรัพย์สิน',
      'กำหนดเอง',
      'อัพเดทล่าสุด'
    ]);

    formatHeader(locationsSheet, 5);

    // ===== Assets Sheet =====
    let assetsSheet = ss.getSheetByName('Assets');
    if (assetsSheet) {
      ss.deleteSheet(assetsSheet);
    }
    assetsSheet = ss.insertSheet('Assets');

    // สร้างหัวตาราง
    assetsSheet.appendRow([
      'รหัสทรัพย์สิน',
      'ชื่อทรัพย์สิน',
      'หมวดหมู่',
      'สถานที่เก็บ',
      'จำนวน',
      'หน่วย',
      'สถานะ',
      'วันที่ซื้อ',
      'ราคา',
      'ผู้จำหน่าย',
      'การรับประกัน',
      'รายละเอียด',
      'อัพเดทล่าสุด'
    ]);

    formatHeader(assetsSheet, 13);

    // Auto-resize columns
    locationsSheet.autoResizeColumns(1, 5);
    assetsSheet.autoResizeColumns(1, 13);

    // ซ่อน Sheet อื่นๆ ถ้ามี
    const allSheets = ss.getSheets();
    allSheets.forEach(sheet => {
      if (sheet.getName() !== 'Locations' && sheet.getName() !== 'Assets') {
        sheet.hideSheet();
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'สร้าง Sheets สำเร็จ!',
        sheets: ['Locations', 'Assets']
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * บันทึกข้อมูลสถานที่ (แก้ไขแล้ว - รองรับข้อมูลที่มี header)
 */
function saveLocations(locations) {
  try {
    const sheet = getOrCreateSheet('Locations');

    // ตรวจสอบว่ามีหัวตารางหรือไม่ ถ้าไม่มีให้สร้าง
    const hasHeader = sheet.getLastRow() > 0;

    if (!hasHeader) {
      // สร้าง header ใหม่
      sheet.appendRow([
        'ชื่อสถานที่',
        'ความจุสูงสุด',
        'จำนวนทรัพย์สิน',
        'กำหนดเอง',
        'อัพเดทล่าสุด'
      ]);
      formatHeader(sheet, 5);
    }

    // ตรวจสอบว่าข้อมูลที่ส่งมามี header row หรือไม่
    let dataToSave = locations;
    if (locations && locations.length > 0 && isHeaderRow(locations[0])) {
      // ถ้าแถวแรกเป็น header ให้ skip ไป
      dataToSave = locations.slice(1);
      console.log('🔍 ตรวจพบ header row - skip แถวแรก');
    }

    // ลบข้อมูลเก่า (เว้น header row)
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    // เพิ่มข้อมูลใหม่
    if (dataToSave && dataToSave.length > 0) {
      const range = sheet.getRange(2, 1, dataToSave.length, 5);
      range.setValues(dataToSave);

      // Format ข้อมูล
      formatDataRows(sheet, 2, dataToSave.length, 5);

      // จัดกลางคอลัมน์ตัวเลข
      sheet.getRange(2, 2, dataToSave.length, 1).setHorizontalAlignment('center'); // ความจุ
      sheet.getRange(2, 3, dataToSave.length, 1).setHorizontalAlignment('center'); // จำนวน
      sheet.getRange(2, 4, dataToSave.length, 1).setHorizontalAlignment('center'); // กำหนดเอง
    }

    // Auto-resize
    sheet.autoResizeColumns(1, 5);

    // ตรวจสอบว่า header ยังอยู่หรือไม่
    const firstRow = sheet.getRange(1, 1, 1, 5).getValues()[0];
    const headerStillExists = isHeaderRow(firstRow);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึกข้อมูลสถานที่สำเร็จ',
        count: dataToSave ? dataToSave.length : 0,
        headerExists: headerStillExists,
        skippedHeaderRow: dataToSave !== locations
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อ่านข้อมูลสถานที่
 */
function getLocations() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Locations');

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'ไม่พบ Sheet "Locations" กรุณารัน ?action=initialize ก่อน'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: data,
        count: data.length - 1 // ไม่นับ header
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * บันทึกข้อมูลทรัพย์สิน (แก้ไขแล้ว - รองรับข้อมูลที่มี header)
 */
function saveAssets(assets) {
  try {
    const sheet = getOrCreateSheet('Assets');

    // ตรวจสอบว่ามีหัวตารางหรือไม่
    const hasHeader = sheet.getLastRow() > 0;

    if (!hasHeader) {
      // สร้าง header ใหม่
      sheet.appendRow([
        'รหัสทรัพย์สิน',
        'ชื่อทรัพย์สิน',
        'หมวดหมู่',
        'สถานที่เก็บ',
        'จำนวน',
        'หน่วย',
        'สถานะ',
        'วันที่ซื้อ',
        'ราคา',
        'ผู้จำหน่าย',
        'การรับประกัน',
        'รายละเอียด',
        'อัพเดทล่าสุด'
      ]);
      formatHeader(sheet, 13);
    }

    // ตรวจสอบว่าข้อมูลที่ส่งมามี header row หรือไม่
    let dataToProcess = assets;
    if (assets && assets.length > 0 && isHeaderRow(assets[0])) {
      // ถ้าแถวแรกเป็น header ให้ skip ไป
      dataToProcess = assets.slice(1);
      console.log('🔍 ตรวจพบ header row - skip แถวแรก');
    }

    // ลบข้อมูลเก่า (เว้น header)
    if (sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }

    // เพิ่มข้อมูลใหม่
    if (dataToProcess && dataToProcess.length > 0) {
      const rows = dataToProcess.map(asset => {
        // ถ้าเป็น object ให้แปลงเป็น array
        if (typeof asset === 'object' && !Array.isArray(asset)) {
          return [
            asset.code || '',
            asset.name || '',
            asset.category || '',
            asset.location || '',
            asset.quantity || 0,
            asset.unit || '',
            asset.status || '',
            asset.purchaseDate || '',
            asset.price || 0,
            asset.supplier || '',
            asset.warranty || '',
            asset.description || '',
            formatThaiDateTime(new Date().toISOString())
          ];
        }
        // ถ้าเป็น array อยู่แล้วให้ใช้เลย
        return asset;
      });

      const range = sheet.getRange(2, 1, rows.length, 13);
      range.setValues(rows);

      // Format ข้อมูล
      formatDataRows(sheet, 2, rows.length, 13);

      // จัดกลางคอลัมน์ตัวเลข
      sheet.getRange(2, 5, rows.length, 1).setHorizontalAlignment('center'); // จำนวน
      sheet.getRange(2, 7, rows.length, 1).setHorizontalAlignment('center'); // สถานะ
    }

    // Auto-resize
    sheet.autoResizeColumns(1, 13);

    // ตรวจสอบว่า header ยังอยู่หรือไม่
    const firstRow = sheet.getRange(1, 1, 1, 13).getValues()[0];
    const headerStillExists = isHeaderRow(firstRow);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'บันทึกข้อมูลทรัพย์สินสำเร็จ',
        count: dataToProcess ? dataToProcess.length : 0,
        headerExists: headerStillExists,
        skippedHeaderRow: dataToProcess !== assets
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * อ่านข้อมูลทรัพย์สิน
 */
function getAssets() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Assets');

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({
          success: false,
          error: 'ไม่พบ Sheet "Assets" กรุณารัน ?action=initialize ก่อน'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: data,
        count: data.length - 1 // ไม่นับ header
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
