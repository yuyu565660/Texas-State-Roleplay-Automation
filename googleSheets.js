const { google } = require("googleapis");
const scopes = ["https://www.googleapis.com/auth/spreadsheets"];

function loadAuth() {
    const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (rawCredentials) {
        try {
            return new google.auth.GoogleAuth({
                credentials: JSON.parse(rawCredentials),
                scopes
            });
        } catch (error) {
            console.error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON:", error.message);
        }
    }

    // Local development fallback. Do not commit credentials.json.
    return new google.auth.GoogleAuth({
        keyFile: "./credentials.json",
        scopes
    });
}

const auth = loadAuth();
const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = "12zvu_f3jGmDOQ8izO8O7e3CMtHVOEnmi3KxhLykSLjk";

module.exports = { sheets, SPREADSHEET_ID };
