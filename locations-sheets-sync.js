/**
 * FMCG Asset Management - Locations Google Sheets Sync
 * เพิ่มการบันทึกข้อมูลสถานที่ลง Google Sheets
 * เพื่อให้สามารถเข้าถึงข้อมูลได้จากทุกเครื่อง
 */

/**
 * ========================================
 * 1. เพิ่มฟังก์ชัน Sync Locations ไปยัง Sheets
 * ========================================
 */

/**
 * บันทึกข้อมูลสถานที่ทั้งหมดลง Google Sheets
 */
async function syncLocationsToSheets() {
    if (!sheetsConfig || !sheetsConfig.spreadsheetId) {
        console.warn('⚠️ Google Sheets not configured');
        return false;
    }

    try {
        showNotification('🔄 กำลังบันทึกข้อมูลสถานที่...', 'info');

        // รวบรวมข้อมูลสถานที่ทั้งหมด
        const allLocations = getAllLocations();
        const locationData = [];

        allLocations.forEach(location => {
            const assetsInLocation = assetsData.filter(a => a.location === location).length;
            const capacity = locationCapacity[location] || 0;
            const isCustom = customLocations.some(l => l.name === location);
            const usagePercent = capacity > 0 ? ((assetsInLocation / capacity) * 100).toFixed(2) : 0;

            locationData.push({
                name: location,
                totalAssets: assetsInLocation,
                maxCapacity: capacity,
                usagePercent: usagePercent,
                isCustomLocation: isCustom ? 'Yes' : 'No',
                status: capacity === 0 ? 'No Limit' : 
                       assetsInLocation === 0 ? 'Empty' :
                       usagePercent >= 90 ? 'Full' :
                       usagePercent >= 70 ? 'Warning' : 'Normal',
                lastUpdated: new Date().toISOString()
            });
        });

        // เตรียมข้อมูลสำหรับ Sheets
        const sheetName = 'Locations';
        const headers = [
            'สถานที่',
            'จำนวนทรัพย์สิน',
            'ความจุสูงสุด',
            'เปอร์เซ็นต์ใช้งาน',
            'สถานที่กำหนดเอง',
            'สถานะ',
            'อัพเดทล่าสุด'
        ];

        const rows = locationData.map(loc => [
            loc.name,
            loc.totalAssets,
            loc.maxCapacity,
            loc.usagePercent + '%',
            loc.isCustomLocation,
            loc.status,
            new Date(loc.lastUpdated).toLocaleString('th-TH')
        ]);

        // เขียนลง Google Sheets
        const range = `${sheetName}!A1:G${rows.length + 1}`;
        const values = [headers, ...rows];

        const response = await gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: sheetsConfig.spreadsheetId,
            range: range,
            valueInputOption: 'RAW',
            resource: { values: values }
        });

        console.log('✅ Locations synced to Sheets:', response);
        showNotification('✅ บันทึกข้อมูลสถานที่สำเร็จ!', 'success');
        return true;

    } catch (error) {
        console.error('❌ Error syncing locations:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการบันทึก: ' + error.message, 'error');
        return false;
    }
}

/**
 * โหลดข้อมูลสถานที่จาก Google Sheets
 */
async function loadLocationsFromSheets() {
    if (!sheetsConfig || !sheetsConfig.spreadsheetId) {
        console.warn('⚠️ Google Sheets not configured');
        return false;
    }

    try {
        showNotification('🔄 กำลังโหลดข้อมูลสถานที่...', 'info');

        const sheetName = 'Locations';
        const range = `${sheetName}!A2:G`; // เริ่มจากแถว 2 (ข้ามหัวตาราง)

        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: sheetsConfig.spreadsheetId,
            range: range
        });

        const rows = response.result.values;
        if (!rows || rows.length === 0) {
            console.log('ℹ️ No locations data in Sheets');
            return false;
        }

        // ล้างข้อมูลเดิม
        customLocations = [];
        locationCapacity = {};

        // โหลดข้อมูลจาก Sheets
        rows.forEach(row => {
            const [name, totalAssets, maxCapacity, usagePercent, isCustom, status, lastUpdated] = row;
            
            if (name) {
                // บันทึก Capacity
                if (maxCapacity && parseInt(maxCapacity) > 0) {
                    locationCapacity[name] = parseInt(maxCapacity);
                }

                // บันทึก Custom Location
                if (isCustom === 'Yes') {
                    customLocations.push({
                        name: name,
                        addedDate: lastUpdated || new Date().toISOString()
                    });
                }
            }
        });

        // บันทึกลง localStorage
        localStorage.setItem('fmcgCustomLocations', JSON.stringify(customLocations));
        localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));

        console.log('✅ Locations loaded from Sheets:', {
            customLocations: customLocations.length,
            capacities: Object.keys(locationCapacity).length
        });

        showNotification('✅ โหลดข้อมูลสถานที่สำเร็จ!', 'success');
        
        // อัพเดทหน้า Locations
        if (typeof updateLocationsPage === 'function') {
            updateLocationsPage();
        }

        return true;

    } catch (error) {
        console.error('❌ Error loading locations:', error);
        
        // ถ้า Sheet ไม่มี ให้สร้างใหม่
        if (error.result && error.result.error.code === 400) {
            console.log('📝 Creating new Locations sheet...');
            await createLocationsSheet();
            return false;
        }

        showNotification('❌ เกิดข้อผิดพลาดในการโหลด: ' + error.message, 'error');
        return false;
    }
}

/**
 * สร้าง Sheet สำหรับ Locations
 */
async function createLocationsSheet() {
    if (!sheetsConfig || !sheetsConfig.spreadsheetId) {
        console.warn('⚠️ Google Sheets not configured');
        return false;
    }

    try {
        const requests = [{
            addSheet: {
                properties: {
                    title: 'Locations',
                    gridProperties: {
                        rowCount: 100,
                        columnCount: 7
                    }
                }
            }
        }];

        await gapi.client.sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetsConfig.spreadsheetId,
            resource: { requests: requests }
        });

        console.log('✅ Locations sheet created');

        // บันทึกข้อมูลเริ่มต้น
        await syncLocationsToSheets();

        return true;

    } catch (error) {
        console.error('❌ Error creating Locations sheet:', error);
        return false;
    }
}

/**
 * ========================================
 * 2. แก้ไขฟังก์ชันเดิมให้ Sync กับ Sheets
 * ========================================
 */

/**
 * แก้ไขฟังก์ชัน addNewLocation() ให้บันทึกลง Sheets
 * แทนที่ฟังก์ชันเดิมในไฟล์ index.html
 */
async function addNewLocation() {
    const name = document.getElementById('newLocationName').value.trim();
    const capacity = document.getElementById('newLocationCapacity').value.trim();
    
    if (!name) {
        alert('กรุณากรอกชื่อสถานที่');
        return;
    }
    
    // ตรวจสอบว่าซ้ำหรือไม่
    const allLocations = getAllLocations();
    if (allLocations.includes(name)) {
        alert('มีสถานที่นี้อยู่แล้ว');
        return;
    }
    
    // สร้างสถานที่ใหม่
    const newLocation = {
        name: name,
        addedDate: new Date().toISOString()
    };
    
    customLocations.push(newLocation);
    localStorage.setItem('fmcgCustomLocations', JSON.stringify(customLocations));
    
    // บันทึก Capacity
    if (capacity && parseInt(capacity) > 0) {
        locationCapacity[name] = parseInt(capacity);
        localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));
    }
    
    // 🆕 บันทึกลง Google Sheets
    await syncLocationsToSheets();
    
    showNotification(`✅ เพิ่มสถานที่ "${name}" สำเร็จ!`, 'success');
    
    // Reset form
    document.getElementById('newLocationName').value = '';
    document.getElementById('newLocationCapacity').value = '';
    
    // อัพเดทหน้า
    updateLocationsPage();
    loadManageLocationsTable();
}

/**
 * แก้ไขฟังก์ชัน saveCapacity() ให้บันทึกลง Sheets
 * แทนที่ฟังก์ชันเดิมในไฟล์ index.html
 */
async function saveCapacity() {
    const locationName = document.getElementById('capacityLocationName').value;
    const maxValue = parseInt(document.getElementById('capacityMaxValue').value);
    
    if (isNaN(maxValue) || maxValue < 0) {
        alert('กรุณากรอกจำนวนที่ถูกต้อง');
        return;
    }
    
    locationCapacity[locationName] = maxValue;
    localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));
    
    // 🆕 บันทึกลง Google Sheets
    await syncLocationsToSheets();
    
    showNotification(`✅ ตั้งค่าความจุสำเร็จ!\n📍 ${locationName}: ${maxValue} หน่วย`, 'success');
    
    closeModal('capacityModal');
    updateLocationsPage();
}

/**
 * แก้ไขฟังก์ชัน deleteLocation() ให้บันทึกลง Sheets
 * แทนที่ฟังก์ชันเดิมในไฟล์ index.html
 */
async function deleteLocation(locationName) {
    // ตรวจสอบว่ามีทรัพย์สินในสถานที่นี้หรือไม่
    const hasAssets = assetsData.some(a => a.location === locationName);
    if (hasAssets) {
        alert('ไม่สามารถลบได้ เนื่องจากมีทรัพย์สินในสถานที่นี้');
        return;
    }
    
    if (!confirm(`ต้องการลบสถานที่ "${locationName}" ใช่หรือไม่?`)) {
        return;
    }
    
    // ลบจาก customLocations
    customLocations = customLocations.filter(l => l.name !== locationName);
    localStorage.setItem('fmcgCustomLocations', JSON.stringify(customLocations));
    
    // ลบ Capacity
    if (locationCapacity[locationName]) {
        delete locationCapacity[locationName];
        localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));
    }
    
    // 🆕 บันทึกลง Google Sheets
    await syncLocationsToSheets();
    
    showNotification(`✅ ลบสถานที่ "${locationName}" สำเร็จ!`, 'success');
    
    loadManageLocationsTable();
    updateLocationsPage();
}

/**
 * ========================================
 * 3. เพิ่มปุ่มใน UI สำหรับ Sync
 * ========================================
 */

/**
 * เพิ่ม HTML สำหรับปุ่ม Sync Locations
 * วางใน section "สถานที่เก็บทรัพย์สิน" ใกล้กับปุ่ม "จัดการสถานที่"
 */
const locationsSyncButtonHTML = `
<!-- ปุ่ม Sync Locations with Sheets -->
<div style="display: flex; gap: 10px; margin-top: 15px;">
    <button class="btn btn-primary" onclick="syncLocationsToSheets()">
        <i class="fas fa-cloud-upload-alt"></i> บันทึกลง Sheets
    </button>
    <button class="btn btn-success" onclick="loadLocationsFromSheets()">
        <i class="fas fa-cloud-download-alt"></i> โหลดจาก Sheets
    </button>
</div>
`;

/**
 * ========================================
 * 4. Auto-Sync เมื่อมีการเปลี่ยนแปลง
 * ========================================
 */

/**
 * เพิ่ม Auto-Sync เมื่อเปิดหน้า Locations
 * แก้ไขฟังก์ชัน showPage() ในไฟล์ index.html
 */
// เพิ่มโค้ดนี้ใน case 'locations':
/*
case 'locations':
    updateLocationsPage();
    
    // 🆕 Auto-load จาก Sheets ถ้ามีการเชื่อมต่อ
    if (sheetsConfig && sheetsConfig.spreadsheetId) {
        loadLocationsFromSheets().catch(err => {
            console.warn('Could not load locations from Sheets:', err);
        });
    }
    break;
*/

/**
 * ========================================
 * 5. Initialize เมื่อโหลดระบบ
 * ========================================
 */

/**
 * เพิ่มในส่วน initializeApp() หรือเมื่อเชื่อมต่อ Sheets สำเร็จ
 */
async function initializeLocationsSync() {
    if (sheetsConfig && sheetsConfig.spreadsheetId) {
        console.log('🔄 Initializing Locations sync...');
        
        // โหลดข้อมูลจาก Sheets
        const loaded = await loadLocationsFromSheets();
        
        if (!loaded) {
            // ถ้าโหลดไม่ได้ ให้ Sync ข้อมูลปัจจุบันขึ้นไป
            console.log('📤 Syncing current locations to Sheets...');
            await syncLocationsToSheets();
        }
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        syncLocationsToSheets,
        loadLocationsFromSheets,
        createLocationsSheet,
        initializeLocationsSync,
        // Override functions
        addNewLocation,
        saveCapacity,
        deleteLocation
    };
}

console.log('✅ Locations Sheets Sync Module loaded!');
console.log('💡 Functions available:');
console.log('  - syncLocationsToSheets() - บันทึกข้อมูลลง Sheets');
console.log('  - loadLocationsFromSheets() - โหลดข้อมูลจาก Sheets');
console.log('  - initializeLocationsSync() - เริ่มต้นระบบ Sync');
