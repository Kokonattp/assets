/**
 * FMCG Asset Management - Data Sync Manager
 * ตัวจัดการหลักสำหรับ sync ข้อมูลระหว่าง Sheets API และ Apps Script
 * Version: 4.0
 * วันที่: 5 พฤศจิกายน 2568
 */

class DataSyncManager {
    constructor(config) {
        this.config = config;
        
        // สร้าง handler สำหรับอ่านและเขียน
        this.reader = new SheetsAPIHandler(
            config.sheetsApiKey,
            config.spreadsheetId
        );
        
        this.writer = new SheetsWriter(config.appsScriptUrl);
        
        // Cache
        this.cache = {
            assets: [],
            locations: [],
            stockCount: { session: null, items: [] },
            transferHistory: [],
            lastSync: null
        };
        
        // สถานะ
        this.syncing = false;
        this.autoSyncInterval = null;
    }

    /**
     * โหลดข้อมูลทั้งหมด (Fast Load with Sheets API)
     */
    async loadAll() {
        if (this.syncing) {
            console.warn('⚠️ Sync already in progress');
            return this.cache;
        }
        
        try {
            this.syncing = true;
            console.log('🔄 Starting full data sync...');
            
            const data = await this.reader.loadAllData();
            
            // อัพเดท cache
            this.cache.assets = data.assets;
            this.cache.locations = data.locations;
            this.cache.stockCount = data.stockCount;
            this.cache.transferHistory = data.transferHistory;
            this.cache.lastSync = new Date();
            
            console.log(`✅ Full sync completed in ${data.loadTime}s`);
            console.log(`📦 Assets: ${data.assets.length}`);
            console.log(`📍 Locations: ${data.locations.length}`);
            console.log(`📊 Stock Count: ${data.stockCount.items.length}`);
            console.log(`🔄 Transfer History: ${data.transferHistory.length}`);
            
            return this.cache;
            
        } catch (error) {
            console.error('❌ Full sync failed:', error);
            throw error;
        } finally {
            this.syncing = false;
        }
    }

    /**
     * โหลดเฉพาะทรัพย์สิน
     */
    async loadAssets() {
        try {
            console.log('📥 Loading assets...');
            const assets = await this.reader.loadAssets();
            this.cache.assets = assets;
            console.log(`✅ Loaded ${assets.length} assets`);
            return assets;
        } catch (error) {
            console.error('❌ Failed to load assets:', error);
            throw error;
        }
    }

    /**
     * โหลดเฉพาะสถานที่
     */
    async loadLocations() {
        try {
            console.log('📥 Loading locations...');
            const locations = await this.reader.loadLocations();
            this.cache.locations = locations;
            console.log(`✅ Loaded ${locations.length} locations`);
            return locations;
        } catch (error) {
            console.error('❌ Failed to load locations:', error);
            throw error;
        }
    }

    /**
     * โหลดเฉพาะการนับสตอค
     */
    async loadStockCount() {
        try {
            console.log('📥 Loading stock count...');
            const stockCount = await this.reader.loadStockCount();
            this.cache.stockCount = stockCount;
            console.log(`✅ Loaded ${stockCount.items.length} stock count items`);
            return stockCount;
        } catch (error) {
            console.error('❌ Failed to load stock count:', error);
            throw error;
        }
    }

    /**
     * โหลดเฉพาะประวัติการโอนย้าย
     */
    async loadTransferHistory() {
        try {
            console.log('📥 Loading transfer history...');
            const history = await this.reader.loadTransferHistory();
            this.cache.transferHistory = history;
            console.log(`✅ Loaded ${history.length} transfer records`);
            return history;
        } catch (error) {
            console.error('❌ Failed to load transfer history:', error);
            throw error;
        }
    }

    /**
     * บันทึกทรัพย์สิน
     */
    async saveAssets(assets) {
        try {
            console.log(`💾 Saving ${assets.length} assets...`);
            const result = await this.writer.saveAssets(assets);
            this.cache.assets = assets;
            console.log('✅ Assets saved successfully');
            return result;
        } catch (error) {
            console.error('❌ Failed to save assets:', error);
            throw error;
        }
    }

    /**
     * บันทึกสถานที่
     */
    async saveLocations(locations) {
        try {
            console.log(`💾 Saving ${locations.length} locations...`);
            const result = await this.writer.saveLocations(locations);
            this.cache.locations = locations;
            console.log('✅ Locations saved successfully');
            return result;
        } catch (error) {
            console.error('❌ Failed to save locations:', error);
            throw error;
        }
    }

    /**
     * บันทึกประวัติการโอนย้าย
     */
    async saveTransferHistory(transfer) {
        try {
            console.log('💾 Saving transfer history...');
            const result = await this.writer.saveTransferHistory(transfer);
            
            // อัพเดท cache
            this.cache.transferHistory.push(transfer);
            
            console.log('✅ Transfer history saved');
            return result;
        } catch (error) {
            console.error('❌ Failed to save transfer history:', error);
            throw error;
        }
    }

    /**
     * บันทึกการนับสตอค
     */
    async saveStockCount(stockData, session) {
        try {
            console.log(`💾 Saving stock count (${stockData.length} items)...`);
            const result = await this.writer.saveStockCount(stockData, session);
            
            // อัพเดท cache
            this.cache.stockCount = {
                session: session,
                items: stockData
            };
            
            console.log('✅ Stock count saved');
            return result;
        } catch (error) {
            console.error('❌ Failed to save stock count:', error);
            throw error;
        }
    }

    /**
     * เพิ่มทรัพย์สินใหม่
     */
    async addAsset(asset) {
        try {
            console.log('💾 Adding new asset...');
            const result = await this.writer.appendAssets([asset]);
            
            // อัพเดท cache
            this.cache.assets.push(asset);
            
            console.log('✅ Asset added');
            return result;
        } catch (error) {
            console.error('❌ Failed to add asset:', error);
            throw error;
        }
    }

    /**
     * อัพเดททรัพย์สิน (ต้อง reload ทั้งหมด)
     */
    async updateAsset(updatedAsset) {
        try {
            // หาและแทนที่ใน cache
            const index = this.cache.assets.findIndex(a => a.code === updatedAsset.code);
            
            if (index === -1) {
                throw new Error('Asset not found in cache');
            }
            
            this.cache.assets[index] = updatedAsset;
            
            // บันทึกทั้งหมด
            const result = await this.saveAssets(this.cache.assets);
            
            console.log('✅ Asset updated');
            return result;
        } catch (error) {
            console.error('❌ Failed to update asset:', error);
            throw error;
        }
    }

    /**
     * ลบทรัพย์สิน
     */
    async deleteAsset(assetCode) {
        try {
            // ลบออกจาก cache
            this.cache.assets = this.cache.assets.filter(a => a.code !== assetCode);
            
            // บันทึกทั้งหมด
            const result = await this.saveAssets(this.cache.assets);
            
            console.log('✅ Asset deleted');
            return result;
        } catch (error) {
            console.error('❌ Failed to delete asset:', error);
            throw error;
        }
    }

    /**
     * โหลดข้อมูลจาก cache (ไม่เรียก API)
     */
    getCached() {
        return {
            ...this.cache,
            isCached: true,
            lastSync: this.cache.lastSync
        };
    }

    /**
     * ล้าง cache
     */
    clearCache() {
        this.cache = {
            assets: [],
            locations: [],
            stockCount: { session: null, items: [] },
            transferHistory: [],
            lastSync: null
        };
        console.log('🗑️ Cache cleared');
    }

    /**
     * เปิดใช้งาน Auto Sync
     */
    enableAutoSync(intervalMinutes = 5) {
        if (this.autoSyncInterval) {
            console.warn('⚠️ Auto sync already enabled');
            return;
        }
        
        const intervalMs = intervalMinutes * 60 * 1000;
        
        this.autoSyncInterval = setInterval(async () => {
            console.log('🔄 Auto sync triggered...');
            try {
                await this.loadAll();
            } catch (error) {
                console.error('❌ Auto sync failed:', error);
            }
        }, intervalMs);
        
        console.log(`✅ Auto sync enabled (every ${intervalMinutes} minutes)`);
    }

    /**
     * ปิด Auto Sync
     */
    disableAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
            console.log('🛑 Auto sync disabled');
        }
    }

    /**
     * ตรวจสอบการเชื่อมต่อ
     */
    async testConnection() {
        try {
            console.log('🔍 Testing connections...');
            
            // ทดสอบ Sheets API
            const apiTest = await this.reader.validateConfig();
            
            // ทดสอบ Apps Script
            const scriptTest = await this.writer.testConnection();
            
            return {
                sheetsApi: apiTest,
                appsScript: scriptTest,
                overall: apiTest.valid && scriptTest.connected
            };
            
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return {
                sheetsApi: { valid: false, error: error.message },
                appsScript: { connected: false, error: error.message },
                overall: false
            };
        }
    }

    /**
     * รีเซ็ตชีททั้งหมด
     */
    async resetSheets() {
        try {
            console.log('🔄 Resetting all sheets...');
            const result = await this.writer.initializeSheets();
            this.clearCache();
            console.log('✅ All sheets reset');
            return result;
        } catch (error) {
            console.error('❌ Failed to reset sheets:', error);
            throw error;
        }
    }

    /**
     * สรุปสถานะ
     */
    getStatus() {
        return {
            syncing: this.syncing,
            autoSync: !!this.autoSyncInterval,
            lastSync: this.cache.lastSync,
            cacheSize: {
                assets: this.cache.assets.length,
                locations: this.cache.locations.length,
                stockCount: this.cache.stockCount.items.length,
                transferHistory: this.cache.transferHistory.length
            }
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSyncManager;
}
