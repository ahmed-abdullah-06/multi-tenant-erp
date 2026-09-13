const request = require('supertest');
const app = require('../../server/src/app');

describe('Health Check API', () => {
    it('should return 200 OK and status ok for the /health endpoint', async () => {
        const response = await request(app).get('/health');
        
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 204 No Content for favicon', async () => {
        const response = await request(app).get('/favicon.ico');
        
        expect(response.status).toBe(204);
    });
});