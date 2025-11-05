/**
 * FMCG Asset Management - Sheets Writer (Apps Script)
 * จัดการการบันทึกข้อมูลทุกชีทผ่าน Google Apps Script
 * Version: 4.0
 * วันที่: 5 พฤศจิกายน 2568
 */

class SheetsWriter {
    constructor(webAppUrl) {
        this.webAppUrl = webAppUrl;
    }

    /**
     * เรียก Apps Script ด้วย POST request
     */
    async callAppScript(action, data) {
        try {
            console.log(`📤 Calling Apps Script: ${action}`);
            
            const response = await fetch(this.webAppUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    data: data
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }
            
            console.log(`✅ ${action} completed successfully`);
            return result;
            
        } catch (error) {
            console.error(`❌ Error calling ${action}:`, error);
            throw error;
        }
    }

    /**
     * บันทึกข้อมูลทรัพย์สิน (Assets)
     */
    async saveAssets(assets) {
        return await this.callAppScript('saveAssets', { assets });
    }

    /**
     * บันทึกข้อมูลสถานที่ (Locations)
     */
    async saveLocations(locations) {
        // แปลงเป็น array of arrays
        const rows = locations.map(loc => [
            loc.name,
            loc.capacity || 0,
            loc.currentCount || 0,
            loc.custom ? 'ใช่' : 'ไม่',
            loc.lastUpdated || new Date().toISOString()
        ]);
        
        return await this.callAppScript('saveLocations', rows);
    }

    /**
     * บันทึกสถานที่เดียว (Location)
     */
    async saveLocation(location) {
        return await this.callAppScript('saveLocation', {
            location: location.name,
            capacity: location.capacity || 0,
            custom: location.custom || false
        });
    }

    /**
     * บันทึกประวัติการโอนย้าย (TransferHistory)
     */
    async saveTransferHistory(transfer) {
        return await this.callAppScript('saveTransferHistory', {
            date: transfer.date || new Date().toISOString(),
            assetCode: transfer.assetCode,
            assetName: transfer.assetName,
            fromLocation: transfer.fromLocation,
            toLocation: transfer.toLocation,
            fromDepartment: transfer.fromDepartment || '',
            toDepartment: transfer.toDepartment || '',
            transferredBy: transfer.transferredBy || 'System',
            remark: transfer.remark || ''
        });
    }

    /**
     * บันทึกข้อมูลการนับสตอค (StockCount)
     */
    async saveStockCount(stockData, session) {
        // แปลงเป็นรูปแบบที่ Apps Script ต้องการ
        const formattedData = stockData.map(item => ({
            sessionId: session.id,
            countedDate: item.countedDate || new Date().toISOString(),
            code: item.code,
            name: item.name,
            systemQty: item.systemQty,
            actualQty: item.actualQty,
            variance: item.variance,
            variancePercent: item.variancePercent,
            status: item.status,
            remark: item.remark || '',
            countedBy: item.countedBy || 'System'
        }));
        
        return await this.callAppScript('saveStockCount', {
            data: formattedData,
            session: session
        });
    }

    /**
     * เพิ่มทรัพย์สิน (Append)
     */
    async appendAssets(assets) {
        const rows = assets.map(asset => [
            asset.code,
            asset.name,
            asset.category,
            asset.brand || '',
            asset.model || '',
            asset.serial || '',
            asset.purchaseDate || '',
            asset.price || 0,
            asset.location,
            asset.department || '',
            asset.status || 'สมบูรณ์',
            asset.description || '',
            asset.lastUpdated || new Date().toISOString()
        ]);
        
        return await this.callAppScript('append', { rows });
    }

    /**
     * สร้างชีทใหม่ทั้งหมด (Initialize)
     */
    async initializeSheets() {
        return await this.callAppScript('initialize', {});
    }

    /**
     * อัพเดททรัพย์สินเดียว
     */
    async updateSingleAsset(asset) {
        // ใช้การบันทึกทั้งหมดแทน (เพราะ Apps Script ไม่มีฟังก์ชันอัพเดทแถวเดียว)
        // ต้องโหลดข้อมูลทั้งหมด แก้ไข แล้วบันทึกกลับ
        console.warn('⚠️ updateSingleAsset requires full reload - use saveAssets instead');
        throw new Error('Use saveAssets for updating data');
    }

    /**
     * ลบทรัพย์สิน
     */
    async deleteAsset(assetCode) {
        // ต้องโหลดข้อมูลทั้งหมด ลบ แล้วบันทึกกลับ
        console.warn('⚠️ deleteAsset requires full reload');
        throw new Error('Delete by reloading and filtering, then save with saveAssets');
    }

    /**
     * ตรวจสอบการเชื่อมต่อ Apps Script
     */
    async testConnection() {
        try {
            const response = await fetch(this.webAppUrl + '?action=getAssets', {
                method: 'GET'
            });
            
            if (!response.ok) {
                return {
                    connected: false,
                    error: `HTTP ${response.status}`
                };
            }
            
            const data = await response.json();
            
            return {
                connected: data.success,
                message: data.success ? 'Connected' : 'Failed'
            };
            
        } catch (error) {
            return {
                connected: false,
                error: error.message
            };
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SheetsWriter;
}
