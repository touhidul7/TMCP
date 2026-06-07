const { refreshGoogleAccessToken } = require("./gmail");

async function getAccessToken(credentialRecord) {
  if (!credentialRecord?.encrypted_refresh_token) {
    throw new Error("Missing Google refresh token on connected Sheets account");
  }
  const accessToken = await refreshGoogleAccessToken(credentialRecord.encrypted_refresh_token);
  if (!accessToken || accessToken === "mock-access-token") {
    throw new Error("Google OAuth is not configured for real Sheets access");
  }
  return accessToken;
}

async function googleJson(res, fallbackMessage) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || fallbackMessage);
  }
  return json;
}

function getSpreadsheetId(input) {
  const spreadsheetId = input.spreadsheet_id || input.spreadsheetId || input.sheet_id || input.sheetId;
  if (!spreadsheetId) throw new Error("Missing spreadsheet_id parameter");
  return spreadsheetId;
}

function getRange(input, defaultRange = "Sheet1!A1:Z") {
  return input.range || input.tab_range || input.tabRange || input.sheet_range || defaultRange;
}

function normalizeValues(input) {
  if (Array.isArray(input.values)) return input.values;
  if (Array.isArray(input.rows)) return input.rows;
  if (Array.isArray(input.row)) return [input.row];
  throw new Error("Missing values/rows parameter for Sheets write");
}

async function runSheetsTool({ featureKey, input = {}, credentialRecord }) {
  if (!["sheets.read", "sheets.write", "sheets.append"].includes(featureKey)) {
    throw new Error(`Unsupported Sheets feature key: ${featureKey}`);
  }

  const accessToken = await getAccessToken(credentialRecord);
  const spreadsheetId = getSpreadsheetId(input);
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "sheets.read") {
    const range = getRange(input);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`;
    const res = await fetch(url, { headers });
    return await googleJson(res, "Google Sheets read failed");
  }

  const range = getRange(input, "Sheet1!A1");
  const values = normalizeValues(input);
  const valueInputOption = input.valueInputOption || input.value_input_option || "USER_ENTERED";
  const majorDimension = input.majorDimension || input.major_dimension || "ROWS";
  const mode = input.mode || input.operation || (featureKey === "sheets.append" ? "append" : "append");

  if (mode === "update" || mode === "write") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=${encodeURIComponent(valueInputOption)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({ majorDimension, values })
    });
    return await googleJson(res, "Google Sheets update failed");
  }

  if (mode === "clear") {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:clear`;
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify({}) });
    return await googleJson(res, "Google Sheets clear failed");
  }

  const insertDataOption = input.insertDataOption || input.insert_data_option || "INSERT_ROWS";
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=${encodeURIComponent(valueInputOption)}&insertDataOption=${encodeURIComponent(insertDataOption)}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ majorDimension, values })
  });
  return await googleJson(res, "Google Sheets append failed");
}

module.exports = { runSheetsTool };
