const { runGmailTool } = require("./gmail");
const { runDriveTool } = require("./drive");
const { runHunterTool } = require("./hunter");
const { runConsultiTool } = require("./consulti");
const { runCustomMcpTool } = require("./custom-mcp");
const { runCustomRestTool } = require("./custom-rest");
const { runImapTool } = require("./imap");
const { runSlackTool } = require("./slack");
const { runGithubTool } = require("./github");
const { runSshTool } = require("./ssh");
const { runApifyTool } = require("./apify");
const { runSheetsTool } = require("./sheets");
const { runResendTool } = require("./resend");
const { runSerperTool } = require("./serper");
const { runScrapeDoTool } = require("./scrapedo");
const { runOpenRouterTool } = require("./openrouter");
const { runOpenAITool } = require("./openai");
const { runAnthropicTool } = require("./anthropic");
const { runNotionTool } = require("./notion");
const { runAirtableTool } = require("./airtable");
const { runHubspotTool } = require("./hubspot");
const { runStripeTool } = require("./stripe");
const { runLinearTool } = require("./linear");
const { runTwilioTool } = require("./twilio");
const { runMailchimpTool } = require("./mailchimp");
const { runAsanaTool } = require("./asana");
const { runPostgresqlTool } = require("./postgresql");
const { runWhatsappTool } = require("./whatsapp");
const { runFacebookTool } = require("./facebook");
const { runInstagramTool } = require("./instagram");

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

    if (featureKey.startsWith("ssh.")) {
      return await runSshTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
    }

    if (featureKey.startsWith("apify.")) {
      return await runApifyTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("sheets.")) {
      return await runSheetsTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("resend.")) {
      return await runResendTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("serper.")) {
      return await runSerperTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("scrapedo.")) {
      return await runScrapeDoTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("openrouter.")) {
      return await runOpenRouterTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("openai.")) {
      return await runOpenAITool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("anthropic.")) {
      return await runAnthropicTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("notion.")) {
      return await runNotionTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("airtable.")) {
      return await runAirtableTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
    }

    if (featureKey.startsWith("hubspot.")) {
      return await runHubspotTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("stripe.")) {
      return await runStripeTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("linear.")) {
      return await runLinearTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("twilio.")) {
      return await runTwilioTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
    }

    if (featureKey.startsWith("mailchimp.")) {
      return await runMailchimpTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
    }

    if (featureKey.startsWith("asana.")) {
      return await runAsanaTool({ featureKey, input, credentialRecord });
    }

    if (featureKey.startsWith("postgresql.")) {
      return await runPostgresqlTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
    }

    if (featureKey.startsWith("whatsapp.")) {
      return await runWhatsappTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
    }

    if (featureKey.startsWith("facebook.")) {
      return await runFacebookTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
    }

    if (featureKey.startsWith("instagram.")) {
      return await runInstagramTool({ featureKey, input, credentialRecord, connectionMetadata: tool._connectionMetadata });
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
