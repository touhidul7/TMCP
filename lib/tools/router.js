// Built-in tool modules are loaded lazily, on first use, keyed by the feature-key prefix.
// Eagerly requiring all of them forced every cold start to load heavyweight dependencies
// (ssh2, pg, ...) even for requests that never touch them; require() caches the module after
// the first call, so warm requests pay nothing extra.
const BUILT_IN_LOADERS = {
  gmail: () => require("./gmail").runGmailTool,
  drive: () => require("./drive").runDriveTool,
  hunter: () => require("./hunter").runHunterTool,
  consulti: () => require("./consulti").runConsultiTool,
  imap: () => require("./imap").runImapTool,
  slack: () => require("./slack").runSlackTool,
  github: () => require("./github").runGithubTool,
  ssh: () => require("./ssh").runSshTool,
  apify: () => require("./apify").runApifyTool,
  sheets: () => require("./sheets").runSheetsTool,
  resend: () => require("./resend").runResendTool,
  serper: () => require("./serper").runSerperTool,
  scrapedo: () => require("./scrapedo").runScrapeDoTool,
  openrouter: () => require("./openrouter").runOpenRouterTool,
  openai: () => require("./openai").runOpenAITool,
  anthropic: () => require("./anthropic").runAnthropicTool,
  notion: () => require("./notion").runNotionTool,
  airtable: () => require("./airtable").runAirtableTool,
  hubspot: () => require("./hubspot").runHubspotTool,
  stripe: () => require("./stripe").runStripeTool,
  linear: () => require("./linear").runLinearTool,
  twilio: () => require("./twilio").runTwilioTool,
  mailchimp: () => require("./mailchimp").runMailchimpTool,
  asana: () => require("./asana").runAsanaTool,
  postgresql: () => require("./postgresql").runPostgresqlTool,
  whatsapp: () => require("./whatsapp").runWhatsappTool,
  facebook: () => require("./facebook").runFacebookTool,
  instagram: () => require("./instagram").runInstagramTool
};

async function runTool({ tool, featureKey, input, credentialRecord }) {
  if (tool.tool_type === "built_in") {
    const dot = featureKey.indexOf(".");
    const loadRunner = dot > 0 ? BUILT_IN_LOADERS[featureKey.slice(0, dot)] : null;
    if (!loadRunner) {
      throw new Error(`Unsupported built-in feature key: ${featureKey}`);
    }
    const run = loadRunner();
    return await run({
      featureKey,
      input,
      credentialRecord,
      connectionMetadata: tool._connectionMetadata
    });
  }

  if (tool.tool_type === "custom_mcp") {
    return await require("./custom-mcp").runCustomMcpTool({ tool, featureKey, input, credentialRecord });
  }

  if (tool.tool_type === "custom_rest") {
    return await require("./custom-rest").runCustomRestTool({ tool, featureKey, input, credentialRecord });
  }

  throw new Error(`Unsupported tool type: ${tool.tool_type}`);
}

module.exports = { runTool };
