/**
 * FMCG Asset Management - Print & Barcode Module
 * สำหรับพิมพ์ Barcode และใบรายการนับสตอค
 */

let currentBarcodeAsset = null;

/**
 * แสดง Barcode Modal
 */
function showBarcode(code) {
    const asset = assetsData.find(a => a.code === code);
    if (!asset) {
        showNotification('ไม่พบทรัพย์สิน', 'error');
        return;
    }
    
    currentBarcodeAsset = asset;
    
    // อัพเดทข้อมูลใน Modal
    document.getElementById('barcodeAssetName').textContent = asset.name;
    document.getElementById('barcodeAssetCode').textContent = 'รหัส: ' + asset.code;
    
    // สร้าง Barcode
    const svg = document.getElementById('barcodeContainer');
    svg.innerHTML = ''; // ล้างเดิม
    
    try {
        JsBarcode(svg, asset.code, {
            format: "CODE128",
            width: 3,
            height: 100,
            displayValue: true,
            fontSize: 20,
            margin: 10
        });
    } catch (error) {
        console.error('Barcode Error:', error);
        svg.innerHTML = '<p style="color: red;">ไม่สามารถสร้าง Barcode ได้</p>';
    }
    
    // เปิด Modal
    document.getElementById('barcodeModal').classList.add('active');
}

/**
 * ดาวน์โหลด Barcode
 */
function downloadBarcode() {
    if (!currentBarcodeAsset) return;
    
    const svg = document.getElementById('barcodeContainer');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(function(blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Barcode_${currentBarcodeAsset.code}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    
    showNotification('✅ ดาวน์โหลด Barcode สำเร็จ!', 'success');
}

/**
 * พิมพ์ Barcode
 */
function printBarcode() {
    if (!currentBarcodeAsset) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Barcode</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }');
    printWindow.document.write('h2 { margin-bottom: 10px; }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h2>' + currentBarcodeAsset.name + '</h2>');
    printWindow.document.write('<p style="font-size: 18px; font-weight: 600;">รหัส: ' + currentBarcodeAsset.code + '</p>');
    printWindow.document.write(document.getElementById('barcodeContainer').outerHTML);
    printWindow.document.write('<p style="margin-top: 20px;">หมวดหมู่: ' + currentBarcodeAsset.category + '</p>');
    printWindow.document.write('<p>สถานที่: ' + currentBarcodeAsset.location + '</p>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

/**
 * พิมพ์สติ๊กเกอร์ Barcode (แบบเล็ก)
 */
function printBarcodeLabel() {
    if (!currentBarcodeAsset) return;
    
    const printWindow = window.open('', '', 'height=400,width=600');
    printWindow.document.write('<html><head><title>Print Label</title>');
    printWindow.document.write('<style>');
    printWindow.document.write('@page { size: 50mm 30mm; margin: 0; }');
    printWindow.document.write('body { font-family: Arial, sans-serif; margin: 0; padding: 5mm; }');
    printWindow.document.write('.label { border: 1px solid #000; padding: 3mm; }');
    printWindow.document.write('h3 { font-size: 10pt; margin: 0 0 2mm 0; }');
    printWindow.document.write('svg { width: 40mm !important; height: 15mm !important; }');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="label">');
    printWindow.document.write('<h3>' + currentBarcodeAsset.name + '</h3>');
    
    // สร้าง Barcode ใหม่สำหรับสติ๊กเกอร์
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(tempSvg, currentBarcodeAsset.code, {
        format: "CODE128",
        width: 2,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 2
    });
    
    printWindow.document.write(tempSvg.outerHTML);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

/**
 * พิมพ์ใบรายการนับสตอค (Stock Count Sheet)
 */
function printStockCountSheet() {
    if (stockCountData.length === 0) {
        showNotification('⚠️ ไม่มีรายการนับสตอค กรุณาเริ่มนับสตอคก่อน', 'warning');
        return;
    }
    
    const printWindow = window.open('', '', 'height=800,width=1000');
    printWindow.document.write('<html><head><title>Stock Count Sheet</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        @page { size: A4; margin: 15mm; }
        body { 
            font-family: 'Arial', sans-serif; 
            font-size: 11pt; 
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        .header { 
            text-align: center; 
            border-bottom: 3px solid #000; 
            padding-bottom: 10px; 
            margin-bottom: 15px;
        }
        .header h1 { 
            margin: 0 0 5px 0; 
            font-size: 20pt; 
        }
        .header p { 
            margin: 2px 0; 
            color: #666; 
        }
        .item { 
            border: 2px solid #333; 
            padding: 10px; 
            margin-bottom: 15px; 
            page-break-inside: avoid;
            border-radius: 5px;
        }
        .item-header { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 10px;
            font-weight: bold;
        }
        .barcode-container { 
            text-align: center; 
            margin: 10px 0;
            padding: 5px;
            background: #f9f9f9;
        }
        .fields { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 10px; 
            margin-top: 10px;
        }
        .field { 
            border-bottom: 1px solid #999; 
            padding: 5px 0;
        }
        .field label { 
            font-weight: bold; 
            margin-right: 10px;
        }
        .footer { 
            margin-top: 20px; 
            text-align: center; 
            font-size: 9pt; 
            color: #999;
        }
        @media print {
            .no-print { display: none; }
        }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    
    // Header
    const session = currentStockSession || { id: 'N/A', type: 'Full Count' };
    const date = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    printWindow.document.write(`
        <div class="header">
            <h1>📋 STOCK COUNT SHEET</h1>
            <p><strong>Session ID:</strong> ${session.id}</p>
            <p><strong>Type:</strong> ${session.type} ${session.cycleName ? '- ' + session.cycleName : ''}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Total Items:</strong> ${stockCountData.length}</p>
        </div>
    `);
    
    // Items
    stockCountData.forEach((item, index) => {
        printWindow.document.write(`
            <div class="item">
                <div class="item-header">
                    <span>${index + 1}. ${item.name}</span>
                    <span>${item.category}</span>
                </div>
                <div style="font-size: 10pt; color: #666; margin-bottom: 5px;">
                    <strong>รหัส:</strong> ${item.code} | 
                    <strong>สถานที่:</strong> ${item.location}
                </div>
                <div class="barcode-container">
                    <svg id="barcode-${index}"></svg>
                </div>
                <div class="fields">
                    <div class="field">
                        <label>Book Qty:</label> ${item.systemQty}
                    </div>
                    <div class="field">
                        <label>Physical:</label> __________
                    </div>
                    <div class="field">
                        <label>Variance:</label> __________
                    </div>
                    <div class="field">
                        <label>Counted By:</label> __________
                    </div>
                </div>
                <div class="field" style="grid-column: 1 / -1; margin-top: 5px;">
                    <label>Remark:</label> _________________________________
                </div>
            </div>
        `);
    });
    
    // Footer
    printWindow.document.write(`
        <div class="footer">
            <p>© ${new Date().getFullYear()} FMCG Asset Management System</p>
        </div>
    `);
    
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // สร้าง Barcode สำหรับแต่ละรายการ
    setTimeout(() => {
        stockCountData.forEach((item, index) => {
            const svg = printWindow.document.getElementById('barcode-' + index);
            if (svg) {
                try {
                    JsBarcode(svg, item.code, {
                        format: "CODE128",
                        width: 2,
                        height: 50,
                        displayValue: true,
                        fontSize: 12,
                        margin: 5
                    });
                } catch (error) {
                    console.error('Barcode Error:', error);
                }
            }
        });
        
        // พิมพ์
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }, 500);
    
    showNotification('✅ กำลังเตรียมใบรายการนับสตอค...', 'success');
}

/**
 * พิมพ์ Barcode Labels ทั้งหมด (แผ่นใหญ่)
 */
function printAllBarcodeLabels() {
    if (assetsData.length === 0) {
        showNotification('⚠️ ไม่มีทรัพย์สินในระบบ', 'warning');
        return;
    }
    
    const printWindow = window.open('', '', 'height=800,width=1000');
    printWindow.document.write('<html><head><title>Barcode Labels</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        @page { size: A4; margin: 10mm; }
        body { 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0;
        }
        .labels-grid { 
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 5mm;
        }
        .label { 
            border: 2px solid #000; 
            padding: 3mm; 
            page-break-inside: avoid;
            text-align: center;
        }
        .label h4 { 
            margin: 0 0 2mm 0; 
            font-size: 10pt;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .label svg { 
            width: 100% !important; 
            height: auto !important;
        }
        .label p { 
            margin: 2mm 0 0 0; 
            font-size: 8pt; 
            color: #666;
        }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="labels-grid">');
    
    assetsData.forEach((asset, index) => {
        printWindow.document.write(`
            <div class="label">
                <h4>${asset.name}</h4>
                <svg id="label-barcode-${index}"></svg>
                <p>${asset.code}</p>
            </div>
        `);
    });
    
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // สร้าง Barcode
    setTimeout(() => {
        assetsData.forEach((asset, index) => {
            const svg = printWindow.document.getElementById('label-barcode-' + index);
            if (svg) {
                try {
                    JsBarcode(svg, asset.code, {
                        format: "CODE128",
                        width: 1.5,
                        height: 30,
                        displayValue: false,
                        margin: 2
                    });
                } catch (error) {
                    console.error('Barcode Error:', error);
                }
            }
        });
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }, 500);
    
    showNotification('✅ กำลังเตรียม Barcode Labels...', 'success');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showBarcode,
        downloadBarcode,
        printBarcode,
        printBarcodeLabel,
        printStockCountSheet,
        printAllBarcodeLabels
    };
}
