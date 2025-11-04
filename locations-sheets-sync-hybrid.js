/**
 * FMCG Asset Management - Locations Hybrid Sync
 * อ่านด้วย Google Sheets API (เร็ว)
 * เขียนด้วย Google Apps Script (ต้องมี Apps Script)
 */

// ชื่อ Sheet สำหรับเก็บ Locations
const LOCATIONS_SHEET_NAME = 'Locations';

/**
 * ========================================
 * 1. โหลดข้อมูล Locations (ใช้ Sheets API - Read-only)
 * ========================================
 */

/**
 * โหลดข้อมูลสถานที่จาก Google Sheets (ด้วย API Key)
 */
async function loadLocationsFromSheets() {
    // ตรวจสอบว่ามี API Key หรือไม่
    if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
        console.warn('⚠️ Google Sheets API not configured');
        showNotification('⚠️ กรุณาตั้งค่า Google Sheets API ก่อน', 'warning');
        return false;
    }

    try {
        showNotification('🔄 กำลังโหลดข้อมูลสถานที่...', 'info');

        // ใช้ Sheets API อ่านข้อมูล (Read-only ด้วย API Key)
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${LOCATIONS_SHEET_NAME}?key=${SHEETS_API_KEY}`;

        console.log('📥 Loading locations from Sheets API:', url);

        const response = await fetch(url);

        if (!response.ok) {
            // ถ้า Sheet ไม่มี จะได้ 404
            if (response.status === 400 || response.status === 404) {
                console.log('ℹ️ Locations sheet not found yet');
                showNotification('ℹ️ ยังไม่มี Sheet "Locations" ให้สร้างใหม่ด้วยการบันทึกข้อมูล', 'info');
                return false;
            }
            throw new Error('Sheets API Error: ' + response.status);
        }

        const data = await response.json();

        if (!data.values || data.values.length <= 1) {
            console.log('ℹ️ No locations data in sheet');
            showNotification('ℹ️ ยังไม่มีข้อมูลสถานที่ใน Sheet', 'info');
            return false;
        }

        // แปลงข้อมูล (ข้าม Header แถวแรก)
        const rows = data.values.slice(1);
        
        // ล้างข้อมูลเดิม
        customLocations = [];
        locationCapacity = {};

        // โหลดข้อมูล
        rows.forEach(row => {
            const name = row[0]; // สถานที่
            const maxCapacity = row[2]; // ความจุสูงสุด
            const isCustom = row[4]; // สถานที่กำหนดเอง
            const lastUpdated = row[6]; // อัพเดทล่าสุด

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
        localStorage.setItem('fmcgLastLocationSync', new Date().toISOString());

        console.log('✅ Locations loaded from Sheets:', {
            customLocations: customLocations.length,
            capacities: Object.keys(locationCapacity).length,
            rows: rows.length
        });

        showNotification(`✅ โหลดข้อมูล ${rows.length} สถานที่สำเร็จ!`, 'success');

        // อัพเดทหน้า Locations
        if (typeof updateLocationsPage === 'function') {
            updateLocationsPage();
        }

        return true;

    } catch (error) {
        console.error('❌ Error loading locations:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการโหลด: ' + error.message, 'error');
        return false;
    }
}

/**
 * ========================================
 * 2. บันทึกข้อมูล Locations (ใช้ Apps Script)
 * ========================================
 */

/**
 * บันทึกข้อมูลสถานที่ลง Google Sheets (ด้วย Apps Script)
 */
async function syncLocationsToSheets() {
    // ตรวจสอบว่ามี Apps Script URL หรือไม่
    if (!sheetsConfig || !sheetsConfig.webAppUrl) {
        console.warn('⚠️ Google Apps Script not configured');
        showNotification('⚠️ กรุณาเชื่อมต่อ Google Apps Script ก่อน', 'warning');
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

        // เตรียม Payload
        const payload = {
            action: 'syncLocations',
            locations: locationData
        };

        console.log('📤 Sending locations data:', payload);

        // ส่งข้อมูลไปยัง Google Apps Script
        const response = await fetch(sheetsConfig.webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        // no-cors จะไม่ได้ response กลับมา ถือว่าสำเร็จ
        console.log('✅ Locations synced to Sheets (via Apps Script)');
        showNotification('✅ บันทึกข้อมูลสถานที่สำเร็จ!', 'success');

        // บันทึกเวลาที่ sync ล่าสุด
        localStorage.setItem('fmcgLastLocationSync', new Date().toISOString());

        return true;

    } catch (error) {
        console.error('❌ Error syncing locations:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการบันทึก: ' + error.message, 'error');
        return false;
    }
}

/**
 * ========================================
 * 3. Initialize และ Utility Functions
 * ========================================
 */

/**
 * Initialize เมื่อเชื่อมต่อ Sheets สำเร็จ
 */
async function initializeLocationsSync() {
    console.log('🔄 Initializing Locations sync...');

    // ลองโหลดข้อมูลจาก Sheets (ด้วย API Key)
    const loaded = await loadLocationsFromSheets();

    if (!loaded) {
        // ถ้าโหลดไม่ได้ ให้ Sync ข้อมูลปัจจุบันขึ้นไป (ด้วย Apps Script)
        if (sheetsConfig && sheetsConfig.webAppUrl) {
            console.log('📤 Syncing current locations to Sheets...');
            await syncLocationsToSheets();
        }
    }
}

/**
 * แสดงเวลาที่ sync ล่าสุด
 */
function showLastSyncTime() {
    const lastSync = localStorage.getItem('fmcgLastLocationSync');
    if (lastSync) {
        const date = new Date(lastSync);
        const formatted = date.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        return formatted;
    }
    return 'ยังไม่เคย Sync';
}

/**
 * Debug function
 */
function debugLocationsSync() {
    console.log('=== Locations Sync Debug ===');
    console.log('📍 SPREADSHEET_ID:', SPREADSHEET_ID);
    console.log('🔑 SHEETS_API_KEY:', SHEETS_API_KEY ? '***' + SHEETS_API_KEY.slice(-4) : 'NOT SET');
    console.log('🌐 Apps Script URL:', sheetsConfig?.webAppUrl || 'NOT SET');
    console.log('📦 Total Assets:', assetsData.length);
    console.log('🗺️ Custom Locations:', customLocations);
    console.log('📊 Location Capacity:', locationCapacity);
    console.log('🕐 Last Sync:', showLastSyncTime());

    // นับทรัพย์สินในแต่ละสถานที่
    const locationCounts = {};
    assetsData.forEach(asset => {
        const loc = asset.location || 'ไม่ระบุ';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    console.log('📈 Asset Counts by Location:', locationCounts);

    // สถานที่ทั้งหมด
    const allLocations = typeof getAllLocations === 'function'
        ? getAllLocations()
        : [...new Set(assetsData.map(a => a.location).filter(Boolean))];
    console.log('🗺️ All Locations:', allLocations);

    console.log('=========================');
}

/**
 * ทดสอบการเชื่อมต่อ
 */
async function testLocationsSync() {
    console.log('🧪 Testing Locations Sync...');

    // ทดสอบว่าฟังก์ชันพร้อมใช้งานหรือไม่
    const checks = {
        SPREADSHEET_ID: !!SPREADSHEET_ID,
        SHEETS_API_KEY: !!SHEETS_API_KEY,
        appsScriptUrl: !!(sheetsConfig && sheetsConfig.webAppUrl),
        getAllLocations: typeof getAllLocations === 'function',
        assetsData: Array.isArray(assetsData),
        customLocations: Array.isArray(customLocations),
        locationCapacity: typeof locationCapacity === 'object'
    };

    console.log('✅ System Checks:', checks);

    const allReady = Object.values(checks).every(v => v === true);

    if (allReady) {
        console.log('✅ All systems ready!');
        console.log('📖 Can READ with Sheets API (API Key)');
        console.log('✍️ Can WRITE with Apps Script');
        return true;
    } else {
        console.warn('⚠️ Some systems are not ready:', checks);
        
        // แนะนำการแก้ไข
        if (!checks.SPREADSHEET_ID) console.error('❌ Missing SPREADSHEET_ID');
        if (!checks.SHEETS_API_KEY) console.error('❌ Missing SHEETS_API_KEY');
        if (!checks.appsScriptUrl) console.warn('⚠️ Missing Apps Script URL (cannot write)');
        
        return false;
    }
}

/**
 * ทดสอบอ่านข้อมูล
 */
async function testLoadLocations() {
    console.log('🧪 Testing Load Locations...');
    
    if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
        console.error('❌ Cannot test: Missing SPREADSHEET_ID or SHEETS_API_KEY');
        return false;
    }
    
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${LOCATIONS_SHEET_NAME}?key=${SHEETS_API_KEY}`;
        console.log('📥 Fetching:', url);
        
        const response = await fetch(url);
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            console.error('❌ Failed to load. Status:', response.status);
            return false;
        }
        
        const data = await response.json();
        console.log('📦 Data received:', data);
        console.log('✅ Load test passed!');
        return true;
        
    } catch (error) {
        console.error('❌ Load test failed:', error);
        return false;
    }
}

/**
 * ทดสอบเขียนข้อมูล
 */
async function testSyncLocations() {
    console.log('🧪 Testing Sync Locations...');
    
    if (!sheetsConfig || !sheetsConfig.webAppUrl) {
        console.error('❌ Cannot test: Missing Apps Script URL');
        console.log('💡 Please connect Google Apps Script first');
        return false;
    }
    
    try {
        const testData = {
            action: 'syncLocations',
            locations: [
                {
                    name: 'Test Location',
                    totalAssets: 0,
                    maxCapacity: 100,
                    usagePercent: 0,
                    isCustomLocation: 'Yes',
                    status: 'Empty',
                    lastUpdated: new Date().toISOString()
                }
            ]
        };
        
        console.log('📤 Sending test data:', testData);
        
        const response = await fetch(sheetsConfig.webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        console.log('✅ Sync test passed! (no-cors mode - check Sheets manually)');
        console.log('💡 Please check your Google Sheets for "Test Location"');
        return true;
        
    } catch (error) {
        console.error('❌ Sync test failed:', error);
        return false;
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        syncLocationsToSheets,
        loadLocationsFromSheets,
        initializeLocationsSync,
        showLastSyncTime,
        debugLocationsSync,
        testLocationsSync,
        testLoadLocations,
        testSyncLocations
    };
}

console.log('✅ Locations Hybrid Sync Module loaded!');
console.log('📖 READ: Google Sheets API (with API Key)');
console.log('✍️ WRITE: Google Apps Script');
console.log('💡 Available functions:');
console.log('  - loadLocationsFromSheets() - โหลดข้อมูล (Sheets API)');
console.log('  - syncLocationsToSheets() - บันทึกข้อมูล (Apps Script)');
console.log('  - initializeLocationsSync() - เริ่มต้นระบบ');
console.log('  - testLocationsSync() - ทดสอบระบบ');
console.log('  - testLoadLocations() - ทดสอบการอ่าน');
console.log('  - testSyncLocations() - ทดสอบการเขียน');
console.log('  - debugLocationsSync() - แสดงข้อมูล Debug');
