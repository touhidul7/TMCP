import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
const { encryptText } = require("@/lib/crypto/encrypt");

const AddAccountSchema = z.object({
  toolId: z.string().min(1, "Tool ID is required"),
  label: z.string().min(1, "Account label is required"),
  accountEmail: z.string().optional(),
  credentials: z.object({
    apiKey: z.string().optional(),
    key: z.string().optional(),
    accessToken: z.string().optional(),
    access_token: z.string().optional(),
    refreshToken: z.string().optional(),
    clientSecret: z.string().optional(),
    client_secret: z.string().optional(),
    email: z.string().optional(),
    // SSH-specific
    password: z.string().optional(),
    private_key: z.string().optional(),
    private_key_passphrase: z.string().optional(),
    sudo_password: z.string().optional(),
  }).catchall(z.any())
});

const TOOL_META = {
  gmail:        { name: "Gmail",           provider: "Google",       category: "Communication",  desc: "Read, search, draft, and send emails securely.",        url: "https://mail.google.com" },
  drive:        { name: "Google Drive",    provider: "Google",       category: "Storage",        desc: "Search files, read documents, upload, and manage files.", url: "https://drive.google.com" },
  sheets:       { name: "Google Sheets",   provider: "Google",       category: "Productivity",   desc: "Read, write, and update spreadsheets.",                 url: "https://sheets.google.com" },
  calendar:     { name: "Google Calendar", provider: "Google",       category: "Productivity",   desc: "Schedule, list, and manage calendar events.",           url: "https://calendar.google.com" },
  hunter:       { name: "Hunter",          provider: "Hunter.io",    category: "Enrichment",     desc: "Find and verify professional email addresses.",        url: "https://hunter.io" },
  consulti:     { name: "Consulti",        provider: "Consulti Inc", category: "Enrichment",     desc: "Search and enrich company data.",                       url: "https://consulti.com" },
  "custom-email": { name: "Custom Email",    provider: "IMAP/POP3/SMTP", category: "Communication",  desc: "Connect any IMAP, POP3, or SMTP mail account to read and send.", url: "https://www.thunderbird.net" },
  slack:        { name: "Slack",           provider: "Slack",        category: "Communication",  desc: "Post notifications and manage Slack communication.",    url: "https://slack.com" },
  github:       { name: "GitHub",          provider: "GitHub",       category: "Productivity",   desc: "Access repositories, manage issues, and pull requests.", url: "https://github.com" },
  openrouter:   { name: "OpenRouter",      provider: "OpenRouter AI", category: "AI/LLM",         desc: "Unified LLM gateway for GPT, Claude, Gemini, etc.",     url: "https://openrouter.ai" },
  anthropic:    { name: "Anthropic (Claude)", provider: "Anthropic",  category: "AI/LLM",         desc: "Access Claude models via API key.",                     url: "https://anthropic.com" },
  openai:       { name: "OpenAI",          provider: "OpenAI",       category: "AI/LLM",         desc: "Access GPT models and DALL-E image generation.",        url: "https://openai.com" },
  resend:       { name: "Resend",          provider: "Resend",       category: "Communication",  desc: "Send transactional and marketing emails.",              url: "https://resend.com" },
  instantly:    { name: "Instantly",       provider: "Instantly.ai", category: "Marketing",      desc: "Scale cold email outreach and track analytics.",        url: "https://instantly.ai" },
  twilio:       { name: "Twilio",          provider: "Twilio",       category: "Communication",  desc: "Send SMS and make voice calls programmatically.",       url: "https://twilio.com" },
  ssh:          { name: "SSH Server",      provider: "OpenSSH",      category: "Infrastructure", desc: "Connect to remote Unix/Linux servers over SSH.",        url: "https://www.openssh.com" },
  ftp:          { name: "FTP / SFTP",      provider: "FTP/SFTP",     category: "Infrastructure", desc: "Transfer files to and from remote SFTP/FTP servers.",    url: "https://en.wikipedia.org/wiki/File_Transfer_Protocol" },
  apify:        { name: "Apify",           provider: "Apify",        category: "Enrichment",     desc: "Run web scrapers and extract website data.",            url: "https://apify.com" },
  stitch:       { name: "Stitch Data",     provider: "Stitch",       category: "Enrichment",     desc: "Sync data from 100+ sources into data warehouses.",     url: "https://www.stitchdata.com" },
  notion:       { name: "Notion",          provider: "Notion",       category: "Productivity",   desc: "Read and write Notion pages, databases, and blocks.",   url: "https://notion.so" },
  airtable:     { name: "Airtable",        provider: "Airtable",     category: "Productivity",   desc: "Query, create, and update records in Airtable bases.",  url: "https://airtable.com" },
  hubspot:      { name: "HubSpot",         provider: "HubSpot",      category: "Marketing",      desc: "Manage HubSpot CRM contacts, deals, and activities.",   url: "https://hubspot.com" },
  stripe:       { name: "Stripe",          provider: "Stripe",       category: "Payments",       desc: "Retrieve payments, customers, and billing details.",   url: "https://stripe.com" },
  linear:       { name: "Linear",          provider: "Linear",       category: "Productivity",   desc: "Track software engineering tasks, issues, and cycles.", url: "https://linear.app" },
  ghl:          { name: "GoHighLevel",     provider: "GoHighLevel",  category: "Marketing",      desc: "CRM and marketing automation pipelines.",               url: "https://www.gohighlevel.com" },
  "gmail-app":  { name: "Gmail (App Password)", provider: "Google", category: "Communication",  desc: "Connect Gmail securely using an App Password.",         url: "https://myaccount.google.com/apppasswords" },

  // New Databases
  postgresql:   { name: "PostgreSQL",      provider: "PostgreSQL",   category: "Storage",        desc: "Query, update, and manage PostgreSQL databases.",       url: "https://www.postgresql.org" },
  mysql:        { name: "MySQL",           provider: "MySQL",        category: "Storage",        desc: "Query, update, and manage MySQL databases.",            url: "https://www.mysql.com" },
  redis:        { name: "Redis",           provider: "Redis",        category: "Storage",        desc: "Execute commands and manage key-value stores in Redis.", url: "https://redis.io" },
  mongodb:      { name: "MongoDB",         provider: "MongoDB",      category: "Storage",        desc: "Query, update, and manage MongoDB document databases.", url: "https://www.mongodb.com" },
  oracle:       { name: "Oracle Database", provider: "Oracle",       category: "Storage",        desc: "Query and manage Oracle enterprise databases.",         url: "https://www.oracle.com/database" },

  // New CRMs & productivity
  salesforce:   { name: "Salesforce",      provider: "Salesforce",   category: "Productivity",   desc: "Sync contacts, accounts, and custom sales objects.",    url: "https://www.salesforce.com" },
  jira:         { name: "Jira",            provider: "Atlassian",    category: "Productivity",   desc: "Track bugs, tasks, and project workflows.",             url: "https://www.atlassian.com/software/jira" },
  asana:        { name: "Asana",           provider: "Asana",        category: "Productivity",   desc: "Manage and update team project tasks in Asana.",        url: "https://asana.com" },

  // New e-commerce & marketing
  shopify:      { name: "Shopify",         provider: "Shopify",      category: "Payments",       desc: "Retrieve products, inventory levels, and order logs.",  url: "https://www.shopify.com" },
  mailchimp:    { name: "Mailchimp",        provider: "Mailchimp",    category: "Marketing",      desc: "Sync list subscribers and manage email campaigns.",     url: "https://mailchimp.com" },
  activecampaign: { name: "ActiveCampaign", provider: "ActiveCampaign", category: "Marketing",  desc: "Sync marketing contact lists and automation tags.",     url: "https://activecampaign.com" },
  serper:       { name: "Serper Search",   provider: "Serper",       category: "Enrichment",     desc: "Google Search API by Serper.",                          url: "https://serper.dev" },
  scrapedo:     { name: "Scrape.do",       provider: "Scrape.do",    category: "Enrichment",     desc: "Rotating proxy API by Scrape.do.",                      url: "https://scrape.do" },
  bigquery:     { name: "Google BigQuery", provider: "Google Cloud", category: "Storage",        desc: "Query, analyze, and manage Google BigQuery datasets.",   url: "https://cloud.google.com/bigquery" },

  // Meta social automation
  whatsapp:     { name: "WhatsApp Business", provider: "Meta",       category: "Communication",  desc: "Send WhatsApp messages and templates via the Meta Cloud API.", url: "https://business.whatsapp.com" },
  facebook:     { name: "Facebook Page",   provider: "Meta",         category: "Marketing",      desc: "Publish posts, read posts, and pull insights for a Facebook Page.", url: "https://facebook.com" },
  instagram:    { name: "Instagram",       provider: "Meta",         category: "Marketing",      desc: "Publish media and read recent posts from an Instagram business account.", url: "https://instagram.com" },

  // API key rotation (OpenAI-compatible gateway)
  "gemini-rotate":     { name: "Gemini API Rotate",     provider: "Google",     category: "AI/LLM", desc: "Store multiple Gemini API keys and call them through one TMCP key with automatic rotation and failover.", url: "https://ai.google.dev" },
  "openrouter-rotate": { name: "OpenRouter API Rotate", provider: "OpenRouter", category: "AI/LLM", desc: "Store multiple OpenRouter API keys and call them through one TMCP key with automatic rotation and failover.", url: "https://openrouter.ai" },
  // API key rotation (Scrape.do-compatible proxy gateway)
  "scrapedo-rotate":   { name: "Scrape.do API Rotate",  provider: "Scrape.do",  category: "Enrichment", desc: "Store multiple Scrape.do API tokens and call them through one TMCP key with automatic rotation and failover.", url: "https://scrape.do" },
  // API key rotation (Apify-compatible proxy gateway)
  "apify-rotate":      { name: "Apify API Rotate",      provider: "Apify",      category: "Enrichment", desc: "Store multiple Apify API tokens and call any Apify endpoint through one TMCP key with automatic rotation and failover.", url: "https://apify.com" }
};

const featureMap = {
  gmail: [
    { feature_key: "gmail.search", name: "Search Emails", description: "Search user's mailbox", is_dangerous: false, requires_approval: false },
    { feature_key: "gmail.read", name: "Read Emails", description: "Read message contents", is_dangerous: false, requires_approval: false },
    { feature_key: "gmail.create_draft", name: "Create Draft", description: "Create email draft", is_dangerous: true, requires_approval: false },
    { feature_key: "gmail.send", name: "Send Email", description: "Send email directly", is_dangerous: true, requires_approval: true },
  ],
  drive: [
    { feature_key: "drive.search", name: "Search Files", description: "Search files in Drive", is_dangerous: false, requires_approval: false },
    { feature_key: "drive.read", name: "Read File Content", description: "Read file contents", is_dangerous: false, requires_approval: false },
    { feature_key: "drive.upload", name: "Upload File", description: "Upload files to drive", is_dangerous: true, requires_approval: false },
    { feature_key: "drive.delete", name: "Delete File", description: "Delete file permanently", is_dangerous: true, requires_approval: true },
  ],
  sheets: [
    { feature_key: "sheets.read", name: "Read Sheet", description: "Read spreadsheet data", is_dangerous: false, requires_approval: false },
    { feature_key: "sheets.write", name: "Write Sheet", description: "Write data to spreadsheet", is_dangerous: true, requires_approval: false },
  ],
  calendar: [
    { feature_key: "calendar.list", name: "List Events", description: "List calendar events", is_dangerous: false, requires_approval: false },
    { feature_key: "calendar.create", name: "Create Event", description: "Create a calendar event", is_dangerous: true, requires_approval: false },
  ],
  hunter: [
    { feature_key: "hunter.find_email", name: "Find Email", description: "Get email address by name and domain", is_dangerous: false, requires_approval: false },
    { feature_key: "hunter.verify_email", name: "Verify Email", description: "Verify deliverability of an email", is_dangerous: false, requires_approval: false },
    { feature_key: "hunter.domain_search", name: "Domain Search", description: "List email addresses in a domain", is_dangerous: false, requires_approval: false },
  ],
  consulti: [
    { feature_key: "consulti.search_company", name: "Search Company", description: "Search directories for company records", is_dangerous: false, requires_approval: false },
    { feature_key: "consulti.enrich_company", name: "Enrich Company", description: "Fetch details and size of a company", is_dangerous: false, requires_approval: false }
  ],
  "custom-email": [
    { feature_key: "imap.read_emails", name: "Read Emails", description: "Fetch email summaries via IMAP or POP3", is_dangerous: false, requires_approval: false },
    { feature_key: "imap.search_emails", name: "Search Emails", description: "Search emails by criteria via IMAP", is_dangerous: false, requires_approval: false },
    { feature_key: "imap.send_email", name: "Send Email (SMTP)", description: "Send an email using SMTP", is_dangerous: true, requires_approval: true }
  ],
  slack: [
    { feature_key: "slack.post_message", name: "Post Message", description: "Post to a channel", is_dangerous: true, requires_approval: false },
    { feature_key: "slack.list_channels", name: "List Channels", description: "List available Slack channels", is_dangerous: false, requires_approval: false }
  ],
  github: [
    { feature_key: "github.list_issues", name: "List Issues", description: "List issues in repo", is_dangerous: false, requires_approval: false },
    { feature_key: "github.create_issue", name: "Create Issue", description: "Create a repository issue", is_dangerous: true, requires_approval: false },
    { feature_key: "github.create_repository", name: "Create Repository", description: "Create a new repository under the authenticated account or organization", is_dangerous: true, requires_approval: true }
  ],
  openrouter: [
    { feature_key: "openrouter.chat", name: "Chat Completions", description: "Query any LLM via the OpenRouter OpenAI-compatible endpoint", is_dangerous: false, requires_approval: false },
    { feature_key: "openrouter.list_models", name: "List Models", description: "Retrieve available models and their pricing", is_dangerous: false, requires_approval: false }
  ],
  anthropic: [
    { feature_key: "anthropic.chat", name: "Messages API", description: "Query Claude models via the Anthropic Messages API", is_dangerous: false, requires_approval: false },
    { feature_key: "anthropic.vision", name: "Vision (Multimodal)", description: "Send an image alongside text to Claude vision models", is_dangerous: false, requires_approval: false }
  ],
  openai: [
    { feature_key: "openai.chat", name: "Chat Completions", description: "Query GPT models via /chat/completions", is_dangerous: false, requires_approval: false },
    { feature_key: "openai.embeddings", name: "Embeddings", description: "Generate text embeddings", is_dangerous: false, requires_approval: false },
    { feature_key: "openai.image_gen", name: "Image Generation", description: "Generate images with DALL-E", is_dangerous: false, requires_approval: false }
  ],
  resend: [
    { feature_key: "resend.send_email", name: "Send Email", description: "Send email via Resend API", is_dangerous: true, requires_approval: true }
  ],
  instantly: [
    { feature_key: "instantly.list_campaigns", name: "List Campaigns", description: "List outreach campaigns", is_dangerous: false, requires_approval: false }
  ],
  twilio: [
    { feature_key: "twilio.send_sms", name: "Send SMS", description: "Send an SMS via Twilio", is_dangerous: true, requires_approval: true },
    { feature_key: "twilio.make_call", name: "Make Call", description: "Initiate a voice call to a number", is_dangerous: true, requires_approval: true },
    { feature_key: "twilio.list_numbers", name: "List Phone Numbers", description: "List purchased Twilio phone numbers", is_dangerous: false, requires_approval: false }
  ],
  ssh: [
    { feature_key: "ssh.exec_command", name: "Execute Command", description: "Run commands over SSH", is_dangerous: true, requires_approval: true },
    { feature_key: "ssh.list_directory", name: "List Directory", description: "List files in a remote directory", is_dangerous: false, requires_approval: false },
    { feature_key: "ssh.upload_file", name: "Upload File", description: "Upload text content to a remote path", is_dangerous: true, requires_approval: false }
  ],
  ftp: [
    { feature_key: "ftp.upload_file", name: "Upload File", description: "Upload to FTP server", is_dangerous: true, requires_approval: false }
  ],
  apify: [
    { feature_key: "apify.run_actor", name: "Run Actor", description: "Run Apify scraping actor", is_dangerous: false, requires_approval: false }
  ],
  stitch: [
    { feature_key: "stitch.trigger_sync", name: "Trigger Sync", description: "Trigger ETL sync", is_dangerous: false, requires_approval: false }
  ],
  notion: [
    { feature_key: "notion.search", name: "Search Pages", description: "Search across Notion pages and databases", is_dangerous: false, requires_approval: false },
    { feature_key: "notion.read_page", name: "Read Page", description: "Fetch a page and its block content", is_dangerous: false, requires_approval: false },
    { feature_key: "notion.create_page", name: "Create Page", description: "Create a new page in a Notion database or page", is_dangerous: true, requires_approval: false },
    { feature_key: "notion.query_database", name: "Query Database", description: "Filter and sort records in a Notion database", is_dangerous: false, requires_approval: false }
  ],
  airtable: [
    { feature_key: "airtable.list_records", name: "List Records", description: "Fetch records from a table", is_dangerous: false, requires_approval: false },
    { feature_key: "airtable.create_record", name: "Create Record", description: "Insert a new record into a table", is_dangerous: true, requires_approval: false },
    { feature_key: "airtable.update_record", name: "Update Record", description: "Update fields of an existing record", is_dangerous: true, requires_approval: false }
  ],
  hubspot: [
    { feature_key: "hubspot.list_contacts", name: "List Contacts", description: "Retrieve contacts from the CRM", is_dangerous: false, requires_approval: false },
    { feature_key: "hubspot.create_contact", name: "Create Contact", description: "Add a new contact to HubSpot CRM", is_dangerous: true, requires_approval: false },
    { feature_key: "hubspot.list_deals", name: "List Deals", description: "Retrieve deals from the sales pipeline", is_dangerous: false, requires_approval: false },
    { feature_key: "hubspot.create_note", name: "Create Note", description: "Add a note, optionally associated with a contact", is_dangerous: false, requires_approval: false }
  ],
  stripe: [
    { feature_key: "stripe.list_customers", name: "List Customers", description: "Retrieve Stripe customers", is_dangerous: false, requires_approval: false },
    { feature_key: "stripe.list_invoices", name: "List Invoices", description: "Fetch invoices, optionally filtered by customer", is_dangerous: false, requires_approval: false },
    { feature_key: "stripe.create_charge", name: "Create Charge", description: "Initiate a payment charge", is_dangerous: true, requires_approval: true },
    { feature_key: "stripe.create_refund", name: "Refund", description: "Issue a refund for a charge or payment intent", is_dangerous: true, requires_approval: true }
  ],
  linear: [
    { feature_key: "linear.list_issues", name: "List Issues", description: "Fetch issues from a team or project", is_dangerous: false, requires_approval: false },
    { feature_key: "linear.create_issue", name: "Create Issue", description: "Create a new issue in a team", is_dangerous: true, requires_approval: false },
    { feature_key: "linear.update_issue", name: "Update Issue", description: "Change status, assignee, or priority of an issue", is_dangerous: true, requires_approval: false }
  ],
  ghl: [
    { feature_key: "ghl.list_contacts", name: "List Contacts", description: "Fetch GHL contacts", is_dangerous: false, requires_approval: false }
  ],
  "gmail-app": [
    { feature_key: "imap.read_emails", name: "Read Emails (IMAP)", description: "Fetch emails via IMAP using an app password", is_dangerous: false, requires_approval: false },
    { feature_key: "imap.search_emails", name: "Search Emails (IMAP)", description: "Search mailbox messages via IMAP", is_dangerous: false, requires_approval: false },
    { feature_key: "imap.send_email", name: "Send Email (SMTP)", description: "Send SMTP mail using an app password", is_dangerous: true, requires_approval: true }
  ],
  postgresql: [
    { feature_key: "postgresql.query", name: "Query Database", description: "Run SELECT query", is_dangerous: false, requires_approval: false },
    { feature_key: "postgresql.execute", name: "Execute Mutation", description: "Run INSERT/UPDATE/DELETE statement", is_dangerous: true, requires_approval: true },
    { feature_key: "postgresql.list_tables", name: "List Schema Tables", description: "List tables in a schema", is_dangerous: false, requires_approval: false }
  ],
  mysql: [
    { feature_key: "mysql.query", name: "Query Database", description: "Run SELECT query", is_dangerous: false, requires_approval: false },
    { feature_key: "mysql.execute", name: "Execute Mutation", description: "Run INSERT/UPDATE/DELETE statement", is_dangerous: true, requires_approval: true }
  ],
  redis: [
    { feature_key: "redis.get", name: "Get Key", description: "Get key in Redis", is_dangerous: false, requires_approval: false },
    { feature_key: "redis.set", name: "Set Key", description: "Set key in Redis", is_dangerous: false, requires_approval: false },
    { feature_key: "redis.delete", name: "Delete Key", description: "Delete key in Redis", is_dangerous: true, requires_approval: true }
  ],
  mongodb: [
    { feature_key: "mongodb.find", name: "Find Documents", description: "Query MongoDB collection", is_dangerous: false, requires_approval: false },
    { feature_key: "mongodb.update", name: "Update Documents", description: "Update MongoDB documents", is_dangerous: true, requires_approval: true }
  ],
  oracle: [
    { feature_key: "oracle.query", name: "Query Database", description: "Run SELECT query", is_dangerous: false, requires_approval: false },
    { feature_key: "oracle.execute", name: "Execute Mutation", description: "Run INSERT/UPDATE/DELETE statement", is_dangerous: true, requires_approval: true }
  ],
  salesforce: [
    { feature_key: "salesforce.query", name: "SOQL Query", description: "Query records using SOQL", is_dangerous: false, requires_approval: false },
    { feature_key: "salesforce.create_record", name: "Create Record", description: "Create object record", is_dangerous: true, requires_approval: false }
  ],
  jira: [
    { feature_key: "jira.list_issues", name: "List Issues", description: "Query project issues", is_dangerous: false, requires_approval: false },
    { feature_key: "jira.create_issue", name: "Create Ticket", description: "Create ticket in project", is_dangerous: true, requires_approval: false }
  ],
  asana: [
    { feature_key: "asana.list_tasks", name: "List Tasks", description: "Get tasks in project", is_dangerous: false, requires_approval: false },
    { feature_key: "asana.create_task", name: "Create Task", description: "Create task in project", is_dangerous: true, requires_approval: false },
    { feature_key: "asana.update_task", name: "Update Task", description: "Modify status, assignee, or details of a task", is_dangerous: false, requires_approval: false }
  ],
  shopify: [
    { feature_key: "shopify.get_products", name: "Get Products", description: "List store products", is_dangerous: false, requires_approval: false },
    { feature_key: "shopify.get_orders", name: "Get Orders", description: "List store orders", is_dangerous: false, requires_approval: false }
  ],
  mailchimp: [
    { feature_key: "mailchimp.list_members", name: "List Subscribers", description: "List email list subscribers", is_dangerous: false, requires_approval: false },
    { feature_key: "mailchimp.add_subscriber", name: "Add Subscriber", description: "Add email subscriber", is_dangerous: true, requires_approval: false }
  ],
  activecampaign: [
    { feature_key: "activecampaign.list_contacts", name: "List Contacts", description: "Fetch ActiveCampaign contacts", is_dangerous: false, requires_approval: false },
    { feature_key: "activecampaign.create_contact", name: "Create Contact", description: "Add/update contacts in CRM", is_dangerous: true, requires_approval: false }
  ],
  serper: [
    { feature_key: "serper.search", name: "Google Search", description: "Search Google for organic results", is_dangerous: false, requires_approval: false }
  ],
  scrapedo: [
    { feature_key: "scrapedo.scrape", name: "Scrape Web Page", description: "Scrape content of any web page", is_dangerous: false, requires_approval: false }
  ],
  bigquery: [
    { feature_key: "bigquery.query", name: "Run SQL Query", description: "Execute a SELECT query against a BigQuery dataset", is_dangerous: false, requires_approval: false },
    { feature_key: "bigquery.run_job", name: "Run Query Job", description: "Submit an async BigQuery job and retrieve results", is_dangerous: false, requires_approval: false },
    { feature_key: "bigquery.list_tables", name: "List Tables", description: "List all tables in a BigQuery dataset", is_dangerous: false, requires_approval: false },
    { feature_key: "bigquery.insert_rows", name: "Insert Rows (Streaming)", description: "Stream rows into a BigQuery table", is_dangerous: true, requires_approval: false }
  ],
  whatsapp: [
    { feature_key: "whatsapp.send_message", name: "Send Message", description: "Send a WhatsApp text message", is_dangerous: true, requires_approval: true },
    { feature_key: "whatsapp.send_template", name: "Send Template", description: "Send a pre-approved WhatsApp template message", is_dangerous: true, requires_approval: true },
    { feature_key: "whatsapp.list_templates", name: "List Templates", description: "List approved message templates for the business account", is_dangerous: false, requires_approval: false }
  ],
  facebook: [
    { feature_key: "facebook.publish_post", name: "Publish Post", description: "Publish a post to the Facebook Page feed", is_dangerous: true, requires_approval: true },
    { feature_key: "facebook.list_posts", name: "List Posts", description: "List recent posts on the Page", is_dangerous: false, requires_approval: false },
    { feature_key: "facebook.page_insights", name: "Page Insights", description: "Retrieve Page engagement and impression metrics", is_dangerous: false, requires_approval: false }
  ],
  instagram: [
    { feature_key: "instagram.publish_media", name: "Publish Media", description: "Publish an image or reel to the Instagram business account", is_dangerous: true, requires_approval: true },
    { feature_key: "instagram.list_media", name: "List Media", description: "List recent media on the account", is_dangerous: false, requires_approval: false }
  ],
  "gemini-rotate": [
    { feature_key: "gemini_rotate.chat", name: "Chat Completions", description: "OpenAI-compatible /v1/chat/completions routed across the Gemini key pool", is_dangerous: false, requires_approval: false },
    { feature_key: "gemini_rotate.responses", name: "Responses", description: "OpenAI-compatible /v1/responses routed across the Gemini key pool", is_dangerous: false, requires_approval: false },
    { feature_key: "gemini_rotate.embeddings", name: "Embeddings", description: "OpenAI-compatible /v1/embeddings routed across the Gemini key pool", is_dangerous: false, requires_approval: false }
  ],
  "openrouter-rotate": [
    { feature_key: "openrouter_rotate.chat", name: "Chat Completions", description: "OpenAI-compatible /v1/chat/completions routed across the OpenRouter key pool", is_dangerous: false, requires_approval: false },
    { feature_key: "openrouter_rotate.responses", name: "Responses", description: "OpenAI-compatible /v1/responses routed across the OpenRouter key pool", is_dangerous: false, requires_approval: false },
    { feature_key: "openrouter_rotate.embeddings", name: "Embeddings", description: "OpenAI-compatible /v1/embeddings routed across the OpenRouter key pool", is_dangerous: false, requires_approval: false }
  ],
  "scrapedo-rotate": [
    { feature_key: "scrapedo_rotate.scrape", name: "Scrape Web Page", description: "Scrape.do-compatible /api/scrapedo proxy routed across the Scrape.do token pool", is_dangerous: false, requires_approval: false }
  ],
  "apify-rotate": [
    { feature_key: "apify_rotate.proxy", name: "Apify API Proxy", description: "Apify-compatible /api/apify/v2 transparent proxy (any endpoint/actor) routed across the Apify token pool", is_dangerous: false, requires_approval: false }
  ]
};

const EXECUTABLE_BUILT_IN_SLUGS = new Set([
  "gmail",
  "drive",
  "sheets",
  "hunter",
  "consulti",
  "custom-email",
  "slack",
  "github",
  "ssh",
  "apify",
  "resend",
  "gmail-app",
  "serper",
  "scrapedo",
  // AI / LLM
  "openrouter",
  "openai",
  "anthropic",
  // Productivity / CRM / Payments
  "notion",
  "airtable",
  "hubspot",
  "stripe",
  "linear",
  // Communication / Marketing
  "twilio",
  "mailchimp",
  "asana",
  // Databases
  "postgresql",
  // Meta social automation
  "whatsapp",
  "facebook",
  "instagram"
]);

// Rotate tools are not executed through /api/gateway/execute; they are consumed via the
// OpenAI-compatible /api/v1/* endpoints and manage a pool of keys instead of one credential.
const ROTATE_TOOL_SLUGS = new Set(["gemini-rotate", "openrouter-rotate", "scrapedo-rotate", "apify-rotate"]);

function isConnectableBuiltin(slug) {
  return EXECUTABLE_BUILT_IN_SLUGS.has(slug) || ROTATE_TOOL_SLUGS.has(slug);
}

async function getOrCreateBuiltinTool(workspaceId, slug) {
  const meta = TOOL_META[slug];
  if (!meta) return null;
  if (!isConnectableBuiltin(slug)) {
    throw new Error(`Built-in tool '${slug}' is listed in the catalog but is not executable by the gateway yet.`);
  }

  let { data: tool } = await supabaseAdmin
    .from("tools")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle();

  if (!tool) {
    const { data: newTool, error } = await supabaseAdmin
      .from("tools")
      .insert({
        workspace_id: workspaceId,
        name: meta.name,
        slug,
        provider: meta.provider,
        category: meta.category,
        description: meta.desc,
        tool_type: "built_in",
        official_website_url: meta.url,
        icon_source: "favicon",
        is_enabled: true
      })
      .select("id")
      .single();

    if (error) throw error;
    tool = newTool;

    // Seed default features per tool
    const features = featureMap[slug].map(f => ({ ...f, tool_id: tool.id }));
    if (features.length > 0) {
      await supabaseAdmin.from("tool_features").insert(features);
    }
  }

  return tool.id;
}

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "tools.connect_account");

    const body = await request.json();
    const parsed = AddAccountSchema.parse(body);

    let targetToolId = parsed.toolId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetToolId);

    if (!isUuid) {
      const toolSlug = targetToolId.replace(/^tool-/, "");
      const createdId = await getOrCreateBuiltinTool(userContext.workspace_id, toolSlug);
      if (!createdId) {
        throw new Error(`Built-in tool with slug '${toolSlug}' is not recognized`);
      }
      targetToolId = createdId;
    }

    // Get tool to determine auth type
    const { data: tool, error: toolError } = await supabaseAdmin
      .from("tools")
      .select("tool_type, slug")
      .eq("id", targetToolId)
      .single();

    if (toolError || !tool) {
      throw new Error("Associated tool not found");
    }
    if (tool.tool_type === "built_in" && !isConnectableBuiltin(tool.slug)) {
      throw new Error(`Built-in tool '${tool.slug}' is listed in the catalog but is not executable by the gateway yet.`);
    }

    const authType = (parsed.credentials.apiKey || parsed.credentials.key) ? "api_key" 
                   : (parsed.credentials.private_key || parsed.credentials.password) ? "credentials"
                   : "oauth";

    // Build connection metadata (exclude sensitive credentials)
    const metadata = {};
    const sensitiveKeys = [
      'apiKey', 'key', 'accessToken', 'access_token', 'refreshToken',
      'clientSecret', 'client_secret', 'password', 'security_token', 'auth_token',
      // SSH-specific secrets
      'private_key', 'private_key_passphrase', 'sudo_password'
    ];
    
    Object.keys(parsed.credentials).forEach(k => {
      if (!sensitiveKeys.includes(k)) {
        metadata[k] = parsed.credentials[k];
      }
    });

    const accountEmail = parsed.accountEmail || 
                         parsed.credentials.email || 
                         parsed.credentials.username || 
                         parsed.credentials.shop_domain || 
                         parsed.credentials.domain_name || 
                         parsed.credentials.host ||
                         "api-connected@gateway.local";

    // Insert into tool_accounts
    const { data: account, error: accError } = await supabaseAdmin
      .from("tool_accounts")
      .insert({
        workspace_id: userContext.workspace_id,
        user_id: userContext.id,
        tool_id: targetToolId,
        label: parsed.label,
        account_email: accountEmail,
        status: "connected",
        auth_type: authType,
        connection_metadata: metadata
      })
      .select()
      .single();

    if (accError) throw accError;

    // Encrypt credentials
    const primaryKey = parsed.credentials.apiKey || parsed.credentials.key;
    const secondaryKey = parsed.credentials.accessToken || parsed.credentials.access_token 
                       || parsed.credentials.security_token || parsed.credentials.auth_token;
    const clientSecret = parsed.credentials.clientSecret || parsed.credentials.client_secret;

    const encryptedApiKey = primaryKey ? encryptText(primaryKey) : null;
    const encryptedAccessToken = secondaryKey ? encryptText(secondaryKey) : null;
    const encryptedRefreshToken = parsed.credentials.refreshToken ? encryptText(parsed.credentials.refreshToken) : null;
    const encryptedClientSecret = clientSecret ? encryptText(clientSecret) : null;

    // SSH-specific columns — only include for SSH tool to avoid schema errors on migration
    const isSSHTool = tool.slug === "ssh";
    // Database tools authenticate with a password stored in the shared encrypted_password column.
    const PASSWORD_DB_SLUGS = new Set(["postgresql", "mysql", "oracle", "redis"]);
    const storesDbPassword = PASSWORD_DB_SLUGS.has(tool.slug);
    const encryptedPrivateKey           = isSSHTool && parsed.credentials.private_key            ? encryptText(parsed.credentials.private_key)            : null;
    const encryptedPrivateKeyPassphrase = isSSHTool && parsed.credentials.private_key_passphrase ? encryptText(parsed.credentials.private_key_passphrase) : null;
    const encryptedPassword             = (isSSHTool || storesDbPassword) && parsed.credentials.password ? encryptText(parsed.credentials.password)        : null;
    const encryptedSudoPassword         = isSSHTool && parsed.credentials.sudo_password          ? encryptText(parsed.credentials.sudo_password)          : null;

    // Build credential row — only spread SSH columns when relevant
    const credentialRow = {
      workspace_id: userContext.workspace_id,
      user_id: userContext.id,
      tool_account_id: account.id,
      encrypted_api_key: encryptedApiKey,
      encrypted_access_token: encryptedAccessToken,
      encrypted_refresh_token: encryptedRefreshToken,
      encrypted_client_secret: encryptedClientSecret,
      ...((isSSHTool || storesDbPassword) && {
        encrypted_password: encryptedPassword,
      }),
      ...(isSSHTool && {
        encrypted_private_key: encryptedPrivateKey,
        encrypted_private_key_passphrase: encryptedPrivateKeyPassphrase,
        encrypted_sudo_password: encryptedSudoPassword,
      }),
    };

    // Insert into tool_account_credentials
    const { error: credsError } = await supabaseAdmin
      .from("tool_account_credentials")
      .insert(credentialRow);

    if (credsError) throw credsError;

    // Generate permission records for all active agents in this workspace
    const { data: agents } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("workspace_id", userContext.workspace_id)
      .eq("status", "active");

    const { data: features } = await supabaseAdmin
      .from("tool_features")
      .select("feature_key, is_dangerous")
      .eq("tool_id", targetToolId);

    if (agents && features && agents.length > 0 && features.length > 0) {
      const permsToInsert = [];
      agents.forEach((agent) => {
        features.forEach((feat) => {
          permsToInsert.push({
            workspace_id: userContext.workspace_id,
            user_id: userContext.id,
            agent_id: agent.id,
            tool_id: targetToolId,
            tool_account_id: account.id,
            feature_key: feat.feature_key,
            allowed: feat.is_dangerous ? false : true, // disable dangerous by default
            daily_limit: feat.is_dangerous ? 5 : 100,
            require_approval: feat.is_dangerous ? true : false
          });
        });
      });

      if (permsToInsert.length > 0) {
        await supabaseAdmin.from("agent_tool_permissions").insert(permsToInsert);
      }
    }

    return NextResponse.json({ success: true, account });

  } catch (err) {
    console.error("Error adding tool account:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to add tool account" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
