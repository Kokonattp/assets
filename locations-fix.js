/**
 * FMCG Asset Management - Locations Page Fix
 * แก้ไขปัญหา:
 * 1. คลังอื่นไม่แสดงในรายการ (แสดงเฉพาะคลังที่มีทรัพย์สิน)
 * 2. Modal จัดการสถานที่ไม่เปิด
 * 
 * วิธีใช้: เพิ่มโค้ดนี้ในไฟล์ index.html หรือแทนที่ฟังก์ชันเดิม
 */

/**
 * ===== แก้ไข updateLocationsPage() =====
 * เพิ่มการแสดงสถานที่ที่ไม่มีทรัพย์สินด้วย
 */
function updateLocationsPage() {
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

    // 🔧 แก้ไข: รวมทั้งสถานที่จาก assetsData และ customLocations
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
    
    // 🔧 แก้ไข: เพิ่มสถานที่จาก customLocations ที่ยังไม่มีในรายการ
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
        // ถ้าไม่มี getAllLocations ให้ใช้ customLocations โดยตรง
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
        // เรียงลำดับสถานที่ตามชื่อ
        const sortedLocations = Object.entries(locationData).sort((a, b) => {
            // ให้ "ไม่ระบุ" อยู่ท้ายสุด
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
            
            // 🔧 แก้ไข: แสดงว่าสถานที่ว่างหรือไม่
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
 * ===== ตรวจสอบและแก้ไข Modal =====
 */
function debugLocationsModal() {
    console.log('🔍 Debugging Locations Modal...');
    
    // ตรวจสอบว่า Modal มีอยู่หรือไม่
    const modal = document.getElementById('manageLocationsModal');
    if (!modal) {
        console.error('❌ Modal "manageLocationsModal" not found!');
        return false;
    }
    console.log('✅ Modal found:', modal);
    
    // ตรวจสอบว่าฟังก์ชัน openModal มีอยู่หรือไม่
    if (typeof openModal !== 'function') {
        console.error('❌ Function "openModal" not defined!');
        return false;
    }
    console.log('✅ openModal function exists');
    
    // ตรวจสอบว่าฟังก์ชัน openManageLocationsModal มีอยู่หรือไม่
    if (typeof openManageLocationsModal !== 'function') {
        console.error('❌ Function "openManageLocationsModal" not defined!');
        return false;
    }
    console.log('✅ openManageLocationsModal function exists');
    
    // ตรวจสอบว่าฟังก์ชัน loadManageLocationsTable มีอยู่หรือไม่
    if (typeof loadManageLocationsTable !== 'function') {
        console.error('❌ Function "loadManageLocationsTable" not defined!');
        return false;
    }
    console.log('✅ loadManageLocationsTable function exists');
    
    // ตรวจสอบว่า tbody มีอยู่หรือไม่
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
 * ===== ฟังก์ชันสำรองเปิด Modal =====
 * ใช้ในกรณีที่ฟังก์ชันเดิมไม่ทำงาน
 */
function forceOpenManageLocationsModal() {
    console.log('🔧 Force opening Manage Locations Modal...');
    
    // โหลดข้อมูลในตาราง
    if (typeof loadManageLocationsTable === 'function') {
        loadManageLocationsTable();
    } else {
        // ถ้าไม่มีฟังก์ชัน ให้สร้างเอง
        const tbody = document.getElementById('manageLocationsTableBody');
        if (tbody) {
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
    }
    
    // เปิด Modal
    const modal = document.getElementById('manageLocationsModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ Modal opened successfully!');
    } else {
        console.error('❌ Modal not found!');
    }
}

/**
 * ===== ฟังก์ชันตรวจสอบและแสดงข้อมูล Debug =====
 */
function checkLocationsData() {
    console.log('=== Locations Data Debug ===');
    console.log('📦 Total Assets:', assetsData.length);
    console.log('📍 Custom Locations:', customLocations);
    console.log('📊 Location Capacity:', locationCapacity);
    
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
    
    // สถานที่ที่ไม่มีทรัพย์สิน
    const emptyLocations = allLocations.filter(loc => !locationCounts[loc] || locationCounts[loc] === 0);
    console.log('🏚️ Empty Locations:', emptyLocations);
    
    console.log('=========================');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateLocationsPage,
        debugLocationsModal,
        forceOpenManageLocationsModal,
        checkLocationsData
    };
}

console.log('✅ Locations Fix loaded successfully!');
console.log('💡 Tips:');
console.log('  - Run debugLocationsModal() to check modal');
console.log('  - Run forceOpenManageLocationsModal() to force open modal');
console.log('  - Run checkLocationsData() to see locations data');
