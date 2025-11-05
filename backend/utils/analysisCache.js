// Shared cache for analysis results between routes
// In production, use Redis or a proper database
class AnalysisCache {
    constructor() {
        this.cache = new Map();
    }

    set(sessionId, data) {
        this.cache.set(sessionId, {
            data,
            timestamp: new Date().toISOString()
        });
    }

    get(sessionId) {
        return this.cache.get(sessionId);
    }

    has(sessionId) {
        return this.cache.has(sessionId);
    }

    delete(sessionId) {
        return this.cache.delete(sessionId);
    }

    getAllSessions() {
        return Array.from(this.cache.entries()).map(([sessionId, data]) => ({
            sessionId,
            timestamp: data.timestamp,
            hasData: !!data.data
        }));
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

// Export singleton instance
module.exports = new AnalysisCache();