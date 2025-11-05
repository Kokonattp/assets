/**
 * FMCG Asset Management - Sheets API Handler
 * จัดการการอ่านข้อมูลจาก Google Sheets ด้วย Sheets API (เร็วกว่า Apps Script)
 * Version: 4.0
 * วันที่: 5 พฤศจิกายน 2568
 */

class SheetsAPIHandler {
    constructor(apiKey, spreadsheetId) {
        this.apiKey = apiKey;
        this.spreadsheetId = spreadsheetId;
        this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
        
        // กำหนดชื่อชีทที่ต้องการ
        this.sheetNames = {
            assets: 'Assets',
            locations: 'Locations',
            stockCount: 'StockCount',
            transferHistory: 'TransferHistory'
        };
    }

    /**
     * สร้าง URL สำหรับ Sheets API
     */
    buildUrl(sheetName, range = '') {
        const fullRange = range ? `${sheetName}!${range}` : sheetName;
        return `${this.baseUrl}/${this.spreadsheetId}/values/${fullRange}?key=${this.apiKey}`;
    }

    /**
     * ดึงข้อมูลจากชีทเดียว
     */
    async fetchSheet(sheetName) {
        try {
            const url = this.buildUrl(sheetName);
            console.log(`📥 Fetching ${sheetName}...`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Sheets API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.values || data.values.length === 0) {
                console.warn(`⚠️ ${sheetName} is empty`);
                return { headers: [], rows: [] };
            }
            
            const headers = data.values[0];
            const rows = data.values.slice(1);
            
            console.log(`✅ ${sheetName}: ${rows.length} rows loaded`);
            
            return { headers, rows };
            
        } catch (error) {
            console.error(`❌ Error fetching ${sheetName}:`, error);
            throw error;
        }
    }

    /**
     * ดึงข้อมูลจากหลายชีทพร้อมกัน (เร็วกว่า)
     */
    async fetchMultipleSheets(sheetNames) {
        try {
            // สร้าง ranges string สำหรับ batch request
            const ranges = sheetNames.map(name => encodeURIComponent(name)).join('&ranges=');
            const url = `${this.baseUrl}/${this.spreadsheetId}/values:batchGet?ranges=${ranges}&key=${this.apiKey}`;
            
            console.log(`📥 Batch fetching: ${sheetNames.join(', ')}...`);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Sheets API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // แปลงผลลัพธ์เป็น object
            const result = {};
            
            data.valueRanges.forEach((valueRange, index) => {
                const sheetName = sheetNames[index];
                
                if (!valueRange.values || valueRange.values.length === 0) {
                    result[sheetName] = { headers: [], rows: [] };
                    console.warn(`⚠️ ${sheetName} is empty`);
                } else {
                    result[sheetName] = {
                        headers: valueRange.values[0],
                        rows: valueRange.values.slice(1)
                    };
                    console.log(`✅ ${sheetName}: ${valueRange.values.length - 1} rows loaded`);
                }
            });
            
            return result;
            
        } catch (error) {
            console.error(`❌ Error batch fetching sheets:`, error);
            throw error;
        }
    }

    /**
     * โหลดข้อมูลทรัพย์สิน (Assets)
     */
    async loadAssets() {
        const { headers, rows } = await this.fetchSheet(this.sheetNames.assets);
        
        if (rows.length === 0) {
            return [];
        }
        
        // แปลงเป็น object array
        return rows.map(row => ({
            code: row[0] || '',
            name: row[1] || '',
            category: row[2] || '',
            brand: row[3] || '',
            model: row[4] || '',
            serial: row[5] || '',
            purchaseDate: row[6] || '',
            price: parseFloat(row[7]) || 0,
            location: row[8] || '',
            department: row[9] || '',
            status: row[10] || 'สมบูรณ์',
            description: row[11] || '',
            lastUpdated: row[12] || ''
        })).filter(asset => asset.code && asset.name);
    }

    /**
     * โหลดข้อมูลสถานที่ (Locations)
     */
    async loadLocations() {
        const { headers, rows } = await this.fetchSheet(this.sheetNames.locations);
        
        if (rows.length === 0) {
            return [];
        }
        
        return rows.map(row => ({
            name: row[0] || '',
            capacity: parseInt(row[1]) || 0,
            currentCount: parseInt(row[2]) || 0,
            custom: row[3] === 'ใช่',
            lastUpdated: row[4] || ''
        })).filter(loc => loc.name);
    }

    /**
     * โหลดข้อมูลการนับสตอค (StockCount)
     */
    async loadStockCount() {
        const { headers, rows } = await this.fetchSheet(this.sheetNames.stockCount);
        
        if (rows.length === 0) {
            return { session: null, items: [] };
        }
        
        const items = rows.map(row => ({
            sessionId: row[0] || '',
            countedDate: row[1] || '',
            code: row[2] || '',
            name: row[3] || '',
            systemQty: parseInt(row[4]) || 0,
            actualQty: parseInt(row[5]) || 0,
            variance: parseInt(row[6]) || 0,
            variancePercent: parseFloat(row[7]) || 0,
            status: row[8] || '',
            remark: row[9] || '',
            countedBy: row[10] || ''
        }));
        
        // หา session ล่าสุด
        const lastItem = items[items.length - 1];
        const session = lastItem ? {
            id: lastItem.sessionId,
            date: lastItem.countedDate
        } : null;
        
        return { session, items };
    }

    /**
     * โหลดประวัติการโอนย้าย (TransferHistory)
     */
    async loadTransferHistory() {
        const { headers, rows } = await this.fetchSheet(this.sheetNames.transferHistory);
        
        if (rows.length === 0) {
            return [];
        }
        
        return rows.map(row => ({
            date: row[0] || '',
            assetCode: row[1] || '',
            assetName: row[2] || '',
            fromLocation: row[3] || '',
            toLocation: row[4] || '',
            fromDepartment: row[5] || '',
            toDepartment: row[6] || '',
            transferredBy: row[7] || '',
            remark: row[8] || ''
        }));
    }

    /**
     * โหลดข้อมูลทั้งหมดพร้อมกัน (เร็วที่สุด)
     */
    async loadAllData() {
        try {
            console.log('🚀 Loading all sheets with Sheets API...');
            const startTime = Date.now();
            
            // ใช้ batch request เพื่อโหลดทั้งหมดพร้อมกัน
            const sheetsToLoad = [
                this.sheetNames.assets,
                this.sheetNames.locations,
                this.sheetNames.stockCount,
                this.sheetNames.transferHistory
            ];
            
            const data = await this.fetchMultipleSheets(sheetsToLoad);
            
            // แปลงข้อมูลแต่ละชีท
            const assets = this.parseAssets(data[this.sheetNames.assets]);
            const locations = this.parseLocations(data[this.sheetNames.locations]);
            const stockCount = this.parseStockCount(data[this.sheetNames.stockCount]);
            const transferHistory = this.parseTransferHistory(data[this.sheetNames.transferHistory]);
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            console.log(`✅ All data loaded in ${duration} seconds`);
            
            return {
                assets,
                locations,
                stockCount,
                transferHistory,
                loadTime: duration
            };
            
        } catch (error) {
            console.error('❌ Error loading all data:', error);
            throw error;
        }
    }

    /**
     * แปลงข้อมูล Assets
     */
    parseAssets({ headers, rows }) {
        if (rows.length === 0) return [];
        
        return rows.map(row => ({
            code: row[0] || '',
            name: row[1] || '',
            category: row[2] || '',
            brand: row[3] || '',
            model: row[4] || '',
            serial: row[5] || '',
            purchaseDate: row[6] || '',
            price: parseFloat(row[7]) || 0,
            location: row[8] || '',
            department: row[9] || '',
            status: row[10] || 'สมบูรณ์',
            description: row[11] || '',
            lastUpdated: row[12] || ''
        })).filter(asset => asset.code && asset.name);
    }

    /**
     * แปลงข้อมูล Locations
     */
    parseLocations({ headers, rows }) {
        if (rows.length === 0) return [];
        
        return rows.map(row => ({
            name: row[0] || '',
            capacity: parseInt(row[1]) || 0,
            currentCount: parseInt(row[2]) || 0,
            custom: row[3] === 'ใช่',
            lastUpdated: row[4] || ''
        })).filter(loc => loc.name);
    }

    /**
     * แปลงข้อมูล StockCount
     */
    parseStockCount({ headers, rows }) {
        if (rows.length === 0) {
            return { session: null, items: [] };
        }
        
        const items = rows.map(row => ({
            sessionId: row[0] || '',
            countedDate: row[1] || '',
            code: row[2] || '',
            name: row[3] || '',
            systemQty: parseInt(row[4]) || 0,
            actualQty: parseInt(row[5]) || 0,
            variance: parseInt(row[6]) || 0,
            variancePercent: parseFloat(row[7]) || 0,
            status: row[8] || '',
            remark: row[9] || '',
            countedBy: row[10] || ''
        }));
        
        const lastItem = items[items.length - 1];
        const session = lastItem ? {
            id: lastItem.sessionId,
            date: lastItem.countedDate
        } : null;
        
        return { session, items };
    }

    /**
     * แปลงข้อมูล TransferHistory
     */
    parseTransferHistory({ headers, rows }) {
        if (rows.length === 0) return [];
        
        return rows.map(row => ({
            date: row[0] || '',
            assetCode: row[1] || '',
            assetName: row[2] || '',
            fromLocation: row[3] || '',
            toLocation: row[4] || '',
            fromDepartment: row[5] || '',
            toDepartment: row[6] || '',
            transferredBy: row[7] || '',
            remark: row[8] || ''
        }));
    }

    /**
     * ตรวจสอบว่า API Key และ Spreadsheet ID ถูกต้อง
     */
    async validateConfig() {
        try {
            const url = `${this.baseUrl}/${this.spreadsheetId}?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                return {
                    valid: false,
                    error: `API Error: ${response.status} ${response.statusText}`
                };
            }
            
            const data = await response.json();
            
            return {
                valid: true,
                title: data.properties.title,
                sheets: data.sheets.map(s => s.properties.title)
            };
            
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

// Export สำหรับใช้งานในไฟล์อื่น
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SheetsAPIHandler;
}
