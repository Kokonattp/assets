/**
 * FMCG Asset Management - Fixed Asset Actions
 * แก้ไขปัญหา:
 * 1. สถานที่เก็บไม่แสดงใน Modal แก้ไข
 * 2. Modal โอนย้ายทำรายการไม่ได้
 * 3. Icon นับสตอค กรอกข้อมูลไม่ได้
 */

/**
 * แสดง Modal แก้ไขทรัพย์สิน (ปรับปรุงใหม่)
 */
function editAsset(code) {
    const asset = assetsData.find(a => a.code === code);
    if (!asset) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    console.log('📝 กำลังแก้ไขทรัพย์สิน:', asset);
    
    // อัพเดท location และ department dropdowns ให้แสดงค่าที่มีจริง
    updateLocationDropdowns();
    
    // รอให้ dropdown พร้อมก่อนเติมข้อมูล
    setTimeout(() => {
        // เติมข้อมูลลงในฟอร์ม
        document.getElementById('editAssetCode').value = asset.code;
        document.getElementById('editCode').value = asset.code;
        document.getElementById('editName').value = asset.name || '';
        document.getElementById('editCategory').value = asset.category || '';
        document.getElementById('editBrand').value = asset.brand || '';
        document.getElementById('editModel').value = asset.model || '';
        document.getElementById('editSerial').value = asset.serial || '';
        document.getElementById('editPurchaseDate').value = asset.purchaseDate || '';
        document.getElementById('editPrice').value = asset.price || 0;
        document.getElementById('editQuantity').value = asset.quantity || 1;
        
        // 🔧 แก้ไข: ตั้งค่า location และ department
        const locationSelect = document.getElementById('editLocation');
        const departmentSelect = document.getElementById('editDepartment');
        
        // เช็คว่ามีค่าที่ต้องการใน dropdown หรือไม่
        if (asset.location) {
            // ลองหาใน options ที่มีอยู่
            let locationFound = false;
            for (let i = 0; i < locationSelect.options.length; i++) {
                if (locationSelect.options[i].value === asset.location || 
                    locationSelect.options[i].text === asset.location) {
                    locationSelect.selectedIndex = i;
                    locationFound = true;
                    break;
                }
            }
            
            // ถ้าไม่เจอ ให้เพิ่ม option ใหม่
            if (!locationFound) {
                const newOption = new Option(asset.location, asset.location, true, true);
                locationSelect.add(newOption);
            }
        }
        
        if (asset.department) {
            // ลองหาใน options ที่มีอยู่
            let departmentFound = false;
            for (let i = 0; i < departmentSelect.options.length; i++) {
                if (departmentSelect.options[i].value === asset.department || 
                    departmentSelect.options[i].text === asset.department) {
                    departmentSelect.selectedIndex = i;
                    departmentFound = true;
                    break;
                }
            }
            
            // ถ้าไม่เจอ ให้เพิ่ม option ใหม่
            if (!departmentFound) {
                const newOption = new Option(asset.department, asset.department, true, true);
                departmentSelect.add(newOption);
            }
        }
        
        document.getElementById('editStatus').value = asset.status || 'สมบูรณ์';
        document.getElementById('editDescription').value = asset.description || '';
        
        console.log('✅ เติมข้อมูลสำเร็จ:', {
            location: locationSelect.value,
            department: departmentSelect.value
        });
    }, 100);
    
    // แสดง Modal
    document.getElementById('editAssetModal').classList.add('active');
}

/**
 * บันทึกการแก้ไขทรัพย์สิน
 */
function saveEditAsset() {
    const code = document.getElementById('editAssetCode').value;
    const name = document.getElementById('editName').value.trim();
    const category = document.getElementById('editCategory').value;
    const brand = document.getElementById('editBrand').value.trim();
    const model = document.getElementById('editModel').value.trim();
    const serial = document.getElementById('editSerial').value.trim();
    const purchaseDate = document.getElementById('editPurchaseDate').value;
    const price = parseFloat(document.getElementById('editPrice').value) || 0;
    const quantity = parseInt(document.getElementById('editQuantity').value) || 1;
    const location = document.getElementById('editLocation').value;
    const department = document.getElementById('editDepartment').value;
    const status = document.getElementById('editStatus').value;
    const description = document.getElementById('editDescription').value.trim();
    
    // Validate
    if (!name || !category || !location) {
        showNotification('⚠️ กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, หมวดหมู่, สถานที่)', 'warning');
        return;
    }
    
    // หาทรัพย์สินและแก้ไข
    const assetIndex = assetsData.findIndex(a => a.code === code);
    if (assetIndex === -1) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    // เก็บข้อมูลเดิมไว้สำหรับบันทึกประวัติ
    const oldAsset = { ...assetsData[assetIndex] };
    
    // อัพเดทข้อมูล
    assetsData[assetIndex] = {
        ...assetsData[assetIndex],
        name,
        category,
        brand,
        model,
        serial,
        purchaseDate,
        price,
        quantity,
        location,
        department,
        status,
        description,
        value: price * quantity, // คำนวณมูลค่ารวม
        lastUpdated: new Date().toISOString()
    };
    
    const newAsset = assetsData[assetIndex];
    
    // บันทึกลง localStorage
    localStorage.setItem('fmcgAssets', JSON.stringify(assetsData));
    
    // 📝 บันทึกประวัติการแก้ไข
    if (typeof logAssetUpdate === 'function') {
        logAssetUpdate(oldAsset, newAsset);
    }
    
    // ถ้ามีการเชื่อมต่อ Google Sheets ให้ซิงค์
    if (typeof sheetsConfig !== 'undefined' && sheetsConfig.webAppUrl) {
        syncToSheets();
    }
    
    // ปิด Modal
    closeModal('editAssetModal');
    
    // แสดง notification
    showNotification(`✅ แก้ไขทรัพย์สิน "${name}" สำเร็จ!`, 'success');
    
    // อัพเดทหน้าจอ
    updateAssetsPage();
    updateDashboard();
}

/**
 * เปิด Modal โอนย้าย (ปรับปรุงใหม่)
 */
function openTransferModal(code) {
    const asset = assetsData.find(a => a.code === code);
    if (!asset) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    console.log('🔄 กำลังโอนย้ายทรัพย์สิน:', asset);
    
    // เก็บข้อมูลทรัพย์สิน
    document.getElementById('transferAssetId').value = asset.code;
    
    // แสดงข้อมูลทรัพย์สิน
    document.getElementById('transferAssetInfo').textContent = 
        `${asset.code} - ${asset.name}`;
    
    // แสดงข้อมูลปัจจุบัน
    document.getElementById('currentLocation').textContent = asset.location || '-';
    document.getElementById('currentDepartment').textContent = asset.department || '-';
    
    // ล้างฟอร์ม
    document.getElementById('newLocation').value = '';
    document.getElementById('newDepartment').value = '';
    document.getElementById('transferReason').value = '';
    document.getElementById('transferNote').value = '';
    
    // อัพเดท datalists
    updateLocationDropdowns();
    
    // แสดง Modal
    document.getElementById('transferModal').classList.add('active');
}

/**
 * ยืนยันการโอนย้าย (แก้ไขใหม่)
 */
function confirmTransfer() {
    const code = document.getElementById('transferAssetId').value;
    const newLocation = document.getElementById('newLocation').value.trim();
    const newDepartment = document.getElementById('newDepartment').value.trim();
    const reason = document.getElementById('transferReason').value.trim();
    const note = document.getElementById('transferNote').value.trim();
    
    console.log('🔍 ตรวจสอบข้อมูล:', {
        code,
        newLocation,
        newDepartment,
        reason,
        note
    });
    
    // 🔧 แก้ไข: Validate แบบละเอียด
    if (!code) {
        showNotification('❌ ไม่พบรหัสทรัพย์สิน', 'error');
        return;
    }
    
    if (!newLocation) {
        showNotification('⚠️ กรุณาระบุสถานที่ใหม่', 'warning');
        document.getElementById('newLocation').focus();
        return;
    }
    
    if (!newDepartment) {
        showNotification('⚠️ กรุณาระบุแผนกใหม่', 'warning');
        document.getElementById('newDepartment').focus();
        return;
    }
    
    if (!reason) {
        showNotification('⚠️ กรุณาระบุเหตุผลในการโอนย้าย', 'warning');
        document.getElementById('transferReason').focus();
        return;
    }
    
    // หาทรัพย์สิน
    const assetIndex = assetsData.findIndex(a => a.code === code);
    if (assetIndex === -1) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    const asset = assetsData[assetIndex];
    const oldLocation = asset.location;
    const oldDepartment = asset.department;
    
    // อัพเดทข้อมูล
    assetsData[assetIndex] = {
        ...asset,
        location: newLocation,
        department: newDepartment,
        lastUpdated: new Date().toISOString()
    };
    
    // บันทึกลง localStorage
    localStorage.setItem('fmcgAssets', JSON.stringify(assetsData));
    
    // 📝 บันทึกประวัติการโอนย้าย
    if (typeof addAssetHistory === 'function') {
        addAssetHistory(
            code,
            'TRANSFER',
            {
                from: {
                    location: oldLocation,
                    department: oldDepartment
                },
                to: {
                    location: newLocation,
                    department: newDepartment
                },
                reason: reason,
                note: note
            },
            `โอนย้ายจาก ${oldLocation} (${oldDepartment}) ไป ${newLocation} (${newDepartment})`
        );
    }
    
    // ซิงค์กับ Google Sheets
    if (typeof sheetsConfig !== 'undefined' && sheetsConfig.webAppUrl) {
        syncToSheets();
    }
    
    // ปิด Modal
    closeModal('transferModal');
    
    // แสดง notification
    showNotification(
        `✅ โอนย้าย "${asset.name}" สำเร็จ!\n📍 ${oldLocation} → ${newLocation}\n🏢 ${oldDepartment} → ${newDepartment}`, 
        'success'
    );
    
    // อัพเดทหน้าจอ
    updateAssetsPage();
    updateDashboard();
    updateDepartmentPage();
    updateLocationsPage();
}

/**
 * เปิด Modal นับสตอค (ปรับปรุงใหม่)
 */
function openStockCountModal(code) {
    const asset = assetsData.find(a => a.code === code);
    if (!asset) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    console.log('📊 กำลังนับสตอค:', asset);
    
    // ตรวจสอบว่าเริ่มนับสตอคแล้วหรือยัง
    if (!stockCountData || stockCountData.length === 0) {
        showNotification('⚠️ กรุณาเริ่มนับสตอคก่อน (ไปที่เมนู "นับสตอค")', 'warning');
        return;
    }
    
    // ตรวจสอบว่าทรัพย์สินนี้อยู่ในรายการนับสตอคหรือไม่
    const stockItem = stockCountData.find(s => s.code === code);
    if (!stockItem) {
        showNotification('⚠️ ทรัพย์สินนี้ไม่อยู่ในรายการนับสตอคปัจจุบัน', 'warning');
        return;
    }
    
    // สร้าง Modal นับสตอคแบบ Custom
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'quickStockCountModal';
    modal.style.zIndex = '10000';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px; animation: modalSlideIn 0.3s ease;">
            <style>
                @keyframes modalSlideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .stock-modal-header {
                    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
                    color: white;
                    padding: 25px;
                    border-radius: 15px 15px 0 0;
                    text-align: center;
                    margin: -20px -20px 20px -20px;
                }
                
                .stock-icon {
                    font-size: 64px;
                    margin-bottom: 10px;
                    animation: bounce 1s ease infinite;
                }
                
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
                
                .asset-detail-box {
                    background: #f0f9f9;
                    border: 2px solid var(--primary-light);
                    border-radius: 10px;
                    padding: 15px;
                    margin: 20px 0;
                }
                
                .asset-detail-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    padding: 5px 0;
                }
                
                .asset-detail-label {
                    color: #666;
                    font-weight: 500;
                }
                
                .asset-detail-value {
                    color: var(--primary);
                    font-weight: 600;
                }
                
                .form-group-inline {
                    margin: 15px 0;
                }
                
                .form-group-inline label {
                    display: block;
                    margin-bottom: 8px;
                    color: #333;
                    font-weight: 600;
                }
                
                .form-group-inline input,
                .form-group-inline textarea {
                    width: 100%;
                    padding: 12px;
                    border: 2px solid #ddd;
                    border-radius: 8px;
                    font-size: 16px;
                    transition: border 0.3s;
                }
                
                .form-group-inline input:focus,
                .form-group-inline textarea:focus {
                    border-color: var(--primary);
                    outline: none;
                }
                
                .count-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                
                .btn-count {
                    flex: 1;
                    padding: 15px;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .btn-count-cancel {
                    background: #f3f4f6;
                    color: #6b7280;
                }
                
                .btn-count-cancel:hover {
                    background: #e5e7eb;
                    transform: translateY(-2px);
                }
                
                .btn-count-save {
                    background: linear-gradient(135deg, var(--accent) 0%, var(--primary) 100%);
                    color: white;
                }
                
                .btn-count-save:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
                }
            </style>
            
            <div class="stock-modal-header">
                <div class="stock-icon">📦</div>
                <h2 style="margin: 0; font-size: 24px;">นับสตอคทรัพย์สิน</h2>
            </div>
            
            <div class="asset-detail-box">
                <div class="asset-detail-row">
                    <span class="asset-detail-label">รหัส:</span>
                    <span class="asset-detail-value">${asset.code}</span>
                </div>
                <div class="asset-detail-row">
                    <span class="asset-detail-label">ชื่อ:</span>
                    <span class="asset-detail-value">${asset.name}</span>
                </div>
                <div class="asset-detail-row">
                    <span class="asset-detail-label">หมวดหมู่:</span>
                    <span class="asset-detail-value">${asset.category}</span>
                </div>
                <div class="asset-detail-row">
                    <span class="asset-detail-label">สถานที่:</span>
                    <span class="asset-detail-value">${asset.location}</span>
                </div>
                <div class="asset-detail-row">
                    <span class="asset-detail-label">จำนวนในระบบ:</span>
                    <span class="asset-detail-value" style="font-size: 18px;">${stockItem.systemQty} หน่วย</span>
                </div>
            </div>
            
            <div class="form-group-inline">
                <label>จำนวนนับได้จริง: <span style="color: red;">*</span></label>
                <input type="number" id="quickCountQty" value="${stockItem.systemQty}" 
                       min="0" step="1" placeholder="กรอกจำนวนที่นับได้">
            </div>
            
            <div class="form-group-inline">
                <label>หมายเหตุ:</label>
                <textarea id="quickCountRemark" rows="3" 
                          placeholder="ระบุหมายเหตุ (ถ้ามี)...">${stockItem.remark || ''}</textarea>
            </div>
            
            <div class="count-actions">
                <button class="btn-count btn-count-cancel" onclick="closeQuickStockCount()">
                    <i class="fas fa-times"></i>
                    ยกเลิก
                </button>
                <button class="btn-count btn-count-save" onclick="saveQuickStockCount('${code}')">
                    <i class="fas fa-save"></i>
                    บันทึกการนับ
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Focus ที่ช่องจำนวน
    setTimeout(() => {
        const qtyInput = document.getElementById('quickCountQty');
        if (qtyInput) {
            qtyInput.select();
            qtyInput.focus();
        }
    }, 300);
    
    // ปิดเมื่อคลิกนอก Modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeQuickStockCount();
        }
    });
}

/**
 * บันทึกการนับสตอคแบบเร็ว
 */
function saveQuickStockCount(code) {
    const qty = document.getElementById('quickCountQty').value;
    const remark = document.getElementById('quickCountRemark').value.trim();
    
    if (!qty || qty === '') {
        showNotification('⚠️ กรุณากรอกจำนวนที่นับได้', 'warning');
        document.getElementById('quickCountQty').focus();
        return;
    }
    
    const actualQty = parseInt(qty);
    if (isNaN(actualQty) || actualQty < 0) {
        showNotification('⚠️ กรุณากรอกจำนวนที่ถูกต้อง', 'warning');
        document.getElementById('quickCountQty').focus();
        return;
    }
    
    // หารายการในสตอค
    const stockIndex = stockCountData.findIndex(s => s.code === code);
    if (stockIndex === -1) {
        showNotification('❌ ไม่พบรายการในสตอค', 'error');
        return;
    }
    
    const item = stockCountData[stockIndex];
    const systemQty = item.systemQty || 0;
    const variance = actualQty - systemQty;
    const variancePercent = systemQty > 0 
        ? ((variance / systemQty) * 100).toFixed(2)
        : 0;
    
    // อัพเดทข้อมูล
    stockCountData[stockIndex] = {
        ...item,
        actualQty: actualQty,
        variance: variance,
        variancePercent: variancePercent,
        status: variance === 0 ? 'counted' : 'variance',
        remark: remark,
        countedDate: new Date().toISOString(),
        countedBy: 'Manual Entry'
    };
    
    // บันทึกลง localStorage
    localStorage.setItem('fmcgStockCount', JSON.stringify(stockCountData));
    
    // ปิด Modal
    closeQuickStockCount();
    
    // แสดง notification พร้อมผลลัพธ์
    const varianceText = variance === 0 
        ? '✅ ตรงกับระบบ' 
        : variance > 0 
            ? `📈 เกิน ${variance} หน่วย` 
            : `📉 ขาด ${Math.abs(variance)} หน่วย`;
    
    showNotification(
        `✅ บันทึกสำเร็จ!\n📦 ${item.name}\n📊 ระบบ: ${systemQty} | นับได้: ${actualQty}\n${varianceText}`,
        variance === 0 ? 'success' : 'warning'
    );
    
    // อัพเดทหน้า Stock Count
    if (typeof updateStockCountPage === 'function') {
        updateStockCountPage();
    }
}

/**
 * ปิด Modal นับสตอคแบบเร็ว
 */
function closeQuickStockCount() {
    const modal = document.getElementById('quickStockCountModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

/**
 * ลบทรัพย์สิน (เหมือนเดิม)
 */
function deleteAsset(code) {
    const asset = assetsData.find(a => a.code === code);
    if (!asset) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    // สร้าง Custom Delete Modal
    const deleteModal = document.createElement('div');
    deleteModal.className = 'modal active';
    deleteModal.id = 'deleteConfirmModal';
    deleteModal.style.zIndex = '10000';
    
    deleteModal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; animation: modalSlideIn 0.3s ease;">
            <style>
                @keyframes modalSlideIn {
                    from {
                        transform: translateY(-50px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                .delete-modal-header {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                    padding: 25px;
                    border-radius: 15px 15px 0 0;
                    text-align: center;
                    margin: -20px -20px 20px -20px;
                }
                
                .delete-icon {
                    font-size: 64px;
                    margin-bottom: 10px;
                    animation: shake 0.5s ease;
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px) rotate(-5deg); }
                    75% { transform: translateX(10px) rotate(5deg); }
                }
                
                .asset-info-box {
                    background: #fee;
                    border: 2px solid #fcc;
                    border-radius: 10px;
                    padding: 15px;
                    margin: 20px 0;
                }
                
                .asset-info-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 8px 0;
                    padding: 5px 0;
                    border-bottom: 1px dashed #fcc;
                }
                
                .asset-info-row:last-child {
                    border-bottom: none;
                }
                
                .asset-info-label {
                    color: #666;
                    font-weight: 500;
                }
                
                .asset-info-value {
                    color: #ef4444;
                    font-weight: 600;
                }
                
                .warning-text {
                    background: #fef3c7;
                    border-left: 4px solid #f59e0b;
                    padding: 12px 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                    font-size: 14px;
                    color: #92400e;
                }
                
                .delete-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                
                .btn-delete-confirm {
                    flex: 1;
                    padding: 15px;
                    border: none;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .btn-cancel {
                    background: #f3f4f6;
                    color: #6b7280;
                }
                
                .btn-cancel:hover {
                    background: #e5e7eb;
                    transform: translateY(-2px);
                }
                
                .btn-delete-yes {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: white;
                }
                
                .btn-delete-yes:hover {
                    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(239, 68, 68, 0.4);
                }
            </style>
            
            <div class="delete-modal-header">
                <div class="delete-icon">🗑️</div>
                <h2 style="margin: 0; font-size: 24px;">ยืนยันการลบทรัพย์สิน</h2>
            </div>
            
            <div class="asset-info-box">
                <div class="asset-info-row">
                    <span class="asset-info-label">รหัส:</span>
                    <span class="asset-info-value">${asset.code}</span>
                </div>
                <div class="asset-info-row">
                    <span class="asset-info-label">ชื่อ:</span>
                    <span class="asset-info-value">${asset.name}</span>
                </div>
                <div class="asset-info-row">
                    <span class="asset-info-label">หมวดหมู่:</span>
                    <span class="asset-info-value">${asset.category}</span>
                </div>
                <div class="asset-info-row">
                    <span class="asset-info-label">สถานที่:</span>
                    <span class="asset-info-value">${asset.location}</span>
                </div>
                <div class="asset-info-row">
                    <span class="asset-info-label">มูลค่า:</span>
                    <span class="asset-info-value">${(asset.value || 0).toLocaleString()} บาท</span>
                </div>
            </div>
            
            <div class="warning-text">
                <i class="fas fa-exclamation-triangle"></i>
                <strong>คำเตือน:</strong> การลบจะไม่สามารถกู้คืนได้ และจะส่งผลต่อรายงานและสถิติทั้งหมด
            </div>
            
            <div class="delete-actions">
                <button class="btn-delete-confirm btn-cancel" onclick="closeDeleteModal()">
                    <i class="fas fa-times"></i>
                    ยกเลิก
                </button>
                <button class="btn-delete-confirm btn-delete-yes" onclick="confirmDeleteAsset('${code}')">
                    <i class="fas fa-trash"></i>
                    ลบทรัพย์สิน
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(deleteModal);
    
    // Close on outside click
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

/**
 * ยืนยันการลบทรัพย์สิน
 */
function confirmDeleteAsset(code) {
    const asset = assetsData.find(a => a.code === code);
    if (!asset) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        closeDeleteModal();
        return;
    }
    
    // 📝 บันทึกประวัติการลบก่อนลบจริง
    if (typeof logAssetDeletion === 'function') {
        logAssetDeletion(asset);
    }
    
    // ลบออกจาก array
    assetsData = assetsData.filter(a => a.code !== code);
    
    // บันทึกลง localStorage
    localStorage.setItem('fmcgAssets', JSON.stringify(assetsData));
    
    // ลบออกจาก Stock Count ด้วย (ถ้ามี)
    if (stockCountData && stockCountData.length > 0) {
        stockCountData = stockCountData.filter(s => s.code !== code);
        localStorage.setItem('fmcgStockCount', JSON.stringify(stockCountData));
    }
    
    // ถ้ามีการเชื่อมต่อ Google Sheets ให้ซิงค์
    if (typeof sheetsConfig !== 'undefined' && sheetsConfig.webAppUrl) {
        syncToSheets();
    }
    
    // ปิด Modal
    closeDeleteModal();
    
    // แสดง notification
    showNotification(`✅ ลบทรัพย์สิน "${asset.name}" สำเร็จ!`, 'success');
    
    // อัพเดทหน้าจอ
    updateAssetsPage();
    updateDashboard();
    if (typeof updateDepartmentPage === 'function') updateDepartmentPage();
    if (typeof updateLocationsPage === 'function') updateLocationsPage();
}

/**
 * ปิด Delete Modal
 */
function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        editAsset,
        saveEditAsset,
        openTransferModal,
        confirmTransfer,
        openStockCountModal,
        saveQuickStockCount,
        closeQuickStockCount,
        deleteAsset,
        confirmDeleteAsset,
        closeDeleteModal
    };
}
