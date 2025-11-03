/**
 * FMCG Asset Management - Barcode Scanner Module
 * สำหรับแสกน Barcode ด้วยกล้องมือถือ
 */

let scannerActive = false;
let scannerInitialized = false;

/**
 * เปิด Scanner
 */
function openScanner() {
    document.getElementById('scannerModal').classList.add('active');
    initScanner();
}

/**
 * ปิด Scanner
 */
function closeScanner() {
    if (scannerActive) {
        Quagga.stop();
        scannerActive = false;
    }
    document.getElementById('scannerModal').classList.remove('active');
    document.getElementById('scanner-result').style.display = 'none';
}

/**
 * เริ่มต้น Scanner
 */
function initScanner() {
    if (scannerActive) return;

    const container = document.getElementById('scanner-container');
    const placeholder = document.getElementById('scanner-placeholder');
    
    // แสดง placeholder
    placeholder.style.display = 'block';
    placeholder.innerHTML = `
        <i class="fas fa-camera" style="font-size: 48px; margin-bottom: 10px;"></i>
        <p>กำลังเปิดกล้อง...</p>
    `;

    // ตั้งค่า QuaggaJS
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: container,
            constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: "environment", // กล้องหลัง
                aspectRatio: { min: 1, max: 2 }
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: 4,
        frequency: 10,
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader",
                "code_39_vin_reader",
                "codabar_reader",
                "upc_reader",
                "upc_e_reader"
            ]
        },
        locate: true
    }, function(err) {
        if (err) {
            console.error('Scanner Error:', err);
            placeholder.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 10px; color: #ef4444;"></i>
                <p>ไม่สามารถเปิดกล้องได้</p>
                <small style="color: #999;">${err.message}</small>
            `;
            return;
        }
        
        // เริ่ม Scanner
        Quagga.start();
        scannerActive = true;
        scannerInitialized = true;
        
        // ซ่อน placeholder
        placeholder.style.display = 'none';
        
        console.log("Scanner started successfully");
    });

    // รับผลลัพธ์จากการแสกน
    Quagga.onDetected(onBarcodeDetected);
}

/**
 * เมื่อแสกน Barcode สำเร็จ
 */
function onBarcodeDetected(result) {
    if (!result || !result.codeResult) return;
    
    const code = result.codeResult.code;
    console.log("Barcode detected:", code);
    
    // เล่นเสียง beep
    playBeep();
    
    // ค้นหาทรัพย์สิน
    const asset = assetsData.find(a => a.code === code);
    
    const resultDiv = document.getElementById('scanner-result');
    const resultContent = document.getElementById('scanner-result-content');
    
    if (asset) {
        // พบทรัพย์สิน
        resultDiv.style.display = 'block';
        resultContent.innerHTML = `
            <div style="padding: 15px;">
                <h4 style="color: var(--primary); margin-bottom: 10px;">
                    <i class="fas fa-box"></i> ${asset.name}
                </h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <small style="color: #666;">รหัส:</small>
                        <div style="font-weight: 600;">${asset.code}</div>
                    </div>
                    <div>
                        <small style="color: #666;">หมวดหมู่:</small>
                        <div style="font-weight: 600;">${asset.category}</div>
                    </div>
                    <div>
                        <small style="color: #666;">สถานที่:</small>
                        <div style="font-weight: 600;">${asset.location}</div>
                    </div>
                    <div>
                        <small style="color: #666;">จำนวนในระบบ:</small>
                        <div style="font-weight: 600; color: var(--primary);">${asset.quantity || 1} หน่วย</div>
                    </div>
                </div>
                
                ${stockCountData.length > 0 ? `
                    <div style="background: #fff; padding: 15px; border-radius: 10px; border: 2px solid var(--primary);">
                        <h5 style="margin-bottom: 10px;">
                            <i class="fas fa-clipboard-check"></i> บันทึกการนับสตอค
                        </h5>
                        <div class="form-group" style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">จำนวนนับได้:</label>
                            <input type="number" id="scanQuantity" value="${asset.quantity || 1}" 
                                   min="0" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px;">
                        </div>
                        <div class="form-group" style="margin-bottom: 10px;">
                            <label style="display: block; margin-bottom: 5px;">หมายเหตุ:</label>
                            <input type="text" id="scanRemark" placeholder="หมายเหตุ (ถ้ามี)" 
                                   style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 5px;">
                        </div>
                        <button onclick="saveFromScanner('${asset.code}')" class="btn btn-success" style="width: 100%; padding: 12px; font-size: 16px;">
                            <i class="fas fa-save"></i> บันทึกการนับ
                        </button>
                    </div>
                ` : `
                    <div style="padding: 15px; background: #fef3c7; border-radius: 10px; text-align: center;">
                        <i class="fas fa-info-circle" style="color: #f59e0b;"></i>
                        <p style="margin: 5px 0; color: #92400e;">ยังไม่ได้เริ่มนับสตอค</p>
                        <small style="color: #92400e;">กรุณาเริ่มนับสตอคก่อนใช้งาน Scanner</small>
                    </div>
                `}
                
                <div style="margin-top: 15px; text-align: center;">
                    <button onclick="clearScanResult()" class="btn btn-secondary">
                        <i class="fas fa-redo"></i> แสกนต่อ
                    </button>
                </div>
            </div>
        `;
        
        // หยุด Scanner ชั่วคราว
        if (scannerActive) {
            Quagga.stop();
            scannerActive = false;
        }
        
    } else {
        // ไม่พบทรัพย์สิน
        resultDiv.style.display = 'block';
        resultContent.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <i class="fas fa-exclamation-circle" style="font-size: 48px; color: #ef4444; margin-bottom: 10px;"></i>
                <h4 style="color: #ef4444; margin-bottom: 10px;">ไม่พบทรัพย์สิน</h4>
                <p style="color: #666; margin-bottom: 15px;">รหัส: <strong>${code}</strong></p>
                <button onclick="clearScanResult()" class="btn btn-primary">
                    <i class="fas fa-redo"></i> แสกนใหม่
                </button>
            </div>
        `;
        
        // หยุด Scanner
        if (scannerActive) {
            Quagga.stop();
            scannerActive = false;
        }
    }
}

/**
 * บันทึกจากการแสกน
 */
function saveFromScanner(code) {
    const quantity = parseInt(document.getElementById('scanQuantity').value);
    const remark = document.getElementById('scanRemark').value;
    
    if (isNaN(quantity) || quantity < 0) {
        alert('กรุณากรอกจำนวนที่ถูกต้อง');
        return;
    }
    
    // หา item ใน stockCountData
    const item = stockCountData.find(s => s.code === code);
    if (item) {
        item.actualQty = quantity;
        item.variance = quantity - item.systemQty;
        item.variancePercent = item.systemQty > 0 
            ? ((item.variance / item.systemQty) * 100).toFixed(2)
            : 0;
        item.status = item.variance === 0 ? 'counted' : 'variance';
        item.remark = remark;
        item.countedDate = new Date().toISOString();
        item.countedBy = 'Mobile Scanner';
        
        // บันทึกลง localStorage
        localStorage.setItem('fmcgStockCount', JSON.stringify(stockCountData));
        
        // แสดง notification
        showNotification(`✅ บันทึกสำเร็จ!\n📦 ${item.name}\n📊 ระบบ: ${item.systemQty} | นับได้: ${quantity}`, 'success');
        
        // อัพเดทหน้า Stock Count
        updateStockCountPage();
        
        // แสกนต่อ
        setTimeout(() => {
            clearScanResult();
        }, 1500);
    }
}

/**
 * ล้างผลลัพธ์และแสกนต่อ
 */
function clearScanResult() {
    document.getElementById('scanner-result').style.display = 'none';
    document.getElementById('scanner-result-content').innerHTML = '';
    
    // เริ่ม Scanner ใหม่
    if (!scannerActive) {
        initScanner();
    }
}

/**
 * เล่นเสียง Beep
 */
function playBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

/**
 * ตรวจสอบว่า Scanner รองรับหรือไม่
 */
function isScannerSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        openScanner,
        closeScanner,
        initScanner,
        saveFromScanner,
        clearScanResult,
        isScannerSupported
    };
}
