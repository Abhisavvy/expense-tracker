class GoogleSheetsAPI {
    constructor() {
        this.accessToken = null;
        this.tokenExpiry = 0;
    }

    async getAccessToken() {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const header = { alg: 'RS256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: CONFIG.SERVICE_ACCOUNT_EMAIL,
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        const sHeader = JSON.stringify(header);
        const sClaim = JSON.stringify(claim);
        const sKey = CONFIG.PRIVATE_KEY;

        try {
            const signature = KJUR.jws.JWS.sign(null, sHeader, sClaim, sKey);

            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signature}`
            });

            const data = await response.json();
            if (data.access_token) {
                this.accessToken = data.access_token;
                this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Buffer 1 min
                return this.accessToken;
            } else {
                throw new Error('Failed to get access token: ' + JSON.stringify(data));
            }
        } catch (error) {
            console.error('Auth Error:', error);
            throw error;
        }
    }



    async fetchData() {
        console.log('Fetching data...');
        const token = await this.getAccessToken();
        console.log('Token obtained');
        const ranges = [
            `${CONFIG.SHEET_NAMES.BUDGETS}!A2:D`,
            `${CONFIG.SHEET_NAMES.EXPENSES}!A2:E`,
            `${CONFIG.SHEET_NAMES.CATEGORIES}!A2:B`
        ];
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values:batchGet?ranges=${ranges.join('&ranges=')}`;
        console.log('Fetching URL:', url);

        let response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 400) {
            console.warn('Fetch failed with 400, checking if sheets exist...');
            await this.ensureSheetsExist();
            // Retry fetch
            response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        console.log('Fetch response status:', response.status);
        if (!response.ok) {
            const errText = await response.text();
            console.error('Fetch error details:', errText);
            throw new Error(`Failed to fetch data: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        const budgetRows = data.valueRanges[0].values || [];
        const expenseRows = data.valueRanges[1].values || [];
        const categoryRows = data.valueRanges[2].values || [];

        return {
            budgets: this.parseBudgets(budgetRows),
            expenses: this.parseExpenses(expenseRows),
            categories: this.parseCategories(categoryRows)
        };
    }

    async ensureSheetsExist() {
        const token = await this.getAccessToken();
        // 1. Get current sheets
        const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}`;
        const getResp = await fetch(getUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!getResp.ok) {
            throw new Error('Failed to fetch spreadsheet metadata');
        }

        const meta = await getResp.json();
        const existingSheets = meta.sheets.map(s => s.properties.title);
        const requiredSheets = Object.values(CONFIG.SHEET_NAMES);
        const missingSheets = requiredSheets.filter(name => !existingSheets.includes(name));

        if (missingSheets.length === 0) return;

        console.log('Creating missing sheets:', missingSheets);

        // 2. Create missing sheets
        const requests = missingSheets.map(title => ({
            addSheet: {
                properties: { title }
            }
        }));

        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}:batchUpdate`;
        await fetch(updateUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requests })
        });
    }

    async saveData(budgets, expenses) {
        console.log('api.saveData called');
        const token = await this.getAccessToken();

        // Format data for sheets
        const budgetValues = budgets.map(b => [b.name, b.amount, b.type, b.category]);
        const expenseValues = expenses.map(e => [e.date, e.category, e.description, e.amount, e.paid_by]);

        const data = {
            valueInputOption: 'USER_ENTERED',
            data: [
                {
                    range: `${CONFIG.SHEET_NAMES.BUDGETS}!A2:D`,
                    values: budgetValues
                },
                {
                    range: `${CONFIG.SHEET_NAMES.EXPENSES}!A2:E`,
                    values: expenseValues
                }
            ]
        };

        console.log('Clearing sheets...');
        // First clear the sheets (to handle deletions)
        await this.clearSheet(CONFIG.SHEET_NAMES.BUDGETS);
        await this.clearSheet(CONFIG.SHEET_NAMES.EXPENSES);

        console.log('Writing new data...');
        // Then write new data
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values:batchUpdate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error('Save failed:', errText);
            throw new Error('Failed to save data: ' + response.status + ' ' + errText);
        }

        console.log('Save successful');
        return await response.json();
    }

    async saveCategories(categories) {
        const token = await this.getAccessToken();
        const categoryValues = categories.map(c => [c.name, c.color]);

        const data = {
            valueInputOption: 'USER_ENTERED',
            data: [{
                range: `${CONFIG.SHEET_NAMES.CATEGORIES}!A2:B`,
                values: categoryValues
            }]
        };

        await this.clearSheet(CONFIG.SHEET_NAMES.CATEGORIES);

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values:batchUpdate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Failed to save categories');
        return await response.json();
    }

    async clearSheet(sheetName) {
        const token = await this.getAccessToken();
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SPREADSHEET_ID}/values/${sheetName}!A2:Z:clear`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    parseBudgets(rows) {
        return rows.map((row, index) => ({
            id: `budget_${index}`,
            name: row[0],
            amount: parseFloat(row[1]) || 0,
            type: row[2],
            category: row[3]
        }));
    }

    parseExpenses(rows) {
        return rows.map((row, index) => ({
            id: `expense_${index}`,
            date: row[0],
            category: row[1],
            description: row[2],
            amount: parseFloat(row[3]) || 0,
            paid_by: row[4]
        }));
    }

    parseCategories(rows) {
        return rows.map(row => ({
            name: row[0],
            color: row[1] || '#808080' // Default gray if no color
        }));
    }
}

const api = new GoogleSheetsAPI();
