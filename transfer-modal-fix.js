/**
 * FMCG Asset Management - Transfer Modal Dropdown Fix
 * แก้ไขปัญหา dropdown สถานที่และแผนกไม่แสดงข้อมูล
 * 
 * วิธีใช้: เพิ่มโค้ดนี้ในไฟล์ index.html หลังจาก script หลัก
 */

/**
 * ===== แก้ไข showTransferModal() =====
 * เพิ่มการโหลดข้อมูล dropdown แบบแน่นอนมากขึ้น
 */
function showTransferModal(index) {
    console.log('🔄 Opening Transfer Modal for asset index:', index);
    
    const asset = assetsData[index];
    
    if (!asset) {
        showNotification('❌ ไม่พบข้อมูลทรัพย์สิน', 'error');
        return;
    }
    
    // อัพเดทข้อมูลทรัพย์สินใน Modal
    document.getElementById('transferAssetId').value = index;
    document.getElementById('transferAssetInfo').textContent = `${asset.code} - ${asset.name}`;
    document.getElementById('currentLocation').textContent = asset.location || '-';
    document.getElementById('currentDepartment').textContent = asset.department || '-';
    
    // ล้างฟอร์ม
    const newLocationSelect = document.getElementById('newLocation');
    const newDepartmentSelect = document.getElementById('newDepartment');
    const transferReasonInput = document.getElementById('transferReason');
    const transferNoteInput = document.getElementById('transferNote');
    
    if (newLocationSelect) newLocationSelect.value = '';
    if (newDepartmentSelect) newDepartmentSelect.value = '';
    if (transferReasonInput) transferReasonInput.value = '';
    if (transferNoteInput) transferNoteInput.value = '';
    
    // ล้าง border color
    if (newLocationSelect) newLocationSelect.style.borderColor = '';
    if (newDepartmentSelect) newDepartmentSelect.style.borderColor = '';
    if (transferReasonInput) transferReasonInput.style.borderColor = '';
    
    // 🔧 แก้ไข: โหลดข้อมูล dropdown ทันที
    populateTransferDropdowns();
    
    console.log('✅ Transfer Modal data loaded for:', asset.code);
    
    // เปิด Modal
    openModal('transferModal');
}

/**
 * ===== ฟังก์ชันใหม่: populateTransferDropdowns() =====
 * แยกฟังก์ชันโหลด dropdown ออกมาเพื่อให้ชัดเจนและควบคุมได้ดีขึ้น
 */
function populateTransferDropdowns() {
    console.log('🔄 Populating Transfer Modal dropdowns...');
    
    // ===== 1. โหลด Locations =====
    try {
        let locations = [];
        
        // รวมสถานที่จาก customLocations (ถ้ามี)
        if (typeof customLocations !== 'undefined' && Array.isArray(customLocations) && customLocations.length > 0) {
            locations = customLocations.map(loc => loc.name || loc);
            console.log('✅ Found customLocations:', locations.length);
        }
        
        // รวมสถานที่จาก assetsData
        const locationsFromAssets = [...new Set(assetsData.map(a => a.location).filter(Boolean))];
        console.log('✅ Locations from assets:', locationsFromAssets.length);
        
        // รวมสถานที่ default
        const defaultLocations = [
            'คลังเก็บสินค้า',
            'คลังบก',
            'คลังสินค้าหลัก - โซน A',
            'คลังสินค้าหลัก - โซน B',
            'คลังสินค้าหลัก - โซน C',
            'คลังสินค้ารอง',
            'คลังสินค้าสำรองDC1',
            'ศูนย์กระจายสินค้า'
        ];
        
        // รวมทั้งหมดและเรียงลำดับ
        const allLocations = [...new Set([...locations, ...locationsFromAssets, ...defaultLocations])];
        const sortedLocations = allLocations.sort((a, b) => a.localeCompare(b, 'th'));
        
        console.log('📍 Total unique locations:', sortedLocations.length);
        
        // อัพเดท dropdown
        const locationSelect = document.getElementById('newLocation');
        
        if (!locationSelect) {
            console.error('❌ Element "newLocation" not found!');
            return;
        }
        
        // ล้างและสร้างใหม่
        locationSelect.innerHTML = '<option value="">-- เลือกสถานที่ --</option>';
        
        sortedLocations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc;
            option.textContent = loc;
            locationSelect.appendChild(option);
        });
        
        console.log('✅ Populated', sortedLocations.length, 'locations into dropdown');
        
    } catch (error) {
        console.error('❌ Error populating locations:', error);
        showNotification('⚠️ เกิดข้อผิดพลาดในการโหลดสถานที่', 'error');
    }
    
    // ===== 2. โหลด Departments =====
    try {
        // รวมแผนกจาก assetsData
        const departmentsFromAssets = [...new Set(assetsData.map(a => a.department).filter(Boolean))];
        console.log('✅ Departments from assets:', departmentsFromAssets.length);
        
        // รวมแผนก default
        const defaultDepartments = [
            'AC', 'AP', 'APB', 'APGM', 'APL', 
            'CF', 'CP', 'DP', 'INV', 
            'LS', 'QA', 'RC', 'ST', 'สำรอง'
        ];
        
        // รวมทั้งหมดและเรียงลำดับ
        const allDepartments = [...new Set([...departmentsFromAssets, ...defaultDepartments])];
        const sortedDepartments = allDepartments.sort((a, b) => {
            // 'สำรอง' อยู่ท้ายสุด
            if (a === 'สำรอง') return 1;
            if (b === 'สำรอง') return -1;
            return a.localeCompare(b, 'th');
        });
        
        console.log('🏢 Total unique departments:', sortedDepartments.length);
        
        // อัพเดท dropdown
        const departmentSelect = document.getElementById('newDepartment');
        
        if (!departmentSelect) {
            console.error('❌ Element "newDepartment" not found!');
            return;
        }
        
        // ล้างและสร้างใหม่
        departmentSelect.innerHTML = '<option value="">-- เลือกแผนก --</option>';
        
        sortedDepartments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentSelect.appendChild(option);
        });
        
        console.log('✅ Populated', sortedDepartments.length, 'departments into dropdown');
        
    } catch (error) {
        console.error('❌ Error populating departments:', error);
        showNotification('⚠️ เกิดข้อผิดพลาดในการโหลดแผนก', 'error');
    }
    
    console.log('✅ Transfer dropdowns populated successfully!');
}

/**
 * ===== ฟังก์ชันเพิ่มเติม: testTransferModal() =====
 * สำหรับทดสอบว่า dropdown ทำงานหรือไม่
 */
function testTransferModal() {
    console.log('=== Testing Transfer Modal ===');
    
    // ตรวจสอบ Elements
    const locationSelect = document.getElementById('newLocation');
    const departmentSelect = document.getElementById('newDepartment');
    
    console.log('📍 Location Select Element:', locationSelect ? '✅ Found' : '❌ Not Found');
    console.log('🏢 Department Select Element:', departmentSelect ? '✅ Found' : '❌ Not Found');
    
    if (locationSelect) {
        console.log('  - Options count:', locationSelect.options.length);
        console.log('  - Options:', Array.from(locationSelect.options).map(o => o.value));
    }
    
    if (departmentSelect) {
        console.log('  - Options count:', departmentSelect.options.length);
        console.log('  - Options:', Array.from(departmentSelect.options).map(o => o.value));
    }
    
    // ตรวจสอบข้อมูล
    console.log('📦 Assets Data:', assetsData.length, 'items');
    console.log('📍 Custom Locations:', typeof customLocations !== 'undefined' ? customLocations : 'Not defined');
    
    // ทดสอบโหลด dropdown
    console.log('\n🔄 Testing populateTransferDropdowns()...');
    populateTransferDropdowns();
    
    console.log('\n✅ Test completed!');
}

/**
 * ===== ฟังก์ชันเพิ่มเติม: addCustomLocation() =====
 * เพิ่มสถานที่ใหม่แบบ manual
 */
function addCustomLocationToTransfer() {
    const newLocationName = prompt('กรอกชื่อสถานที่ใหม่:');
    
    if (!newLocationName || newLocationName.trim() === '') {
        showNotification('⚠️ กรุณากรอกชื่อสถานที่', 'warning');
        return;
    }
    
    // เพิ่มเข้า customLocations
    if (typeof customLocations === 'undefined') {
        window.customLocations = [];
    }
    
    const trimmedName = newLocationName.trim();
    
    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const exists = customLocations.some(loc => {
        const locName = typeof loc === 'string' ? loc : loc.name;
        return locName === trimmedName;
    });
    
    if (exists) {
        showNotification('⚠️ สถานที่นี้มีอยู่แล้ว', 'warning');
        return;
    }
    
    // เพิ่มสถานที่ใหม่
    customLocations.push({ name: trimmedName });
    
    // บันทึกลง localStorage
    localStorage.setItem('fmcgCustomLocations', JSON.stringify(customLocations));
    
    // โหลด dropdown ใหม่
    populateTransferDropdowns();
    
    showNotification(`✅ เพิ่มสถานที่ "${trimmedName}" สำเร็จ!`, 'success');
    
    console.log('✅ Added custom location:', trimmedName);
}

/**
 * ===== ฟังก์ชันเพิ่มเติม: addCustomDepartment() =====
 * เพิ่มแผนกใหม่แบบ manual
 */
function addCustomDepartmentToTransfer() {
    const newDeptName = prompt('กรอกชื่อแผนกใหม่ (ใช้ตัวย่อ เช่น HR, IT):');
    
    if (!newDeptName || newDeptName.trim() === '') {
        showNotification('⚠️ กรุณากรอกชื่อแผนก', 'warning');
        return;
    }
    
    const trimmedName = newDeptName.trim().toUpperCase();
    
    // เพิ่มเข้า dropdown ทันที (ไม่บันทึกถาวร)
    const departmentSelect = document.getElementById('newDepartment');
    
    if (!departmentSelect) {
        showNotification('❌ ไม่พบ dropdown แผนก', 'error');
        return;
    }
    
    // ตรวจสอบว่ามีอยู่แล้วหรือไม่
    const exists = Array.from(departmentSelect.options).some(opt => opt.value === trimmedName);
    
    if (exists) {
        showNotification('⚠️ แผนกนี้มีอยู่แล้ว', 'warning');
        departmentSelect.value = trimmedName;
        return;
    }
    
    // เพิ่มแผนกใหม่
    const option = document.createElement('option');
    option.value = trimmedName;
    option.textContent = trimmedName;
    departmentSelect.appendChild(option);
    
    // เลือกแผนกที่เพิ่มใหม่
    departmentSelect.value = trimmedName;
    
    showNotification(`✅ เพิ่มแผนก "${trimmedName}" สำเร็จ!`, 'success');
    
    console.log('✅ Added custom department:', trimmedName);
}

/**
 * ===== การเริ่มต้นระบบ =====
 * โหลดข้อมูล dropdown เมื่อหน้าเว็บโหลดเสร็จ
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Transfer Modal Fix loaded!');
    console.log('💡 Available functions:');
    console.log('  - testTransferModal() - ทดสอบระบบ');
    console.log('  - populateTransferDropdowns() - โหลด dropdown ใหม่');
    console.log('  - addCustomLocationToTransfer() - เพิ่มสถานที่ใหม่');
    console.log('  - addCustomDepartmentToTransfer() - เพิ่มแผนกใหม่');
});

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showTransferModal,
        populateTransferDropdowns,
        testTransferModal,
        addCustomLocationToTransfer,
        addCustomDepartmentToTransfer
    };
}

console.log('✅ Transfer Modal Dropdown Fix loaded successfully!');
