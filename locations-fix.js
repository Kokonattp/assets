/**
 * FMCG Asset Management - Locations Manager with Google Sheets Sync
 * Full Version - แก้ไขปัญหาและเพิ่มฟีเจอร์:
 * 1. คลังอื่นไม่แสดงในรายการ (แสดงเฉพาะคลังที่มีทรัพย์สิน) ✓
 * 2. Modal จัดการสถานที่ไม่เปิด ✓
 * 3. บันทึกข้อมูลลง Google Sheets ✓
 * 4. โหลดข้อมูลจาก Google Sheets ✓
 * 5. จัดการสถานที่ (เพิ่ม/แก้/ลบ) ✓
 */

// ===== CONFIG =====
const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwx56myaLhhyMKbzn9xyC_pRmn7a-hcWcmEESkM91AEuSWSN2uoRQMHol7WYaBjb9R_7A/exec'; // แก้ไข URL ของคุณที่นี่

// ===== HELPER FUNCTIONS =====

/**
 * แปลงวันที่เป็นรูปแบบไทย
 */
function formatThaiDateTime(date) {
    if (!date) return '';
    
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear() + 543; // พ.ศ.
        
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (error) {
        return date;
    }
}

// ===== MAIN FUNCTIONS =====

/**
 * อัพเดทหน้า Locations Page
 * โหลดข้อมูลจาก Google Sheets อัตโนมัติ
 */
async function updateLocationsPage() {
    // โหลดข้อมูลจาก Google Sheets อัตโนมัติแบบ silent
    if (typeof loadLocationsFromSheets === 'function') {
        await loadLocationsFromSheets(true); // silent mode
    }
    
    if (assetsData.length === 0) {
        const tbody = document.getElementById('locationsTableBody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #aaa; padding: 40px;">
                        ยังไม่มีข้อมูลทรัพย์สิน
                    </td>
                </tr>
            `;
        }
        return;
    }

    // รวมทั้งสถานที่จาก assetsData และ customLocations
    const locationData = {};
    
    // เพิ่มสถานที่จาก assetsData
    assetsData.forEach(asset => {
        const loc = asset.location || 'ไม่ระบุ';
        if (!locationData[loc]) {
            locationData[loc] = {
                total: 0,
                complete: 0
            };
        }
        locationData[loc].total++;
        if (asset.status === 'สมบูรณ์') {
            locationData[loc].complete++;
        }
    });
    
    // เพิ่มสถานที่จาก customLocations ที่ยังไม่มีในรายการ
    if (typeof getAllLocations === 'function') {
        const allLocations = getAllLocations();
        allLocations.forEach(loc => {
            if (!locationData[loc]) {
                locationData[loc] = {
                    total: 0,
                    complete: 0
                };
            }
        });
    } else if (typeof customLocations !== 'undefined' && Array.isArray(customLocations)) {
        customLocations.forEach(locObj => {
            const loc = locObj.name;
            if (!locationData[loc]) {
                locationData[loc] = {
                    total: 0,
                    complete: 0
                };
            }
        });
    }

    // Calculate totals
    const totalLocations = Object.keys(locationData).length;
    const totalAssets = assetsData.length;
    
    // Calculate average capacity usage
    let totalUsagePercent = 0;
    let locationsWithCap = 0;
    let fullLocationsCount = 0;
    
    Object.entries(locationData).forEach(([loc, data]) => {
        const maxCap = locationCapacity[loc] || 0;
        if (maxCap > 0) {
            const usagePercent = data.total > 0 ? (data.total / maxCap) * 100 : 0;
            totalUsagePercent += usagePercent;
            locationsWithCap++;
            if (usagePercent >= 90) fullLocationsCount++;
        }
    });
    
    const avgCapacity = locationsWithCap > 0 
        ? Math.round(totalUsagePercent / locationsWithCap) 
        : 0;

    // Update stats
    document.getElementById('totalLocations').textContent = totalLocations;
    document.getElementById('avgCapacity').textContent = avgCapacity + '%';
    document.getElementById('totalAssetsInLocations').textContent = totalAssets;
    document.getElementById('fullLocations').textContent = fullLocationsCount;

    // Update location table
    const tbody = document.getElementById('locationsTableBody');
    if (tbody) {
        const sortedLocations = Object.entries(locationData).sort((a, b) => {
            if (a[0] === 'ไม่ระบุ') return 1;
            if (b[0] === 'ไม่ระบุ') return -1;
            return a[0].localeCompare(b[0], 'th');
        });
        
        tbody.innerHTML = sortedLocations.map(([location, data]) => {
            const maxCap = locationCapacity[location] || 0;
            const usagePercent = maxCap > 0 && data.total > 0 ? (data.total / maxCap) * 100 : 0;
            
            let statusClass, statusText;
            if (maxCap === 0) {
                statusClass = 'available';
                statusText = 'ไม่กำหนด';
            } else if (data.total === 0) {
                statusClass = 'complete';
                statusText = 'ว่าง';
            } else if (usagePercent >= 90) {
                statusClass = 'broken';
                statusText = 'เต็ม (>90%)';
            } else if (usagePercent >= 70) {
                statusClass = 'maintenance';
                statusText = 'เตือน (70-90%)';
            } else {
                statusClass = 'complete';
                statusText = 'ปกติ (<70%)';
            }
            
            const progressBarWidth = maxCap > 0 && data.total > 0 ? Math.min(usagePercent, 100) : 0;
            const progressBarColor = usagePercent >= 90 ? '#ef4444' : usagePercent >= 70 ? '#f59e0b' : '#10b981';
            const isEmptyLocation = data.total === 0;
            
            return `
                <tr ${isEmptyLocation ? 'style="background: #f9fafb;"' : ''}>
                    <td>
                        <strong>${location}</strong>
                        ${isEmptyLocation ? '<span style="color: #999; font-size: 12px; margin-left: 8px;">(ว่าง)</span>' : ''}
                    </td>
                    <td>-</td>
                    <td style="text-align: center; font-weight: 600; ${isEmptyLocation ? 'color: #999;' : ''}">
                        ${data.total}
                    </td>
                    <td style="text-align: center;">
                        ${maxCap > 0 ? maxCap : '<span style="color: #999;">-</span>'}
                    </td>
                    <td>
                        ${maxCap > 0 && data.total > 0 ? `
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="flex: 1; background: #e5e5e5; border-radius: 10px; height: 20px; overflow: hidden;">
                                    <div style="background: ${progressBarColor}; width: ${progressBarWidth}%; height: 100%; 
                                                display: flex; align-items: center; justify-content: center; 
                                                color: white; font-size: 11px; font-weight: 600; transition: all 0.3s;">
                                        ${usagePercent.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        ` : '<span style="color: #999;">-</span>'}
                    </td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                    <td style="text-align: center;">
                        <button class="action-btn primary" onclick="editCapacity('${location}', ${data.total})" title="แก้ไขความจุ">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

/**
 * เปิด Modal จัดการสถานที่
 */
function openManageLocationsModal() {
    loadManageLocationsTable();
    openModal('manageLocationsModal');
}

/**
 * โหลดตารางในหน้าจัดการสถานที่
 */
function loadManageLocationsTable() {
    const tbody = document.getElementById('manageLocationsTableBody');
    if (!tbody) return;
    
    const allLocations = typeof getAllLocations === 'function' 
        ? getAllLocations() 
        : [...new Set(assetsData.map(a => a.location).filter(Boolean))];
    
    const locationCounts = {};
    assetsData.forEach(asset => {
        const loc = asset.location || 'ไม่ระบุ';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    
    tbody.innerHTML = allLocations.map(location => {
        const count = locationCounts[location] || 0;
        const capacity = locationCapacity[location] || '-';
        const isCustom = customLocations && customLocations.some(l => l.name === location);
        const canDelete = isCustom && count === 0;

        return `
            <tr>
                <td>
                    <strong>${location}</strong>
                    ${isCustom ? '<span class="badge complete" style="margin-left: 10px; font-size: 10px;">กำหนดเอง</span>' : ''}
                </td>
                <td style="text-align: center; font-weight: 600;">${count}</td>
                <td style="text-align: center;">${capacity !== '-' ? capacity : '<span style="color: #999;">ไม่ระบุ</span>'}</td>
                <td style="text-align: center;">
                    <button class="action-btn primary" onclick="editCapacity('${location}', ${count})" title="ตั้งค่าความจุ">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${canDelete ? `
                        <button class="action-btn danger" onclick="deleteLocation('${location}')" title="ลบสถานที่">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * แก้ไขความจุสถานที่
 */
function editCapacity(location, currentAssets) {
    const currentCapacity = locationCapacity[location] || 0;
    const newCapacity = prompt(
        `ตั้งค่าความจุสำหรับ: ${location}\n\n` +
        `จำนวนทรัพย์สินปัจจุบัน: ${currentAssets}\n` +
        `ความจุปัจจุบัน: ${currentCapacity > 0 ? currentCapacity : 'ไม่กำหนด'}\n\n` +
        `กรอกความจุใหม่ (0 = ไม่กำหนด):`,
        currentCapacity
    );
    
    if (newCapacity === null) return;
    
    const capacity = parseInt(newCapacity);
    if (isNaN(capacity) || capacity < 0) {
        alert('❌ กรุณากรอกตัวเลขที่ถูกต้อง (0 หรือมากกว่า)');
        return;
    }
    
    if (capacity > 0 && capacity < currentAssets) {
        const confirm = window.confirm(
            `⚠️ คำเตือน!\n\n` +
            `ความจุที่กำหนด (${capacity}) น้อยกว่าจำนวนทรัพย์สินปัจจุบัน (${currentAssets})\n\n` +
            `ต้องการดำเนินการต่อหรือไม่?`
        );
        if (!confirm) return;
    }
    
    locationCapacity[location] = capacity;
    localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));
    
    loadManageLocationsTable();
    updateLocationsPage();
    
    showNotification(`✅ อัพเดทความจุ "${location}" เป็น ${capacity > 0 ? capacity : 'ไม่กำหนด'} สำเร็จ!`, 'success');
}

/**
 * ลบสถานที่
 */
function deleteLocation(location) {
    const assetCount = assetsData.filter(a => a.location === location).length;
    
    if (assetCount > 0) {
        alert(`❌ ไม่สามารถลบได้!\n\nสถานที่ "${location}" มีทรัพย์สิน ${assetCount} รายการ\nกรุณาย้ายหรือลบทรัพย์สินก่อน`);
        return;
    }
    
    const confirm = window.confirm(`ยืนยันการลบสถานที่ "${location}"?`);
    if (!confirm) return;
    
    // ลบจาก customLocations
    if (typeof customLocations !== 'undefined') {
        customLocations = customLocations.filter(l => l.name !== location);
        localStorage.setItem('fmcgCustomLocations', JSON.stringify(customLocations));
    }
    
    // ลบจาก locationCapacity
    delete locationCapacity[location];
    localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));
    
    loadManageLocationsTable();
    updateLocationsPage();
    
    showNotification(`✅ ลบสถานที่ "${location}" สำเร็จ!`, 'success');
}

/**
 * เพิ่มสถานที่ใหม่ (จากปุ่ม "เพิ่มสถานที่")
 */
function openAddLocationModal() {
    openModal('addLocationModal');
    document.getElementById('newLocationName').value = '';
    document.getElementById('newLocationCapacity').value = '';
    if (document.getElementById('newLocationDescription')) {
        document.getElementById('newLocationDescription').value = '';
    }
}

/**
 * บันทึกสถานที่ใหม่
 * บันทึกลง Google Sheets ทันที
 */
async function saveNewLocation() {
    const nameInput = document.getElementById('newLocationName');
    const capacityInput = document.getElementById('newLocationCapacity');
    
    const name = nameInput.value.trim();
    if (!name) {
        alert('❌ กรุณากรอกชื่อสถานที่');
        nameInput.focus();
        return;
    }
    
    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const allLocations = typeof getAllLocations === 'function' 
        ? getAllLocations() 
        : [...new Set(assetsData.map(a => a.location).filter(Boolean))];
    
    if (allLocations.includes(name)) {
        alert(`❌ สถานที่ "${name}" มีอยู่แล้วในระบบ`);
        return;
    }
    
    // เพิ่มลง customLocations
    if (typeof customLocations === 'undefined') {
        window.customLocations = [];
    }
    
    const capacity = parseInt(capacityInput.value) || 0;
    
    customLocations.push({
        name: name,
        capacity: capacity
    });
    localStorage.setItem('fmcgCustomLocations', JSON.stringify(customLocations));
    
    // เพิ่มลง locationCapacity
    if (capacity > 0) {
        locationCapacity[name] = capacity;
        localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));
    }
    
    closeModal('addLocationModal');
    
    // บันทึกลง Google Sheets ทันที
    await syncLocationsToSheets();
    
    updateLocationsPage();
    
    showNotification(`✅ เพิ่มสถานที่ "${name}" และบันทึกลง Sheets สำเร็จ!`, 'success');
}

// ===== GOOGLE SHEETS SYNC =====

/**
 * บันทึกข้อมูลสถานที่ลง Google Sheets
 */
async function syncLocationsToSheets() {
    try {
        showNotification('⏳ กำลังบันทึกข้อมูลลง Google Sheets...', 'info');
        
        const allLocations = typeof getAllLocations === 'function' 
            ? getAllLocations() 
            : [...new Set(assetsData.map(a => a.location).filter(Boolean))];
        
        const rows = [];
        
        allLocations.forEach(location => {
            const capacity = locationCapacity[location] || 0;
            const assetCount = assetsData.filter(a => a.location === location).length;
            const isCustom = customLocations && customLocations.some(l => l.name === location);
            
            rows.push([
                location,
                capacity,
                assetCount,
                isCustom ? 'Yes' : 'No',
                formatThaiDateTime(new Date())
            ]);
        });
        
        const response = await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveLocations',
                data: rows
            })
        });
        
        showNotification('✅ บันทึกข้อมูลลง Google Sheets สำเร็จ!', 'success');
        return true;
        
    } catch (error) {
        console.error('Error saving to sheets:', error);
        showNotification('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
        return false;
    }
}

/**
 * โหลดข้อมูลสถานที่จาก Google Sheets
 * @param {boolean} silent - ถ้าเป็น true จะไม่แสดง notification
 */
async function loadLocationsFromSheets(silent = false) {
    try {
        if (!silent) {
            showNotification('⏳ กำลังโหลดข้อมูลจาก Google Sheets...', 'info');
        }
        
        const response = await fetch(SHEETS_API_URL + '?action=getLocations');
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 1) {
            // ข้าม header row
            const locationsData = result.data.slice(1);
            
            // อัพเดทข้อมูล
            locationCapacity = {};
            if (typeof customLocations === 'undefined') {
                window.customLocations = [];
            } else {
                customLocations = [];
            }
            
            locationsData.forEach(row => {
                if (row[0]) {
                    const name = row[0];
                    const capacity = parseInt(row[1]) || 0;
                    const isCustom = row[3] === 'Yes';
                    
                    locationCapacity[name] = capacity;
                    
                    if (isCustom) {
                        customLocations.push({
                            name: name,
                            capacity: capacity
                        });
                    }
                }
            });
            
            // บันทึก localStorage
            localStorage.setItem('fmcgLocationCapacity', JSON.stringify(locationCapacity));
            localStorage.setItem('fmcgCustomLocations', JSON.stringify(customLocations));
            
            // อัพเดทหน้า (แต่อย่าเรียก updateLocationsPage() ซ้ำซ้อน)
            if (document.getElementById('manageLocationsModal') && 
                document.getElementById('manageLocationsModal').classList.contains('active')) {
                loadManageLocationsTable();
            }
            
            if (!silent) {
                showNotification('✅ โหลดข้อมูลจาก Google Sheets สำเร็จ!', 'success');
            }
            return true;
        }
        
        if (!silent) {
            console.log('ไม่พบข้อมูลสถานที่ใน Google Sheets หรือยังไม่มี header');
        }
        return false;
        
    } catch (error) {
        console.error('Error loading from sheets:', error);
        if (!silent) {
            showNotification('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
        }
        return false;
    }
}
    }
}

/**
 * บันทึกข้อมูลทรัพย์สินลง Google Sheets
 */
async function syncAssetsToSheets() {
    try {
        showNotification('⏳ กำลังบันทึกข้อมูลทรัพย์สินลง Google Sheets...', 'info');
        
        if (!assetsData || assetsData.length === 0) {
            showNotification('⚠️ ไม่มีข้อมูลทรัพย์สินให้บันทึก', 'warning');
            return false;
        }
        
        const response = await fetch(SHEETS_API_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveAssets',
                data: assetsData
            })
        });
        
        showNotification('✅ บันทึกข้อมูลทรัพย์สินลง Google Sheets สำเร็จ!', 'success');
        return true;
        
    } catch (error) {
        console.error('Error saving assets to sheets:', error);
        showNotification('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
        return false;
    }
}

/**
 * โหลดข้อมูลทรัพย์สินจาก Google Sheets
 */
async function loadAssetsFromSheets() {
    try {
        showNotification('⏳ กำลังโหลดข้อมูลทรัพย์สินจาก Google Sheets...', 'info');
        
        const response = await fetch(SHEETS_API_URL + '?action=getAssets');
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 1) {
            // ข้าม header row
            const assetsRows = result.data.slice(1);
            
            // แปลงข้อมูลจาก Sheet เป็น assetsData
            assetsData = assetsRows.map(row => ({
                code: row[0] || '',
                name: row[1] || '',
                category: row[2] || '',
                location: row[3] || '',
                quantity: parseInt(row[4]) || 1,
                unit: row[5] || 'ชิ้น',
                status: row[6] || 'สมบูรณ์',
                purchaseDate: row[7] || '',
                price: parseFloat(row[8]) || 0,
                supplier: row[9] || '',
                warranty: row[10] || '',
                description: row[11] || '',
                lastUpdated: row[12] || ''
            }));
            
            // บันทึก localStorage
            localStorage.setItem('fmcgAssets', JSON.stringify(assetsData));
            
            // อัพเดทหน้า
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof updateAssetsPage === 'function') updateAssetsPage();
            if (typeof updateLocationsPage === 'function') updateLocationsPage();
            
            showNotification(`✅ โหลดข้อมูลทรัพย์สิน ${assetsData.length} รายการจาก Google Sheets สำเร็จ!`, 'success');
            return true;
        }
        
        showNotification('⚠️ ไม่พบข้อมูลทรัพย์สินใน Google Sheets', 'warning');
        return false;
        
    } catch (error) {
        console.error('Error loading assets from sheets:', error);
        showNotification('❌ เกิดข้อผิดพลาด: ' + error.message, 'error');
        return false;
    }
}

// ===== DEBUG FUNCTIONS =====

/**
 * ตรวจสอบ Modal
 */
function debugLocationsModal() {
    console.log('🔍 Debugging Locations Modal...');
    
    const modal = document.getElementById('manageLocationsModal');
    if (!modal) {
        console.error('❌ Modal "manageLocationsModal" not found!');
        return false;
    }
    console.log('✅ Modal found:', modal);
    
    if (typeof openModal !== 'function') {
        console.error('❌ Function "openModal" not defined!');
        return false;
    }
    console.log('✅ openModal function exists');
    
    if (typeof openManageLocationsModal !== 'function') {
        console.error('❌ Function "openManageLocationsModal" not defined!');
        return false;
    }
    console.log('✅ openManageLocationsModal function exists');
    
    if (typeof loadManageLocationsTable !== 'function') {
        console.error('❌ Function "loadManageLocationsTable" not defined!');
        return false;
    }
    console.log('✅ loadManageLocationsTable function exists');
    
    const tbody = document.getElementById('manageLocationsTableBody');
    if (!tbody) {
        console.error('❌ Table body "manageLocationsTableBody" not found!');
        return false;
    }
    console.log('✅ Table body found:', tbody);
    
    console.log('✅ All checks passed!');
    return true;
}

/**
 * ตรวจสอบข้อมูลสถานที่
 */
function checkLocationsData() {
    console.log('=== Locations Data Debug ===');
    console.log('📦 Total Assets:', assetsData.length);
    console.log('📍 Custom Locations:', customLocations);
    console.log('📊 Location Capacity:', locationCapacity);
    
    const locationCounts = {};
    assetsData.forEach(asset => {
        const loc = asset.location || 'ไม่ระบุ';
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    console.log('📈 Asset Counts by Location:', locationCounts);
    
    const allLocations = typeof getAllLocations === 'function' 
        ? getAllLocations() 
        : [...new Set(assetsData.map(a => a.location).filter(Boolean))];
    console.log('🗺️ All Locations:', allLocations);
    
    const emptyLocations = allLocations.filter(loc => !locationCounts[loc] || locationCounts[loc] === 0);
    console.log('🏚️ Empty Locations:', emptyLocations);
    
    console.log('=========================');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateLocationsPage,
        openManageLocationsModal,
        loadManageLocationsTable,
        editCapacity,
        deleteLocation,
        openAddLocationModal,
        saveNewLocation,
        syncLocationsToSheets,
        loadLocationsFromSheets,
        syncAssetsToSheets,
        loadAssetsFromSheets,
        debugLocationsModal,
        checkLocationsData
    };
}

console.log('✅ Locations Manager loaded successfully!');
console.log('💡 Tips:');
console.log('  - Run debugLocationsModal() to check modal');
console.log('  - Run checkLocationsData() to see locations data');
console.log('  - Run syncLocationsToSheets() to save locations to Google Sheets');
console.log('  - Run loadLocationsFromSheets() to load locations from Google Sheets');
console.log('  - Run syncAssetsToSheets() to save assets to Google Sheets');
console.log('  - Run loadAssetsFromSheets() to load assets from Google Sheets');
