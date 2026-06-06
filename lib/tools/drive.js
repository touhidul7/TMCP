const { refreshGoogleAccessToken } = require("./gmail");

async function runDriveTool({ featureKey, input, credentialRecord }) {
  let accessToken = "mock-access-token";
  if (credentialRecord && credentialRecord.encrypted_refresh_token) {
    try {
      accessToken = await refreshGoogleAccessToken(credentialRecord.encrypted_refresh_token);
    } catch (e) {
      console.error("Error refreshing Google OAuth token for Drive:", e);
    }
  }

  // Sandbox simulation fallback
  if (accessToken === "mock-access-token") {
    if (featureKey === "drive.search") {
      return {
        files: [
          { id: "file-q3", name: "q3_report.pdf", mimeType: "application/pdf", size: "1042100" },
          { id: "file-leads", name: "leads_export.csv", mimeType: "text/csv", size: "48200" }
        ]
      };
    }
    if (featureKey === "drive.read") {
      return {
        id: input.file_id || "file-leads",
        name: "leads_export.csv",
        content: "first_name,last_name,email,company\nJohn,Smith,john@acme.com,Acme Corp\nSarah,Connor,sarah@tmcp.io,TMCP Gateway"
      };
    }
    if (featureKey === "drive.upload") {
      return {
        success: true,
        id: `file-${Date.now()}`,
        name: input.name || "uploaded_file.txt",
        status: "Uploaded"
      };
    }
    if (featureKey === "drive.delete") {
      return {
        success: true,
        file_id: input.file_id,
        status: "Deleted"
      };
    }
    throw new Error(`Unsupported Drive feature key: ${featureKey}`);
  }

  // Real Google Drive API calls
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };

  if (featureKey === "drive.search") {
    const q = input.query || "";
    let url = `https://www.googleapis.com/drive/v3/files`;
    if (q) {
      url += `?q=${encodeURIComponent(q)}`;
    }
    const res = await fetch(url, { headers });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Google Drive Search API call failed");
    return json;
  }

  if (featureKey === "drive.read") {
    const fileId = input.file_id;
    if (!fileId) throw new Error("Missing file_id parameter");
    
    // To get file metadata
    const urlMetadata = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const resMeta = await fetch(urlMetadata, { headers });
    const metaJson = await resMeta.json();
    if (!resMeta.ok) throw new Error(metaJson.error?.message || "Google Drive Read Metadata API call failed");

    // To get file content (adding ?alt=media)
    const urlContent = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const resMedia = await fetch(urlContent, {
      headers: {
        "Authorization": `Bearer ${accessToken}`
      }
    });
    
    let content = "";
    if (resMedia.ok) {
      content = await resMedia.text();
    } else {
      content = "[Binary data or content retrieval failed]";
    }

    return {
      ...metaJson,
      content
    };
  }

  if (featureKey === "drive.upload") {
    const { name, content } = input;
    if (!name || !content) {
      throw new Error("Missing name or content parameter in input");
    }

    // Google Drive multipart upload
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name,
      mimeType: "text/plain"
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: text/plain\r\n\r\n' +
      content +
      closeDelimiter;

    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || "Google Drive Upload API call failed");
    return json;
  }

  if (featureKey === "drive.delete") {
    const fileId = input.file_id;
    if (!fileId) throw new Error("Missing file_id parameter");
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error?.message || "Google Drive Delete API call failed");
    }
    return { success: true, file_id: fileId };
  }

  throw new Error(`Unsupported Drive feature key: ${featureKey}`);
}

module.exports = { runDriveTool };
