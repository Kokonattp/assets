/**
 * FMCG Asset Management - History Tracking Module
 * บันทึกประวัติการเปลี่ยนแปลงทรัพย์สินทั้งหมด
 */

// Global variable สำหรับเก็บประวัติ
let assetHistory = [];

/**
 * โหลดประวัติจาก localStorage
 */
function loadHistoryFromLocalStorage() {
    const saved = localStorage.getItem('fmcgAssetHistory');
    if (saved) {
        try {
            assetHistory = JSON.parse(saved);
        } catch (e) {
            console.error('Error loading history:', e);
            assetHistory = [];
        }
    }
}

/**
 * บันทึกประวัติลง localStorage
 */
function saveHistoryToLocalStorage() {
    localStorage.setItem('fmcgAssetHistory', JSON.stringify(assetHistory));
}

/**
 * เพิ่มประวัติการเปลี่ยนแปลง
 * @param {string} assetCode - รหัสทรัพย์สิน
 * @param {string} action - ประเภทการเปลี่ยนแปลง (CREATE, UPDATE, TRANSFER, DELETE, STATUS_CHANGE)
 * @param {object} changes - ข้อมูลการเปลี่ยนแปลง
 * @param {string} remarks - หมายเหตุเพิ่มเติม
 */
function addAssetHistory(assetCode, action, changes, remarks = '') {
    const asset = assetsData.find(a => a.code === assetCode);
    
    const historyEntry = {
        id: 'HIST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        assetCode: assetCode,
        assetName: asset ? asset.name : changes.assetName || 'N/A',
        action: action,
        timestamp: new Date().toISOString(),
        user: 'Admin', // สามารถเปลี่ยนเป็นระบบ login ได้
        changes: changes,
        remarks: remarks
    };
    
    assetHistory.unshift(historyEntry); // เพิ่มที่ตำแหน่งแรก (ล่าสุดก่อน)
    
    // จำกัดจำนวนประวัติไว้ไม่เกิน 5000 รายการ
    if (assetHistory.length > 5000) {
        assetHistory = assetHistory.slice(0, 5000);
    }
    
    saveHistoryToLocalStorage();
    
    // ไม่ sync อัตโนมัติ - จะ sync เมื่อกดปุ่ม "Sync to Sheets" เท่านั้น
    // เพื่อลดจำนวน API calls และเพิ่มความเร็ว
    
    return historyEntry;
}

/**
 * บันทึกประวัติการสร้างทรัพย์สินใหม่
 */
function logAssetCreation(asset) {
    const changes = {
        assetName: asset.name,
        category: asset.category,
        location: asset.location,
        department: asset.department,
        price: asset.price,
        quantity: asset.quantity || 1,
        status: asset.status || 'สมบูรณ์'
    };
    
    addAssetHistory(
        asset.code,
        'CREATE',
        changes,
        'สร้างทรัพย์สินใหม่'
    );
}

/**
 * บันทึกประวัติการแก้ไขทรัพย์สิน
 */
function logAssetUpdate(oldAsset, newAsset) {
    const changes = {
        before: {},
        after: {}
    };
    
    // เปรียบเทียบการเปลี่ยนแปลง
    const fieldsToTrack = [
        'name', 'category', 'brand', 'model', 'serial',
        'location', 'department', 'status', 'price', 
        'quantity', 'purchaseDate', 'description'
    ];
    
    let hasChanges = false;
    fieldsToTrack.forEach(field => {
        if (oldAsset[field] !== newAsset[field]) {
            changes.before[field] = oldAsset[field];
            changes.after[field] = newAsset[field];
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        addAssetHistory(
            newAsset.code,
            'UPDATE',
            changes,
            'แก้ไขข้อมูลทรัพย์สิน'
        );
    }
}

/**
 * บันทึกประวัติการโอนย้าย
 */
function logAssetTransfer(asset, fromLocation, toLocation, fromDept, toDept) {
    const changes = {
        fromLocation: fromLocation,
        toLocation: toLocation,
        fromDepartment: fromDept,
        toDepartment: toDept
    };
    
    addAssetHistory(
        asset.code,
        'TRANSFER',
        changes,
        `โอนย้ายจาก "${fromLocation}" (${fromDept || 'N/A'}) ไปยัง "${toLocation}" (${toDept || 'N/A'})`
    );
}

/**
 * บันทึกประวัติการลบทรัพย์สิน
 */
function logAssetDeletion(asset) {
    const changes = {
        assetName: asset.name,
        category: asset.category,
        location: asset.location,
        department: asset.department,
        deletedAt: new Date().toISOString()
    };
    
    addAssetHistory(
        asset.code,
        'DELETE',
        changes,
        'ลบทรัพย์สินออกจากระบบ'
    );
}

/**
 * บันทึกประวัติการเปลี่ยนสถานะ
 */
function logStatusChange(asset, oldStatus, newStatus) {
    const changes = {
        oldStatus: oldStatus,
        newStatus: newStatus
    };
    
    addAssetHistory(
        asset.code,
        'STATUS_CHANGE',
        changes,
        `เปลี่ยนสถานะจาก "${oldStatus}" เป็น "${newStatus}"`
    );
}

/**
 * ดึงประวัติของทรัพย์สินตัวใดตัวหนึ่ง
 */
function getAssetHistory(assetCode) {
    return assetHistory.filter(h => h.assetCode === assetCode);
}

/**
 * ดึงประวัติล่าสุด n รายการ
 */
function getRecentHistory(limit = 50) {
    return assetHistory.slice(0, limit);
}

/**
 * Sync ประวัติไปยัง Google Sheets ด้วย Sheets API
 */
async function syncHistoryToSheets(historyEntries) {
    // ตรวจสอบว่ามีการตั้งค่า Sheets API หรือไม่
    if (typeof SHEETS_API_KEY === 'undefined' || typeof SPREADSHEET_ID === 'undefined') {
        console.log('Sheets API not configured (variables not defined)');
        return false;
    }
    
    if (!SHEETS_API_KEY || !SPREADSHEET_ID) {
        console.log('Sheets API key or Spreadsheet ID not set');
        showNotification('⚠️ กรุณาตั้งค่า Sheets API ในหน้าตั้งค่า', 'warning');
        return false;
    }
    
    try {
        // แปลงข้อมูลเป็น array of arrays สำหรับ Sheets API
        const values = historyEntries.map(entry => [
            entry.id,
            new Date(entry.timestamp).toLocaleString('th-TH'),
            entry.assetCode,
            entry.assetName,
            entry.action,
            getActionText(entry.action),
            JSON.stringify(entry.changes),
            entry.remarks,
            entry.user
        ]);
        
        // ชื่อ Sheet สำหรับประวัติ
        const historySheetName = 'AssetHistory';
        
        // ตรวจสอบว่ามี Sheet AssetHistory หรือยัง
        const sheetCheckUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${SHEETS_API_KEY}`;
        const checkResponse = await fetch(sheetCheckUrl);
        
        if (!checkResponse.ok) {
            throw new Error('ไม่สามารถเชื่อมต่อ Google Sheets ได้');
        }
        
        const spreadsheetData = await checkResponse.json();
        
        const historySheetExists = spreadsheetData.sheets?.some(
            sheet => sheet.properties.title === historySheetName
        );
        
        // ถ้ายังไม่มี Sheet ให้สร้าง
        if (!historySheetExists) {
            console.log('Creating AssetHistory sheet...');
            await createHistorySheet();
        }
        
        // Append ข้อมูลไปยัง Sheet
        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${historySheetName}!A:I:append?valueInputOption=RAW&key=${SHEETS_API_KEY}`;
        
        const response = await fetch(appendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: values
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Failed to sync history to Sheets');
        }
        
        console.log(`✅ Synced ${historyEntries.length} history entries to Google Sheets`);
        return true;
        
    } catch (error) {
        console.error('❌ Error syncing history to Sheets:', error);
        return false;
    }
}
        });
        
        if (!response.ok) {
            throw new Error('Failed to sync history to Sheets');
        }
        
        console.log(`Synced ${historyEntries.length} history entries to Google Sheets`);
        
    } catch (error) {
        console.error('Error syncing history to Sheets:', error);
    }
}

/**
 * สร้าง Sheet สำหรับประวัติ
 */
async function createHistorySheet() {
    try {
        const historySheetName = 'AssetHistory';
        
        // สร้าง Sheet ใหม่
        const createUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate?key=${SHEETS_API_KEY}`;
        
        const createResponse = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: [{
                    addSheet: {
                        properties: {
                            title: historySheetName,
                            gridProperties: {
                                frozenRowCount: 1
                            }
                        }
                    }
                }]
            })
        });
        
        if (!createResponse.ok) {
            throw new Error('Failed to create history sheet');
        }
        
        // เพิ่ม Header
        const headers = [[
            'History ID',
            'วันเวลา',
            'รหัสทรัพย์สิน',
            'ชื่อทรัพย์สิน',
            'การดำเนินการ',
            'การดำเนินการ (ไทย)',
            'รายละเอียด',
            'หมายเหตุ',
            'ผู้ดำเนินการ'
        ]];
        
        const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${historySheetName}!A1:I1?valueInputOption=RAW&key=${SHEETS_API_KEY}`;
        
        await fetch(headerUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: headers
            })
        });
        
        // จัดรูปแบบ Header (ตัวหนา, สีพื้นหลัง)
        const formatUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate?key=${SHEETS_API_KEY}`;
        
        // หา sheetId ของ AssetHistory
        const spreadsheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${SHEETS_API_KEY}`;
        const spreadsheetResponse = await fetch(spreadsheetUrl);
        const spreadsheetData = await spreadsheetResponse.json();
        
        const historySheet = spreadsheetData.sheets.find(
            sheet => sheet.properties.title === historySheetName
        );
        
        if (historySheet) {
            await fetch(formatUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    requests: [{
                        repeatCell: {
                            range: {
                                sheetId: historySheet.properties.sheetId,
                                startRowIndex: 0,
                                endRowIndex: 1
                            },
                            cell: {
                                userEnteredFormat: {
                                    backgroundColor: {
                                        red: 0.078,
                                        green: 0.722,
                                        blue: 0.651
                                    },
                                    textFormat: {
                                        foregroundColor: {
                                            red: 1,
                                            green: 1,
                                            blue: 1
                                        },
                                        bold: true
                                    }
                                }
                            },
                            fields: 'userEnteredFormat(backgroundColor,textFormat)'
                        }
                    }]
                })
            });
        }
        
        console.log('Created AssetHistory sheet successfully');
        
    } catch (error) {
        console.error('Error creating history sheet:', error);
    }
}

/**
 * Sync ทุกประวัติไปยัง Google Sheets ด้วย Sheets API
 */
async function syncAllHistoryToSheets() {
    if (assetHistory.length === 0) {
        showNotification('ไม่มีประวัติให้ซิงค์', 'warning');
        return;
    }
    
    if (typeof SHEETS_API_KEY === 'undefined' || typeof SPREADSHEET_ID === 'undefined') {
        showNotification('❌ กรุณาตั้งค่า Sheets API ก่อน', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // แบ่งเป็น batch ละ 100 รายการเพื่อไม่ให้ request ใหญ่เกินไป
        const batchSize = 100;
        let syncedCount = 0;
        
        for (let i = 0; i < assetHistory.length; i += batchSize) {
            const batch = assetHistory.slice(i, i + batchSize);
            await syncHistoryToSheets(batch);
            syncedCount += batch.length;
            
            // แสดงความคืบหน้า
            if (assetHistory.length > batchSize) {
                showNotification(`⏳ กำลังซิงค์... ${syncedCount}/${assetHistory.length}`, 'info');
            }
        }
        
        hideLoading();
        showNotification(`✅ ซิงค์ประวัติ ${assetHistory.length} รายการสำเร็จ!`, 'success');
    } catch (error) {
        hideLoading();
        console.error('Sync error:', error);
        showNotification('❌ เกิดข้อผิดพลาดในการซิงค์ประวัติ: ' + error.message, 'error');
    }
}

/**
 * แปลง action code เป็นข้อความ
 */
function getActionText(action) {
    const actionMap = {
        'CREATE': 'สร้างใหม่',
        'UPDATE': 'แก้ไข',
        'TRANSFER': 'โอนย้าย',
        'DELETE': 'ลบ',
        'STATUS_CHANGE': 'เปลี่ยนสถานะ'
    };
    return actionMap[action] || action;
}

/**
 * แสดงไอคอนตาม action
 */
function getActionIcon(action) {
    const iconMap = {
        'CREATE': '<i class="fas fa-plus-circle" style="color: #10b981;"></i>',
        'UPDATE': '<i class="fas fa-edit" style="color: #3b82f6;"></i>',
        'TRANSFER': '<i class="fas fa-exchange-alt" style="color: #f59e0b;"></i>',
        'DELETE': '<i class="fas fa-trash" style="color: #ef4444;"></i>',
        'STATUS_CHANGE': '<i class="fas fa-sync-alt" style="color: #8b5cf6;"></i>'
    };
    return iconMap[action] || '<i class="fas fa-info-circle"></i>';
}

/**
 * แสดงหน้า History
 */
function showHistoryPage() {
    showPage('history');
    renderHistoryTable();
}

/**
 * แสดงตารางประวัติ
 */
function renderHistoryTable(filter = 'all', searchTerm = '') {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;
    
    let filteredHistory = assetHistory;
    
    // กรองตาม action
    if (filter !== 'all') {
        filteredHistory = filteredHistory.filter(h => h.action === filter);
    }
    
    // ค้นหา
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredHistory = filteredHistory.filter(h => 
            h.assetCode.toLowerCase().includes(term) ||
            h.assetName.toLowerCase().includes(term) ||
            h.remarks.toLowerCase().includes(term)
        );
    }
    
    if (filteredHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #aaa;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                    ยังไม่มีประวัติการเปลี่ยนแปลง
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredHistory.map(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <tr>
                <td>${dateStr}</td>
                <td>
                    <div style="font-weight: 600;">${entry.assetCode}</div>
                    <small style="color: #666;">${entry.assetName}</small>
                </td>
                <td style="text-align: center;">
                    ${getActionIcon(entry.action)}
                    <div style="margin-top: 5px; font-size: 12px; font-weight: 600;">
                        ${getActionText(entry.action)}
                    </div>
                </td>
                <td>
                    <div style="font-size: 13px;">${entry.remarks}</div>
                    ${formatChanges(entry.changes)}
                </td>
                <td style="text-align: center;">${entry.user}</td>
                <td style="text-align: center;">
                    <button class="action-btn view" onclick="showHistoryDetail('${entry.id}')" title="รายละเอียด">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * จัดรูปแบบการเปลี่ยนแปลงให้อ่านง่าย
 */
function formatChanges(changes) {
    if (!changes || Object.keys(changes).length === 0) return '';
    
    let html = '<div style="margin-top: 5px; font-size: 12px; color: #666;">';
    
    if (changes.before && changes.after) {
        // กรณี UPDATE
        html += '<ul style="margin: 5px 0; padding-left: 20px;">';
        for (const key in changes.after) {
            html += `<li><strong>${key}:</strong> ${changes.before[key] || '-'} → ${changes.after[key]}</li>`;
        }
        html += '</ul>';
    } else if (changes.fromLocation && changes.toLocation) {
        // กรณี TRANSFER
        html += `<strong>จาก:</strong> ${changes.fromLocation} (${changes.fromDepartment || '-'}) `;
        html += `<strong>→ ไป:</strong> ${changes.toLocation} (${changes.toDepartment || '-'})`;
    } else if (changes.oldStatus && changes.newStatus) {
        // กรณี STATUS_CHANGE
        html += `<span class="badge ${getStatusClass(changes.oldStatus)}">${changes.oldStatus}</span> → `;
        html += `<span class="badge ${getStatusClass(changes.newStatus)}">${changes.newStatus}</span>`;
    }
    
    html += '</div>';
    return html;
}

/**
 * แสดงรายละเอียดประวัติ
 */
function showHistoryDetail(historyId) {
    const entry = assetHistory.find(h => h.id === historyId);
    if (!entry) return;
    
    // สร้าง modal แสดงรายละเอียด
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'historyDetailModal';
    
    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>${getActionIcon(entry.action)} รายละเอียดประวัติ</h2>
                <button class="close-btn" onclick="closeHistoryDetail()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background: #f9fafb; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong>รหัสทรัพย์สิน:</strong>
                            <div style="margin-top: 5px; font-size: 16px; color: var(--primary);">${entry.assetCode}</div>
                        </div>
                        <div>
                            <strong>ชื่อทรัพย์สิน:</strong>
                            <div style="margin-top: 5px;">${entry.assetName}</div>
                        </div>
                        <div>
                            <strong>การดำเนินการ:</strong>
                            <div style="margin-top: 5px;">${getActionText(entry.action)}</div>
                        </div>
                        <div>
                            <strong>วันเวลา:</strong>
                            <div style="margin-top: 5px;">${dateStr}</div>
                        </div>
                        <div>
                            <strong>ผู้ดำเนินการ:</strong>
                            <div style="margin-top: 5px;">${entry.user}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>หมายเหตุ:</strong>
                    <div style="margin-top: 5px; padding: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 5px;">
                        ${entry.remarks || '-'}
                    </div>
                </div>
                
                <div>
                    <strong>รายละเอียดการเปลี่ยนแปลง:</strong>
                    <div style="margin-top: 10px; padding: 15px; background: #fff; border: 1px solid #e5e7eb; border-radius: 5px;">
                        <pre style="margin: 0; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 13px;">${JSON.stringify(entry.changes, null, 2)}</pre>
                    </div>
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn btn-secondary" onclick="closeHistoryDetail()">
                        <i class="fas fa-times"></i> ปิด
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * ปิด History Detail Modal
 */
function closeHistoryDetail() {
    const modal = document.getElementById('historyDetailModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Filter History
 */
function filterHistory() {
    const filterAction = document.getElementById('filterHistoryAction')?.value || 'all';
    const searchTerm = document.getElementById('searchHistory')?.value || '';
    renderHistoryTable(filterAction, searchTerm);
}

/**
 * Export History to Excel
 */
function exportHistoryToExcel() {
    if (assetHistory.length === 0) {
        showNotification('ไม่มีประวัติให้ Export', 'warning');
        return;
    }
    
    const data = assetHistory.map(entry => ({
        'วันเวลา': new Date(entry.timestamp).toLocaleString('th-TH'),
        'รหัสทรัพย์สิน': entry.assetCode,
        'ชื่อทรัพย์สิน': entry.assetName,
        'การดำเนินการ': getActionText(entry.action),
        'หมายเหตุ': entry.remarks,
        'ผู้ดำเนินการ': entry.user,
        'รายละเอียด': JSON.stringify(entry.changes)
    }));
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Asset History');
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Asset_History_${date}.xlsx`);
    
    showNotification('✅ Export ประวัติสำเร็จ!', 'success');
}

// โหลดประวัติเมื่อเริ่มต้น
if (typeof window !== 'undefined') {
    window.addEventListener('load', function() {
        loadHistoryFromLocalStorage();
    });
}

/**
 * อัพเดทสถิติหน้า History
 */
function updateHistoryStats() {
    const createCount = assetHistory.filter(h => h.action === 'CREATE').length;
    const updateCount = assetHistory.filter(h => h.action === 'UPDATE').length;
    const transferCount = assetHistory.filter(h => h.action === 'TRANSFER').length;
    const deleteCount = assetHistory.filter(h => h.action === 'DELETE').length;
    
    const createEl = document.getElementById('historyCreateCount');
    const updateEl = document.getElementById('historyUpdateCount');
    const transferEl = document.getElementById('historyTransferCount');
    const deleteEl = document.getElementById('historyDeleteCount');
    
    if (createEl) createEl.textContent = createCount;
    if (updateEl) updateEl.textContent = updateCount;
    if (transferEl) transferEl.textContent = transferCount;
    if (deleteEl) deleteEl.textContent = deleteCount;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addAssetHistory,
        logAssetCreation,
        logAssetUpdate,
        logAssetTransfer,
        logAssetDeletion,
        logStatusChange,
        getAssetHistory,
        getRecentHistory,
        syncHistoryToSheets,
        syncAllHistoryToSheets,
        renderHistoryTable,
        showHistoryDetail,
        filterHistory,
        exportHistoryToExcel,
        updateHistoryStats
    };
}
