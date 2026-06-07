const { runGmailTool } = require("./gmail");
const { runDriveTool } = require("./drive");
const { runHunterTool } = require("./hunter");
const { runConsultiTool } = require("./consulti");
const { runCustomMcpTool } = require("./custom-mcp");
const { runCustomRestTool } = require("./custom-rest");
const { runImapTool } = require("./imap");
const { runSlackTool } = require("./slack");
const { runGithubTool } = require("./github");

async function runTool({ tool, featureKey, input, credentialRecord }) {
  if (tool.tool_type === "built_in") {
    if (featureKey.startsWith("gmail.")) {
      return await runGmailTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("drive.")) {
      return await runDriveTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("hunter.")) {
      return await runHunterTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("consulti.")) {
      return await runConsultiTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("imap.")) {
      return await runImapTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("slack.")) {
      return await runSlackTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("github.")) {
      return await runGithubTool({ featureKey, input, credentialRecord });
    }
    
    throw new Error(`Unsupported built-in feature key: ${featureKey}`);
  }

  if (tool.tool_type === "custom_mcp") {
    return await runCustomMcpTool({ tool, featureKey, input, credentialRecord });
  }

  if (tool.tool_type === "custom_rest") {
    return await runCustomRestTool({ tool, featureKey, input, credentialRecord });
  }

  throw new Error(`Unsupported tool type: ${tool.tool_type}`);
}

module.exports = { runTool };
