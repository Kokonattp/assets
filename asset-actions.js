/**
 * FMCG Asset Management - Missing Functions
 * Functions สำหรับแก้ไข, ลบ, และแสดง QR Code
 */

/**
 * แสดง Modal แก้ไขทรัพย์สิน
 */
function editAsset(code) {
    const asset = assetsData.find(a => a.code === code);
    if (!asset) {
        showNotification('❌ ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    // เติมข้อมูลลงในฟอร์ม (ใช้ ID ที่ตรงกับ HTML)
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
    document.getElementById('editLocation').value = asset.location || '';
    document.getElementById('editDepartment').value = asset.department || '';
    document.getElementById('editStatus').value = asset.status || 'สมบูรณ์';
    document.getElementById('editDescription').value = asset.description || '';
    
    // แสดง Modal
    document.getElementById('editAssetModal').classList.add('active');
}

/**
 * บันทึกการแก้ไขทรัพย์สิน
 */
function saveEditAsset() {
    const code = document.getElementById('editAssetCode').value;
    const name = document.getElementById('editName').value;
    const category = document.getElementById('editCategory').value;
    const brand = document.getElementById('editBrand').value;
    const model = document.getElementById('editModel').value;
    const serial = document.getElementById('editSerial').value;
    const purchaseDate = document.getElementById('editPurchaseDate').value;
    const price = parseFloat(document.getElementById('editPrice').value) || 0;
    const quantity = parseInt(document.getElementById('editQuantity').value) || 1;
    const location = document.getElementById('editLocation').value;
    const department = document.getElementById('editDepartment').value;
    const status = document.getElementById('editStatus').value;
    const description = document.getElementById('editDescription').value;
    
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
 * ลบทรัพย์สิน (พร้อม Popup สวยๆ)
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
    if (sheetsConfig.webAppUrl) {
        syncToSheets();
    }
    
    // ปิด Modal
    closeDeleteModal();
    
    // แสดง notification
    showNotification(`✅ ลบทรัพย์สิน "${asset.name}" สำเร็จ!`, 'success');
    
    // อัพเดทหน้าจอ
    updateAssetsPage();
    updateDashboard();
    updateDepartmentPage();
    updateLocationsPage();
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
        deleteAsset,
        confirmDeleteAsset,
        closeDeleteModal
    };
}
