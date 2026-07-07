"use client";

/* eslint-disable react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase/client";

const MockStoreContext = createContext(null);

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return url !== "" && !url.includes("your-supabase-project");
}

const INITIAL_BUILTIN_TOOLS = [
  {
    id: "tool-gmail",
    name: "Gmail",
    slug: "gmail",
    provider: "Google",
    description: "Read, search, draft, and send emails securely.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://mail.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-drive",
    name: "Google Drive",
    slug: "drive",
    provider: "Google",
    description: "Search files, read documents, upload, and manage files.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://drive.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-sheets",
    name: "Google Sheets",
    slug: "sheets",
    provider: "Google",
    description: "Read, write, and update spreadsheets.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://sheets.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-calendar",
    name: "Google Calendar",
    slug: "calendar",
    provider: "Google",
    description: "Schedule, list, and manage calendar events.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://calendar.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-hunter",
    name: "Hunter",
    slug: "hunter",
    provider: "Hunter.io",
    description: "Find and verify professional email addresses.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://hunter.io",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-consulti",
    name: "Consulti",
    slug: "consulti",
    provider: "Consulti Inc",
    description: "Search and enrich company data.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://consulti.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-custom-email",
    name: "Custom Email",
    slug: "custom-email",
    provider: "IMAP / POP3 / SMTP",
    description: "Connect any email account using IMAP or POP3 to read and search incoming mail, and SMTP to send. Works with Gmail, Outlook, ProtonMail, and any standard mail server.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://www.thunderbird.net",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-slack",
    name: "Slack",
    slug: "slack",
    provider: "Slack",
    description: "Post notifications, list channels, and send direct messages.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://slack.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-github",
    name: "GitHub",
    slug: "github",
    provider: "GitHub",
    description: "Access and create issues, view pull requests, and browse repositories.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://github.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  // ── AI / LLM ──────────────────────────────────────────────────────────────
  {
    id: "tool-openrouter",
    name: "OpenRouter",
    slug: "openrouter",
    provider: "OpenRouter AI",
    description: "Unified LLM gateway. Store your OpenRouter API key and call 200+ AI models (GPT-4o, Claude, Gemini, Llama) via an OpenAI-compatible endpoint through TMCP.",
    category: "AI/LLM",
    tool_type: "built_in",
    official_website_url: "https://openrouter.ai",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-anthropic",
    name: "Anthropic (Claude)",
    slug: "anthropic",
    provider: "Anthropic",
    description: "Access Claude 3.5 Sonnet, Claude 3 Opus, and other models. Store your Anthropic API key and use it via an OpenAI-compatible proxy through TMCP.",
    category: "AI/LLM",
    tool_type: "built_in",
    official_website_url: "https://anthropic.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-openai",
    name: "OpenAI",
    slug: "openai",
    provider: "OpenAI",
    description: "Access GPT-4o, GPT-4 Turbo, DALL-E, Whisper, and Embeddings. Store your OpenAI API key and route calls securely through TMCP.",
    category: "AI/LLM",
    tool_type: "built_in",
    official_website_url: "https://openai.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  // ── Email & Marketing ─────────────────────────────────────────────────────
  {
    id: "tool-resend",
    name: "Resend",
    slug: "resend",
    provider: "Resend",
    description: "Send transactional and marketing emails via a developer-first API. Simple REST with high deliverability.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://resend.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-instantly",
    name: "Instantly",
    slug: "instantly",
    provider: "Instantly.ai",
    description: "Scale cold email outreach campaigns, manage sending accounts, and track deliverability analytics.",
    category: "Marketing",
    tool_type: "built_in",
    official_website_url: "https://instantly.ai",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-twilio",
    name: "Twilio",
    slug: "twilio",
    provider: "Twilio",
    description: "Send SMS, make voice calls, and manage phone numbers programmatically.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://twilio.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  // ── Infrastructure ────────────────────────────────────────────────────────
  {
    id: "tool-ssh",
    name: "SSH Server",
    slug: "ssh",
    provider: "OpenSSH",
    description: "Securely connect to remote Linux/Unix servers over SSH. Run commands, manage files, and automate deployments.",
    category: "Infrastructure",
    tool_type: "built_in",
    official_website_url: "https://www.openssh.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-ftp",
    name: "FTP / SFTP",
    slug: "ftp",
    provider: "FTP/SFTP",
    description: "Transfer files to and from remote servers using FTP or the more secure SFTP protocol.",
    category: "Infrastructure",
    tool_type: "built_in",
    official_website_url: "https://en.wikipedia.org/wiki/File_Transfer_Protocol",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  // ── Data & Automation ─────────────────────────────────────────────────────
  {
    id: "tool-apify",
    name: "Apify",
    slug: "apify",
    provider: "Apify",
    description: "Run web scraping actors, extract structured data from any website, and automate browser tasks at scale.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://apify.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-stitch",
    name: "Stitch Data",
    slug: "stitch",
    provider: "Stitch",
    description: "ETL pipeline platform. Sync data from 100+ sources into your data warehouse or database.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://www.stitchdata.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  // ── Productivity & CRM ────────────────────────────────────────────────────
  {
    id: "tool-notion",
    name: "Notion",
    slug: "notion",
    provider: "Notion",
    description: "Read and write Notion pages, databases, and blocks. Automate documentation and knowledge base management.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://notion.so",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-airtable",
    name: "Airtable",
    slug: "airtable",
    provider: "Airtable",
    description: "Query, create, and update records in Airtable bases. A flexible relational database with a spreadsheet interface.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://airtable.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-hubspot",
    name: "HubSpot",
    slug: "hubspot",
    provider: "HubSpot",
    description: "Manage CRM contacts, companies, deals, and activities. Automate your entire sales and marketing pipeline.",
    category: "Marketing",
    tool_type: "built_in",
    official_website_url: "https://hubspot.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-stripe",
    name: "Stripe",
    slug: "stripe",
    provider: "Stripe",
    description: "Retrieve payment intents, customers, invoices, and subscription data. Trigger charges and manage billing programmatically.",
    category: "Payments",
    tool_type: "built_in",
    official_website_url: "https://stripe.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-linear",
    name: "Linear",
    slug: "linear",
    provider: "Linear",
    description: "Create issues, update project cycles, and manage engineering workflows in Linear.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://linear.app",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  // ── CRM / Marketing Automation ────────────────────────────────────────────
  {
    id: "tool-ghl",
    name: "GoHighLevel",
    slug: "ghl",
    provider: "GoHighLevel",
    description: "All-in-one CRM and marketing automation. Manage contacts, pipelines, campaigns, conversations, and sub-accounts via the GHL API.",
    category: "Marketing",
    tool_type: "built_in",
    official_website_url: "https://www.gohighlevel.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  // ── Gmail App Password (no OAuth) ─────────────────────────────────────────
  {
    id: "tool-gmail-app",
    name: "Gmail (App Password)",
    slug: "gmail-app",
    provider: "Google",
    description: "Connect a Gmail account using an App Password — no OAuth flow required. Ideal for service accounts and automated workflows using SMTP/IMAP.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://myaccount.google.com/apppasswords",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  // ── Database Integrations ─────────────────────────────────────────────────
  {
    id: "tool-postgresql",
    name: "PostgreSQL",
    slug: "postgresql",
    provider: "PostgreSQL",
    description: "Query, update, and manage PostgreSQL databases. Run safe queries and automate data ingestion.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://www.postgresql.org",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-mysql",
    name: "MySQL",
    slug: "mysql",
    provider: "MySQL",
    description: "Query, update, and manage MySQL databases. Stream data or automate schema updates.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://www.mysql.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-redis",
    name: "Redis",
    slug: "redis",
    provider: "Redis",
    description: "Execute commands, cache values, manage key-value stores, and monitor Redis queues.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://redis.io",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-mongodb",
    name: "MongoDB",
    slug: "mongodb",
    provider: "MongoDB",
    description: "Query collections, insert documents, and manage MongoDB database clusters.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://www.mongodb.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-oracle",
    name: "Oracle Database",
    slug: "oracle",
    provider: "Oracle",
    description: "Connect, query, and manage Oracle enterprise databases. Run enterprise data routines.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://www.oracle.com/database",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  // ── CRM / Productivity ────────────────────────────────────────────────────
  {
    id: "tool-salesforce",
    name: "Salesforce",
    slug: "salesforce",
    provider: "Salesforce",
    description: "Sync accounts, contacts, and custom objects. Run SOQL queries and update sales pipelines.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://www.salesforce.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-jira",
    name: "Jira",
    slug: "jira",
    provider: "Atlassian",
    description: "Track issues, manage sprints, create tickets, and automate project boards in Jira.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://www.atlassian.com/software/jira",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-asana",
    name: "Asana",
    slug: "asana",
    provider: "Asana",
    description: "Create tasks, update project boards, and sync workspaces in Asana.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://asana.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  // ── E-Commerce & Marketing ────────────────────────────────────────────────
  {
    id: "tool-shopify",
    name: "Shopify",
    slug: "shopify",
    provider: "Shopify",
    description: "Retrieve store products, query orders, manage customers, and fetch inventory data.",
    category: "Payments",
    tool_type: "built_in",
    official_website_url: "https://www.shopify.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-mailchimp",
    name: "Mailchimp",
    slug: "mailchimp",
    provider: "Mailchimp",
    description: "Sync subscribers, manage audiences, trigger campaigns, and track open rates.",
    category: "Marketing",
    tool_type: "built_in",
    official_website_url: "https://mailchimp.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-activecampaign",
    name: "ActiveCampaign",
    slug: "activecampaign",
    provider: "ActiveCampaign",
    description: "Manage contact lists, add tags, trigger automation flows, and track customer deals.",
    category: "Marketing",
    tool_type: "built_in",
    official_website_url: "https://activecampaign.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-serper",
    name: "Serper Search",
    slug: "serper",
    provider: "Serper",
    description: "Google Search API by Serper. Search Google for organic search results, news, maps, and shopping pages.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://serper.dev",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-scrapedo",
    name: "Scrape.do",
    slug: "scrapedo",
    provider: "Scrape.do",
    description: "Scrape.do rotating proxy API. Bypass antibot systems, CAPTCHAs, and blockades to scrape any website at scale.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://scrape.do",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  // ── Google Cloud ──────────────────────────────────────────────────────────
  {
    id: "tool-bigquery",
    name: "Google BigQuery",
    slug: "bigquery",
    provider: "Google Cloud",
    description: "Run SQL queries against Google BigQuery datasets. Analyze petabyte-scale data, manage tables, and export results. Connects via a Service Account key.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://cloud.google.com/bigquery",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  // ── Meta Social Automation ────────────────────────────────────────────────
  {
    id: "tool-whatsapp",
    name: "WhatsApp Business",
    slug: "whatsapp",
    provider: "Meta",
    description: "Send WhatsApp messages and pre-approved templates to customers via the Meta WhatsApp Cloud API.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://business.whatsapp.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-facebook",
    name: "Facebook Page",
    slug: "facebook",
    provider: "Meta",
    description: "Publish posts, read recent posts, and pull engagement insights for a Facebook Page via the Graph API.",
    category: "Marketing",
    tool_type: "built_in",
    official_website_url: "https://facebook.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-instagram",
    name: "Instagram",
    slug: "instagram",
    provider: "Meta",
    description: "Publish images and reels and read recent media from an Instagram business account via the Graph API.",
    category: "Marketing",
    tool_type: "built_in",
    official_website_url: "https://instagram.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  // ── API Key Rotation (OpenAI-compatible gateway) ──────────────────────────
  {
    id: "tool-gemini-rotate",
    name: "Gemini API Rotate",
    slug: "gemini-rotate",
    provider: "Google",
    description: "Store multiple Google Gemini API keys and call them through a single TMCP key. TMCP exposes OpenAI-compatible endpoints and rotates keys with automatic failover on rate limits.",
    category: "AI/LLM",
    tool_type: "built_in",
    official_website_url: "https://ai.google.dev",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-openrouter-rotate",
    name: "OpenRouter API Rotate",
    slug: "openrouter-rotate",
    provider: "OpenRouter",
    description: "Store multiple OpenRouter API keys and call them through a single TMCP key. TMCP exposes OpenAI-compatible endpoints and rotates keys with automatic failover on rate limits.",
    category: "AI/LLM",
    tool_type: "built_in",
    official_website_url: "https://openrouter.ai",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-scrapedo-rotate",
    name: "Scrape.do API Rotate",
    slug: "scrapedo-rotate",
    provider: "Scrape.do",
    description: "Store multiple Scrape.do API tokens and call them through a single TMCP key. TMCP exposes a Scrape.do-compatible proxy endpoint and rotates tokens with automatic failover on rate-limit/credit errors.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://scrape.do",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-apify-rotate",
    name: "Apify API Rotate",
    slug: "apify-rotate",
    provider: "Apify",
    description: "Store multiple Apify API tokens and call any Apify endpoint through a single TMCP key. TMCP exposes an Apify-compatible transparent proxy at /api/apify/v2 and rotates tokens with automatic failover on auth/quota/rate-limit errors.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://apify.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-serper-rotate",
    name: "Serper API Rotate",
    slug: "serper-rotate",
    provider: "Serper",
    description: "Store multiple Serper API keys and call any Serper endpoint through a single TMCP key. TMCP exposes a Serper-compatible transparent proxy at /api/serper and rotates keys with automatic failover on auth/quota/rate-limit errors.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://serper.dev",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
];

const INITIAL_FEATURES = [
  // Gmail (OAuth)
  { id: "feat-g-search", tool_id: "tool-gmail", feature_key: "gmail.search", name: "Search Emails", description: "Search user's mailbox with custom filters", is_dangerous: false, requires_approval: false },
  { id: "feat-g-read", tool_id: "tool-gmail", feature_key: "gmail.read", name: "Read Emails", description: "Fetch email headers and bodies", is_dangerous: false, requires_approval: false },
  { id: "feat-g-draft", tool_id: "tool-gmail", feature_key: "gmail.create_draft", name: "Create Draft", description: "Prepare email drafts for review", is_dangerous: true, requires_approval: false },
  { id: "feat-g-send", tool_id: "tool-gmail", feature_key: "gmail.send", name: "Send Email", description: "Send emails directly on user behalf", is_dangerous: true, requires_approval: true },

  // Gmail App Password
  { id: "feat-gapp-read", tool_id: "tool-gmail-app", feature_key: "gmail_app.read_emails", name: "Read Emails (IMAP)", description: "Fetch emails via IMAP using App Password", is_dangerous: false, requires_approval: false },
  { id: "feat-gapp-search", tool_id: "tool-gmail-app", feature_key: "gmail_app.search_emails", name: "Search Emails (IMAP)", description: "Search Gmail inbox using IMAP queries", is_dangerous: false, requires_approval: false },
  { id: "feat-gapp-send", tool_id: "tool-gmail-app", feature_key: "gmail_app.send_email", name: "Send Email (SMTP)", description: "Send emails using Gmail SMTP with App Password", is_dangerous: true, requires_approval: true },

  // Drive
  { id: "feat-d-search", tool_id: "tool-drive", feature_key: "drive.search", name: "Search Files", description: "Search files in Google Drive", is_dangerous: false, requires_approval: false },
  { id: "feat-d-read", tool_id: "tool-drive", feature_key: "drive.read", name: "Read File Content", description: "Read file contents", is_dangerous: false, requires_approval: false },
  { id: "feat-d-upload", tool_id: "tool-drive", feature_key: "drive.upload", name: "Upload File", description: "Upload new files to drive", is_dangerous: true, requires_approval: false },
  { id: "feat-d-delete", tool_id: "tool-drive", feature_key: "drive.delete", name: "Delete File", description: "Remove files permanently", is_dangerous: true, requires_approval: true },

  // Google Sheets
  { id: "feat-sh-read", tool_id: "tool-sheets", feature_key: "sheets.read", name: "Read Sheet", description: "Read rows and cell values from a spreadsheet", is_dangerous: false, requires_approval: false },
  { id: "feat-sh-write", tool_id: "tool-sheets", feature_key: "sheets.write", name: "Write Cells", description: "Update cell values in a spreadsheet", is_dangerous: true, requires_approval: false },
  { id: "feat-sh-append", tool_id: "tool-sheets", feature_key: "sheets.append", name: "Append Rows", description: "Append new rows to a sheet", is_dangerous: true, requires_approval: false },
  { id: "feat-sh-clear", tool_id: "tool-sheets", feature_key: "sheets.clear", name: "Clear Range", description: "Clear a range of cells in a spreadsheet", is_dangerous: true, requires_approval: true },

  // Google Calendar
  { id: "feat-cal-list", tool_id: "tool-calendar", feature_key: "calendar.list_events", name: "List Events", description: "Fetch upcoming calendar events", is_dangerous: false, requires_approval: false },
  { id: "feat-cal-create", tool_id: "tool-calendar", feature_key: "calendar.create_event", name: "Create Event", description: "Create a new calendar event", is_dangerous: true, requires_approval: false },
  { id: "feat-cal-delete", tool_id: "tool-calendar", feature_key: "calendar.delete_event", name: "Delete Event", description: "Remove a calendar event", is_dangerous: true, requires_approval: true },

  // Hunter
  { id: "feat-h-find", tool_id: "tool-hunter", feature_key: "hunter.find_email", name: "Find Email", description: "Get email address by name and domain", is_dangerous: false, requires_approval: false },
  { id: "feat-h-verify", tool_id: "tool-hunter", feature_key: "hunter.verify_email", name: "Verify Email", description: "Verify deliverability of an email", is_dangerous: false, requires_approval: false },
  { id: "feat-h-domain", tool_id: "tool-hunter", feature_key: "hunter.domain_search", name: "Domain Search", description: "List email addresses in a domain", is_dangerous: false, requires_approval: false },

  // Consulti
  { id: "feat-c-search", tool_id: "tool-consulti", feature_key: "consulti.search_company", name: "Search Company", description: "Search directories for company records", is_dangerous: false, requires_approval: false },
  { id: "feat-c-enrich", tool_id: "tool-consulti", feature_key: "consulti.enrich_company", name: "Enrich Company", description: "Fetch details, size, and tech stack of a company", is_dangerous: false, requires_approval: false },

  // Custom Email (IMAP / POP3 / SMTP)
  { id: "feat-email-read", tool_id: "tool-custom-email", feature_key: "email.read_emails", name: "Read Emails", description: "Fetch recent email summaries from the inbox via IMAP or POP3", is_dangerous: false, requires_approval: false },
  { id: "feat-email-search", tool_id: "tool-custom-email", feature_key: "email.search_emails", name: "Search Emails", description: "Search emails matching specific criteria via IMAP", is_dangerous: false, requires_approval: false },
  { id: "feat-email-send", tool_id: "tool-custom-email", feature_key: "email.send_email", name: "Send Email (SMTP)", description: "Send a mail directly using the configured SMTP settings", is_dangerous: true, requires_approval: true },

  // Slack
  { id: "feat-slack-post", tool_id: "tool-slack", feature_key: "slack.post_message", name: "Post Message", description: "Send messages to a public channel", is_dangerous: true, requires_approval: false },
  { id: "feat-slack-dm", tool_id: "tool-slack", feature_key: "slack.send_dm", name: "Send Direct Message", description: "Send a private message to a user", is_dangerous: true, requires_approval: true },
  { id: "feat-slack-channels", tool_id: "tool-slack", feature_key: "slack.list_channels", name: "List Channels", description: "Get a list of available public channels", is_dangerous: false, requires_approval: false },

  // GitHub
  { id: "feat-gh-issues", tool_id: "tool-github", feature_key: "github.list_issues", name: "List Issues", description: "Fetch issues in a specific repository", is_dangerous: false, requires_approval: false },
  { id: "feat-gh-create", tool_id: "tool-github", feature_key: "github.create_issue", name: "Create Issue", description: "Open a new issue in a repository", is_dangerous: true, requires_approval: false },
  { id: "feat-gh-create-repo", tool_id: "tool-github", feature_key: "github.create_repository", name: "Create Repository", description: "Create a repository under the authenticated account or organization", is_dangerous: true, requires_approval: true },
  { id: "feat-gh-pr", tool_id: "tool-github", feature_key: "github.list_prs", name: "List Pull Requests", description: "Fetch open pull requests in a repository", is_dangerous: false, requires_approval: false },

  // OpenRouter
  { id: "feat-or-chat", tool_id: "tool-openrouter", feature_key: "openrouter.chat", name: "Chat Completions", description: "Call any LLM via OpenAI-compatible /chat/completions endpoint through TMCP proxy", is_dangerous: false, requires_approval: false },
  { id: "feat-or-models", tool_id: "tool-openrouter", feature_key: "openrouter.list_models", name: "List Models", description: "Retrieve available models and their pricing", is_dangerous: false, requires_approval: false },

  // Anthropic
  { id: "feat-ant-chat", tool_id: "tool-anthropic", feature_key: "anthropic.chat", name: "Messages API", description: "Call Claude models via OpenAI-compatible proxy. Supports claude-3-5-sonnet, claude-3-opus, claude-haiku", is_dangerous: false, requires_approval: false },
  { id: "feat-ant-vision", tool_id: "tool-anthropic", feature_key: "anthropic.vision", name: "Vision (Multimodal)", description: "Send images alongside text to Claude vision models", is_dangerous: false, requires_approval: false },

  // OpenAI
  { id: "feat-oai-chat", tool_id: "tool-openai", feature_key: "openai.chat", name: "Chat Completions", description: "Call GPT-4o, GPT-4 Turbo via /v1/chat/completions through TMCP", is_dangerous: false, requires_approval: false },
  { id: "feat-oai-embed", tool_id: "tool-openai", feature_key: "openai.embeddings", name: "Embeddings", description: "Generate text embeddings via text-embedding-3-small/large", is_dangerous: false, requires_approval: false },
  { id: "feat-oai-image", tool_id: "tool-openai", feature_key: "openai.image_gen", name: "Image Generation", description: "Generate images with DALL-E 3", is_dangerous: false, requires_approval: false },

  // Resend
  { id: "feat-res-send", tool_id: "tool-resend", feature_key: "resend.send_email", name: "Send Email", description: "Send a transactional email via Resend API", is_dangerous: true, requires_approval: true },
  { id: "feat-res-batch", tool_id: "tool-resend", feature_key: "resend.send_batch", name: "Batch Send", description: "Send up to 100 emails in a single API call", is_dangerous: true, requires_approval: true },

  // Instantly
  { id: "feat-ins-campaigns", tool_id: "tool-instantly", feature_key: "instantly.list_campaigns", name: "List Campaigns", description: "Get all cold email campaigns and their stats", is_dangerous: false, requires_approval: false },
  { id: "feat-ins-leads", tool_id: "tool-instantly", feature_key: "instantly.add_leads", name: "Add Leads", description: "Add leads/contacts to a campaign", is_dangerous: true, requires_approval: false },
  { id: "feat-ins-analytics", tool_id: "tool-instantly", feature_key: "instantly.analytics", name: "Campaign Analytics", description: "Fetch open rates, reply rates, and bounce data", is_dangerous: false, requires_approval: false },

  // Twilio
  { id: "feat-twilio-sms", tool_id: "tool-twilio", feature_key: "twilio.send_sms", name: "Send SMS", description: "Send an SMS message to a phone number", is_dangerous: true, requires_approval: true },
  { id: "feat-twilio-call", tool_id: "tool-twilio", feature_key: "twilio.make_call", name: "Make Call", description: "Initiate a voice call to a number", is_dangerous: true, requires_approval: true },
  { id: "feat-twilio-numbers", tool_id: "tool-twilio", feature_key: "twilio.list_numbers", name: "List Phone Numbers", description: "List all purchased Twilio phone numbers", is_dangerous: false, requires_approval: false },

  // SSH
  { id: "feat-ssh-exec", tool_id: "tool-ssh", feature_key: "ssh.exec_command", name: "Execute Command", description: "Run a shell command on the remote server", is_dangerous: true, requires_approval: true },
  { id: "feat-ssh-upload", tool_id: "tool-ssh", feature_key: "ssh.upload_file", name: "Upload File (SCP)", description: "Upload a file to the remote server via SCP", is_dangerous: true, requires_approval: true },
  { id: "feat-ssh-ls", tool_id: "tool-ssh", feature_key: "ssh.list_directory", name: "List Directory", description: "List files in a remote directory", is_dangerous: false, requires_approval: false },

  // FTP
  { id: "feat-ftp-upload", tool_id: "tool-ftp", feature_key: "ftp.upload_file", name: "Upload File", description: "Upload a file to the FTP/SFTP server", is_dangerous: true, requires_approval: false },
  { id: "feat-ftp-download", tool_id: "tool-ftp", feature_key: "ftp.download_file", name: "Download File", description: "Download a file from the server", is_dangerous: false, requires_approval: false },
  { id: "feat-ftp-ls", tool_id: "tool-ftp", feature_key: "ftp.list_directory", name: "List Directory", description: "List files in a remote directory", is_dangerous: false, requires_approval: false },
  { id: "feat-ftp-delete", tool_id: "tool-ftp", feature_key: "ftp.delete_file", name: "Delete File", description: "Delete a file from the server", is_dangerous: true, requires_approval: true },

  // Apify
  { id: "feat-apify-run", tool_id: "tool-apify", feature_key: "apify.run_actor", name: "Run Actor", description: "Trigger an Apify actor to run a scraping or automation task", is_dangerous: false, requires_approval: false },
  { id: "feat-apify-dataset", tool_id: "tool-apify", feature_key: "apify.get_dataset", name: "Get Dataset", description: "Retrieve the results from a completed actor run dataset", is_dangerous: false, requires_approval: false },

  // Stitch
  { id: "feat-stitch-sources", tool_id: "tool-stitch", feature_key: "stitch.list_sources", name: "List Sources", description: "List all configured data sources in Stitch", is_dangerous: false, requires_approval: false },
  { id: "feat-stitch-sync", tool_id: "tool-stitch", feature_key: "stitch.trigger_sync", name: "Trigger Sync", description: "Manually trigger a sync for a specific data source", is_dangerous: false, requires_approval: false },

  // Notion
  { id: "feat-notion-search", tool_id: "tool-notion", feature_key: "notion.search", name: "Search Pages", description: "Search across all pages and databases", is_dangerous: false, requires_approval: false },
  { id: "feat-notion-read", tool_id: "tool-notion", feature_key: "notion.read_page", name: "Read Page", description: "Fetch the full content of a Notion page", is_dangerous: false, requires_approval: false },
  { id: "feat-notion-write", tool_id: "tool-notion", feature_key: "notion.create_page", name: "Create Page", description: "Create a new page in a Notion database", is_dangerous: true, requires_approval: false },
  { id: "feat-notion-db", tool_id: "tool-notion", feature_key: "notion.query_database", name: "Query Database", description: "Filter and sort records in a Notion database", is_dangerous: false, requires_approval: false },

  // Airtable
  { id: "feat-air-list", tool_id: "tool-airtable", feature_key: "airtable.list_records", name: "List Records", description: "Fetch records from a table with optional filters", is_dangerous: false, requires_approval: false },
  { id: "feat-air-create", tool_id: "tool-airtable", feature_key: "airtable.create_record", name: "Create Record", description: "Insert a new record into a table", is_dangerous: true, requires_approval: false },
  { id: "feat-air-update", tool_id: "tool-airtable", feature_key: "airtable.update_record", name: "Update Record", description: "Update fields of an existing record", is_dangerous: true, requires_approval: false },

  // HubSpot
  { id: "feat-hub-contacts", tool_id: "tool-hubspot", feature_key: "hubspot.list_contacts", name: "List Contacts", description: "Retrieve contacts from the CRM", is_dangerous: false, requires_approval: false },
  { id: "feat-hub-create", tool_id: "tool-hubspot", feature_key: "hubspot.create_contact", name: "Create Contact", description: "Add a new contact to HubSpot CRM", is_dangerous: true, requires_approval: false },
  { id: "feat-hub-deals", tool_id: "tool-hubspot", feature_key: "hubspot.list_deals", name: "List Deals", description: "Retrieve deals from the sales pipeline", is_dangerous: false, requires_approval: false },
  { id: "feat-hub-note", tool_id: "tool-hubspot", feature_key: "hubspot.create_note", name: "Create Note", description: "Add a note to a contact or company", is_dangerous: false, requires_approval: false },

  // Stripe
  { id: "feat-str-customers", tool_id: "tool-stripe", feature_key: "stripe.list_customers", name: "List Customers", description: "Retrieve Stripe customers", is_dangerous: false, requires_approval: false },
  { id: "feat-str-invoices", tool_id: "tool-stripe", feature_key: "stripe.list_invoices", name: "List Invoices", description: "Fetch invoices for a customer", is_dangerous: false, requires_approval: false },
  { id: "feat-str-charge", tool_id: "tool-stripe", feature_key: "stripe.create_charge", name: "Create Charge", description: "Initiate a payment charge", is_dangerous: true, requires_approval: true },
  { id: "feat-str-refund", tool_id: "tool-stripe", feature_key: "stripe.create_refund", name: "Refund", description: "Issue a refund for a payment", is_dangerous: true, requires_approval: true },

  // Linear
  { id: "feat-lin-issues", tool_id: "tool-linear", feature_key: "linear.list_issues", name: "List Issues", description: "Fetch issues from a team or project", is_dangerous: false, requires_approval: false },
  { id: "feat-lin-create", tool_id: "tool-linear", feature_key: "linear.create_issue", name: "Create Issue", description: "Create a new issue in Linear", is_dangerous: true, requires_approval: false },
  { id: "feat-lin-update", tool_id: "tool-linear", feature_key: "linear.update_issue", name: "Update Issue", description: "Change status, assignee, or priority of an issue", is_dangerous: true, requires_approval: false },

  // GoHighLevel (GHL)
  { id: "feat-ghl-contacts", tool_id: "tool-ghl", feature_key: "ghl.list_contacts", name: "List Contacts", description: "Retrieve contacts from a GHL sub-account", is_dangerous: false, requires_approval: false },
  { id: "feat-ghl-create-contact", tool_id: "tool-ghl", feature_key: "ghl.create_contact", name: "Create Contact", description: "Add a new contact to the CRM", is_dangerous: true, requires_approval: false },
  { id: "feat-ghl-pipelines", tool_id: "tool-ghl", feature_key: "ghl.list_pipelines", name: "List Pipelines", description: "Retrieve pipelines and stages in a sub-account", is_dangerous: false, requires_approval: false },
  { id: "feat-ghl-opportunities", tool_id: "tool-ghl", feature_key: "ghl.list_opportunities", name: "List Opportunities", description: "Retrieve opportunities in a pipeline", is_dangerous: false, requires_approval: false },
  { id: "feat-ghl-send-sms", tool_id: "tool-ghl", feature_key: "ghl.send_sms", name: "Send SMS", description: "Send an SMS to a contact via GHL", is_dangerous: true, requires_approval: true },
  { id: "feat-ghl-campaigns", tool_id: "tool-ghl", feature_key: "ghl.list_campaigns", name: "List Campaigns", description: "Fetch email/SMS campaigns in a sub-account", is_dangerous: false, requires_approval: false },
  { id: "feat-ghl-calendars", tool_id: "tool-ghl", feature_key: "ghl.list_calendars", name: "List Calendars", description: "Retrieve calendars and appointment slots", is_dangerous: false, requires_approval: false },

  // PostgreSQL
  { id: "feat-pg-query", tool_id: "tool-postgresql", feature_key: "postgresql.query", name: "Query Database (SELECT)", description: "Execute safe SQL SELECT queries on a PostgreSQL database", is_dangerous: false, requires_approval: false },
  { id: "feat-pg-execute", tool_id: "tool-postgresql", feature_key: "postgresql.execute", name: "Execute Mutation (INSERT/UPDATE/DELETE)", description: "Execute SQL mutations (INSERT, UPDATE, DELETE) on a PostgreSQL database", is_dangerous: true, requires_approval: true },
  { id: "feat-pg-tables", tool_id: "tool-postgresql", feature_key: "postgresql.list_tables", name: "List Schema Tables", description: "Retrieve a list of tables and schema structure in the PostgreSQL database", is_dangerous: false, requires_approval: false },

  // MySQL
  { id: "feat-my-query", tool_id: "tool-mysql", feature_key: "mysql.query", name: "Query Database (SELECT)", description: "Execute safe SQL SELECT queries on a MySQL database", is_dangerous: false, requires_approval: false },
  { id: "feat-my-execute", tool_id: "tool-mysql", feature_key: "mysql.execute", name: "Execute Mutation (INSERT/UPDATE/DELETE)", description: "Execute SQL mutations (INSERT, UPDATE, DELETE) on a MySQL database", is_dangerous: true, requires_approval: true },
  { id: "feat-my-tables", tool_id: "tool-mysql", feature_key: "mysql.list_tables", name: "List Schema Tables", description: "Retrieve a list of tables and schema structure in the MySQL database", is_dangerous: false, requires_approval: false },

  // Redis
  { id: "feat-redis-get", tool_id: "tool-redis", feature_key: "redis.get", name: "Get Key Value", description: "Retrieve the value of a string key in Redis", is_dangerous: false, requires_approval: false },
  { id: "feat-redis-set", tool_id: "tool-redis", feature_key: "redis.set", name: "Set Key Value", description: "Set or update the string value of a key in Redis", is_dangerous: false, requires_approval: false },
  { id: "feat-redis-delete", tool_id: "tool-redis", feature_key: "redis.delete", name: "Delete Key", description: "Remove a key from the Redis database", is_dangerous: true, requires_approval: true },
  { id: "feat-redis-keys", tool_id: "tool-redis", feature_key: "redis.keys", name: "Search Keys (Pattern)", description: "Find keys matching a wildcard pattern in Redis", is_dangerous: false, requires_approval: false },

  // MongoDB
  { id: "feat-mongo-find", tool_id: "tool-mongodb", feature_key: "mongodb.find", name: "Find Documents", description: "Query a collection for documents matching a filter in MongoDB", is_dangerous: false, requires_approval: false },
  { id: "feat-mongo-insert", tool_id: "tool-mongodb", feature_key: "mongodb.insert", name: "Insert Documents", description: "Add one or more documents to a MongoDB collection", is_dangerous: true, requires_approval: false },
  { id: "feat-mongo-update", tool_id: "tool-mongodb", feature_key: "mongodb.update", name: "Update Documents", description: "Modify existing documents in a MongoDB collection", is_dangerous: true, requires_approval: true },
  { id: "feat-mongo-delete", tool_id: "tool-mongodb", feature_key: "mongodb.delete", name: "Delete Documents", description: "Permanently delete documents from a MongoDB collection", is_dangerous: true, requires_approval: true },

  // Oracle Database
  { id: "feat-ora-query", tool_id: "tool-oracle", feature_key: "oracle.query", name: "Query Database (SELECT)", description: "Run safe SELECT queries on an Oracle database", is_dangerous: false, requires_approval: false },
  { id: "feat-ora-execute", tool_id: "tool-oracle", feature_key: "oracle.execute", name: "Execute Statement (INSERT/UPDATE/DELETE)", description: "Run INSERT, UPDATE, or DELETE statements on an Oracle database", is_dangerous: true, requires_approval: true },

  // Salesforce
  { id: "feat-sf-query", tool_id: "tool-salesforce", feature_key: "salesforce.query", name: "Run SOQL Query", description: "Search Salesforce records using SOQL (Salesforce Object Query Language)", is_dangerous: false, requires_approval: false },
  { id: "feat-sf-create", tool_id: "tool-salesforce", feature_key: "salesforce.create_record", name: "Create Object Record", description: "Create a new record (Lead, Account, Contact) in Salesforce", is_dangerous: true, requires_approval: false },
  { id: "feat-sf-update", tool_id: "tool-salesforce", feature_key: "salesforce.update_record", name: "Update Object Record", description: "Modify fields of an existing Salesforce record", is_dangerous: true, requires_approval: true },

  // Jira
  { id: "feat-jira-list", tool_id: "tool-jira", feature_key: "jira.list_issues", name: "List Issues", description: "Retrieve Jira issues with optional filter queries", is_dangerous: false, requires_approval: false },
  { id: "feat-jira-create", tool_id: "tool-jira", feature_key: "jira.create_issue", name: "Create Ticket", description: "Create a new issue/bug/task in a Jira project", is_dangerous: true, requires_approval: false },
  { id: "feat-jira-update", tool_id: "tool-jira", feature_key: "jira.update_issue", name: "Transition / Comment Issue", description: "Update task status or add comment to a Jira ticket", is_dangerous: false, requires_approval: false },

  // Asana
  { id: "feat-asana-list", tool_id: "tool-asana", feature_key: "asana.list_tasks", name: "List Tasks", description: "Retrieve tasks in an Asana project or workspace", is_dangerous: false, requires_approval: false },
  { id: "feat-asana-create", tool_id: "tool-asana", feature_key: "asana.create_task", name: "Create Task", description: "Create a new task in an Asana project", is_dangerous: true, requires_approval: false },
  { id: "feat-asana-update", tool_id: "tool-asana", feature_key: "asana.update_task", name: "Update Task Details", description: "Modify status, assignee, or description of an Asana task", is_dangerous: false, requires_approval: false },

  // Shopify
  { id: "feat-shop-products", tool_id: "tool-shopify", feature_key: "shopify.get_products", name: "Fetch Products", description: "Retrieve products listing, prices, and stock levels from Shopify store", is_dangerous: false, requires_approval: false },
  { id: "feat-shop-orders", tool_id: "tool-shopify", feature_key: "shopify.get_orders", name: "Fetch Orders", description: "Retrieve store sales orders and customer invoice logs", is_dangerous: false, requires_approval: false },
  { id: "feat-shop-create", tool_id: "tool-shopify", feature_key: "shopify.create_product", name: "Create Product Listing", description: "Create a new product listing in the Shopify catalog", is_dangerous: true, requires_approval: false },

  // Mailchimp
  { id: "feat-mc-members", tool_id: "tool-mailchimp", feature_key: "mailchimp.list_members", name: "Fetch Subscribers", description: "Retrieve mailing list subscribers and audience contacts from Mailchimp", is_dangerous: false, requires_approval: false },
  { id: "feat-mc-add", tool_id: "tool-mailchimp", feature_key: "mailchimp.add_subscriber", name: "Add List Subscriber", description: "Add a new email subscriber to a Mailchimp audience list", is_dangerous: true, requires_approval: false },

  // ActiveCampaign
  { id: "feat-ac-contacts", tool_id: "tool-activecampaign", feature_key: "activecampaign.list_contacts", name: "Fetch Contacts", description: "Retrieve mailing contacts and pipeline prospects from ActiveCampaign", is_dangerous: false, requires_approval: false },
  { id: "feat-ac-create", tool_id: "tool-activecampaign", feature_key: "activecampaign.create_contact", name: "Create Contact & Sync Tags", description: "Add a contact and assign marketing/automation tags in ActiveCampaign", is_dangerous: true, requires_approval: false },

  // Serper Search
  { id: "feat-serper-search", tool_id: "tool-serper", feature_key: "serper.search", name: "Google Search", description: "Search Google for organic results, news, maps, and shopping", is_dangerous: false, requires_approval: false },

  // Scrape.do
  { id: "feat-scrapedo-scrape", tool_id: "tool-scrapedo", feature_key: "scrapedo.scrape", name: "Scrape Web Page", description: "Scrape content of any web page bypassing antibot blocks", is_dangerous: false, requires_approval: false },

  // Google BigQuery
  { id: "feat-bq-query", tool_id: "tool-bigquery", feature_key: "bigquery.query", name: "Run SQL Query", description: "Execute a SQL SELECT query against a BigQuery dataset", is_dangerous: false, requires_approval: false },
  { id: "feat-bq-job", tool_id: "tool-bigquery", feature_key: "bigquery.run_job", name: "Run Query Job", description: "Submit an async BigQuery job and fetch results when complete", is_dangerous: false, requires_approval: false },
  { id: "feat-bq-tables", tool_id: "tool-bigquery", feature_key: "bigquery.list_tables", name: "List Tables", description: "List all tables inside a BigQuery dataset", is_dangerous: false, requires_approval: false },
  { id: "feat-bq-insert", tool_id: "tool-bigquery", feature_key: "bigquery.insert_rows", name: "Insert Rows (Streaming)", description: "Stream rows into a BigQuery table using the insertAll API", is_dangerous: true, requires_approval: false },

  // WhatsApp Business (Meta Cloud API)
  { id: "feat-wa-send", tool_id: "tool-whatsapp", feature_key: "whatsapp.send_message", name: "Send Message", description: "Send a WhatsApp text message to a recipient", is_dangerous: true, requires_approval: true },
  { id: "feat-wa-template", tool_id: "tool-whatsapp", feature_key: "whatsapp.send_template", name: "Send Template", description: "Send a pre-approved WhatsApp template message", is_dangerous: true, requires_approval: true },
  { id: "feat-wa-templates", tool_id: "tool-whatsapp", feature_key: "whatsapp.list_templates", name: "List Templates", description: "List approved message templates for the business account", is_dangerous: false, requires_approval: false },

  // Facebook Page (Meta Graph API)
  { id: "feat-fb-post", tool_id: "tool-facebook", feature_key: "facebook.publish_post", name: "Publish Post", description: "Publish a post to the Page feed", is_dangerous: true, requires_approval: true },
  { id: "feat-fb-list", tool_id: "tool-facebook", feature_key: "facebook.list_posts", name: "List Posts", description: "List recent posts on the Page", is_dangerous: false, requires_approval: false },
  { id: "feat-fb-insights", tool_id: "tool-facebook", feature_key: "facebook.page_insights", name: "Page Insights", description: "Retrieve Page engagement and impression metrics", is_dangerous: false, requires_approval: false },

  // Instagram (Meta Graph API)
  { id: "feat-ig-publish", tool_id: "tool-instagram", feature_key: "instagram.publish_media", name: "Publish Media", description: "Publish an image or reel to the business account", is_dangerous: true, requires_approval: true },
  { id: "feat-ig-list", tool_id: "tool-instagram", feature_key: "instagram.list_media", name: "List Media", description: "List recent media on the account", is_dangerous: false, requires_approval: false },

  // Gemini API Rotate (OpenAI-compatible)
  { id: "feat-grot-chat", tool_id: "tool-gemini-rotate", feature_key: "gemini_rotate.chat", name: "Chat Completions", description: "POST /v1/chat/completions routed across the Gemini key pool", is_dangerous: false, requires_approval: false },
  { id: "feat-grot-resp", tool_id: "tool-gemini-rotate", feature_key: "gemini_rotate.responses", name: "Responses", description: "POST /v1/responses routed across the Gemini key pool", is_dangerous: false, requires_approval: false },
  { id: "feat-grot-embed", tool_id: "tool-gemini-rotate", feature_key: "gemini_rotate.embeddings", name: "Embeddings", description: "POST /v1/embeddings routed across the Gemini key pool", is_dangerous: false, requires_approval: false },

  // OpenRouter API Rotate (OpenAI-compatible)
  { id: "feat-orot-chat", tool_id: "tool-openrouter-rotate", feature_key: "openrouter_rotate.chat", name: "Chat Completions", description: "POST /v1/chat/completions routed across the OpenRouter key pool", is_dangerous: false, requires_approval: false },
  { id: "feat-orot-resp", tool_id: "tool-openrouter-rotate", feature_key: "openrouter_rotate.responses", name: "Responses", description: "POST /v1/responses routed across the OpenRouter key pool", is_dangerous: false, requires_approval: false },
  { id: "feat-orot-embed", tool_id: "tool-openrouter-rotate", feature_key: "openrouter_rotate.embeddings", name: "Embeddings", description: "POST /v1/embeddings routed across the OpenRouter key pool", is_dangerous: false, requires_approval: false },

  // Scrape.do API Rotate (Scrape.do-compatible proxy)
  { id: "feat-srot-scrape", tool_id: "tool-scrapedo-rotate", feature_key: "scrapedo_rotate.scrape", name: "Scrape Web Page", description: "GET/POST /api/scrapedo routed across the Scrape.do token pool", is_dangerous: false, requires_approval: false },

  // Apify API Rotate (Apify-compatible transparent proxy)
  { id: "feat-arot-proxy", tool_id: "tool-apify-rotate", feature_key: "apify_rotate.proxy", name: "Apify API Proxy", description: "Any method/path under /api/apify/v2 routed across the Apify token pool", is_dangerous: false, requires_approval: false },

  // Serper API Rotate (Serper-compatible transparent proxy)
  { id: "feat-serprot-proxy", tool_id: "tool-serper-rotate", feature_key: "serper_rotate.proxy", name: "Serper API Proxy", description: "Any method/path under /api/serper routed across the Serper key pool", is_dangerous: false, requires_approval: false },
];

const INITIAL_ACCOUNTS = [
  { id: "acc-g-1", tool_id: "tool-gmail", label: "Personal Gmail", account_email: "admin.root@gmail.com", status: "connected", auth_type: "oauth", created_at: "2026-05-01T12:00:00Z" },
  { id: "acc-g-2", tool_id: "tool-gmail", label: "Client Support Gmail", account_email: "support@company.com", status: "connected", auth_type: "oauth", created_at: "2026-05-15T09:30:00Z" },
  { id: "acc-d-1", tool_id: "tool-drive", label: "Client Drive", account_email: "support@company.com", status: "connected", auth_type: "oauth", created_at: "2026-05-15T09:31:00Z" },
  { id: "acc-h-1", tool_id: "tool-hunter", label: "Main Hunter Account", account_email: "hunter-billing@company.com", status: "connected", auth_type: "api_key", created_at: "2026-05-02T14:00:00Z" }
];

const INITIAL_AGENTS = [
  { id: "agent-1", name: "Lead Research Agent", description: "Enriches leads and performs email verification.", status: "active", created_at: "2026-05-10T10:00:00Z" },
  { id: "agent-2", name: "Email Assistant Agent", description: "Drafts and replies to customer service tickets.", status: "active", created_at: "2026-05-12T11:00:00Z" },
  { id: "agent-3", name: "Drive Search Agent", description: "Organizes corporate drives and searches documentation.", status: "active", created_at: "2026-05-14T08:00:00Z" },
  { id: "agent-4", name: "Client Support Agent", description: "Handles live chats and queries.", status: "disabled", created_at: "2026-05-20T16:00:00Z" }
];

const INITIAL_KEYS = [
  { id: "key-1", agent_id: "agent-1", name: "Lead Research Dev", key_prefix: "mcp_live_e5f8a0", status: "active", last_used_at: "2026-06-06T00:42:01Z", expires_at: "2027-06-06T00:00:00Z", created_at: "2026-05-10T10:05:00Z" },
  { id: "key-2", agent_id: "agent-2", name: "Email Support Live", key_prefix: "mcp_live_9a2b8e", status: "active", last_used_at: "2026-06-06T00:31:55Z", expires_at: null, created_at: "2026-05-12T11:15:00Z" },
  { id: "key-3", agent_id: "agent-3", name: "Drive Reader API", key_prefix: "mcp_live_7c3f1d", status: "active", last_used_at: "2026-06-05T22:10:45Z", expires_at: "2026-12-31T23:59:59Z", created_at: "2026-05-14T08:10:00Z" }
];

const INITIAL_USERS = [
  { id: "usr-1", name: "Admin Root", email: "admin.root@tmcp.io", role: "Owner", status: "active", joined_at: "2026-05-01T00:00:00Z" },
  { id: "usr-2", name: "Sarah Connor", email: "sarah@tmcp.io", role: "Admin", status: "active", joined_at: "2026-05-05T09:00:00Z" },
  { id: "usr-3", name: "Alex Mercer", email: "alex@tmcp.io", role: "Developer", status: "active", joined_at: "2026-05-10T14:30:00Z" },
  { id: "usr-4", name: "Dave Bowman", email: "dave@tmcp.io", role: "Operator", status: "active", joined_at: "2026-05-12T10:15:00Z" },
  { id: "usr-5", name: "John Doe", email: "john@tmcp.io", role: "Viewer", status: "active", joined_at: "2026-05-20T11:00:00Z" }
];

const DEFAULT_ROLE_PERMISSIONS = {
  Owner: ["tools.view", "tools.add", "tools.edit", "tools.delete", "tools.connect_account", "tools.disconnect_account", "agents.view", "agents.create", "agents.edit", "agents.delete", "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate", "users.view", "users.invite", "users.remove", "users.change_role", "logs.view", "logs.export", "approvals.view", "approvals.approve", "approvals.reject", "settings.view", "settings.edit"],
  Admin: ["tools.view", "tools.add", "tools.edit", "tools.connect_account", "tools.disconnect_account", "agents.view", "agents.create", "agents.edit", "agents.delete", "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate", "users.view", "users.invite", "logs.view", "approvals.view", "approvals.approve", "approvals.reject", "settings.view", "settings.edit"],
  Developer: ["tools.view", "tools.add", "tools.edit", "agents.view", "agents.create", "agents.edit", "api_keys.view", "api_keys.create", "logs.view"],
  Operator: ["tools.view", "agents.view", "api_keys.view", "logs.view", "approvals.view", "approvals.approve", "approvals.reject"],
  Viewer: ["tools.view", "agents.view", "api_keys.view", "logs.view"]
};

export function MockStoreProvider({ children }) {
  const [useLiveDb] = useState(() => isSupabaseConfigured());
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([{ id: "ws-1", name: "TMCP Default Workspace", owner_id: "usr-1" }]);
  const [currentWorkspace, setCurrentWorkspace] = useState("ws-1");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [tools, setTools] = useState(INITIAL_BUILTIN_TOOLS);
  const [features, setFeatures] = useState(INITIAL_FEATURES);
  const [toolAccounts, setToolAccounts] = useState(INITIAL_ACCOUNTS);
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [apiKeys, setApiKeys] = useState(INITIAL_KEYS);
  const [permissions, setPermissions] = useState([]);
  const [approvals, setApprovals] = useState([
    {
      id: "appr-1",
      agent_id: "agent-2",
      tool_id: "tool-gmail",
      tool_account_id: "acc-g-2",
      feature_key: "gmail.send",
      input: { to: "partner@global.com", subject: "Inquiry on Q3 Integration", body: "Hello, we wanted to request..." },
      status: "pending",
      created_at: "2026-06-06T06:12:00Z"
    }
  ]);
  const [logs, setLogs] = useState([]);

  const fetchLiveDatabaseData = async (sessionUser) => {
    try {
      // Find requested workspace ID from cookie
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      
      let requestedWsId = getCookie("tmcp_workspace_id");

      // 1. Get ALL workspace memberships
      const { data: members } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", sessionUser.id);

      // 2. Get ALL owned workspaces
      const { data: ownedWorkspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_user_id", sessionUser.id);

      let wsId = null;
      let userRole = "Owner";
      let allWorkspaceIds = new Set();
      let workspaceRoleMap = {};

      if (members) {
        members.forEach(m => {
          allWorkspaceIds.add(m.workspace_id);
          workspaceRoleMap[m.workspace_id] = m.role;
        });
      }
      if (ownedWorkspaces) {
        ownedWorkspaces.forEach(w => {
          allWorkspaceIds.add(w.id);
          workspaceRoleMap[w.id] = "Owner";
        });
      }

      if (allWorkspaceIds.size > 0) {
        // If they requested a specific one and they have access, use it
        if (requestedWsId && allWorkspaceIds.has(requestedWsId)) {
          wsId = requestedWsId;
        } else {
          // Otherwise, pick the first one
          wsId = Array.from(allWorkspaceIds)[0];
        }
        userRole = workspaceRoleMap[wsId];
      }

      if (!wsId) {
        // Create workspace for user if none exists
        const userName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || "User";
        const workspaceName = `${userName}'s Workspace`;

        const { data: newWs, error: wsCreateErr } = await supabase
          .from("workspaces")
          .insert({ name: workspaceName, owner_user_id: sessionUser.id })
          .select()
          .single();

        if (wsCreateErr || !newWs) {
          // Race condition: workspace was created by another request, fetch it
          const { data: existingWs } = await supabase
            .from("workspaces")
            .select("id")
            .eq("owner_user_id", sessionUser.id)
            .limit(1)
            .maybeSingle();
          if (existingWs) {
            wsId = existingWs.id;
          }
        } else {
          wsId = newWs.id;
        }

        if (wsId) {
          await supabase.from("workspace_members").upsert({
            workspace_id: wsId,
            user_id: sessionUser.id,
            role: "Owner",
            status: "active"
          }, { onConflict: "workspace_id,user_id" });

          allWorkspaceIds.add(wsId);
          workspaceRoleMap[wsId] = "Owner";
        }
        userRole = "Owner";
      }

      setCurrentWorkspace(wsId);
      
      const dbUser = {
        id: sessionUser.id,
        name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email.split("@")[0],
        email: sessionUser.email,
        role: userRole,
        status: "active"
      };
      setUser(dbUser);

      // Fetch Workspaces — deduplicated by ID
      if (allWorkspaceIds.size > 0) {
        const { data: wsData } = await supabase
          .from("workspaces")
          .select("*")
          .in("id", Array.from(allWorkspaceIds));
        if (wsData) {
          // Deduplicate by id to prevent showing same workspace twice
          const seen = new Set();
          const uniqueWs = wsData.filter(w => {
            if (seen.has(w.id)) return false;
            seen.add(w.id);
            return true;
          });
          setWorkspaces(uniqueWs);
        }
      }

      // Fetch users / workspace members
      let { data: wsMembers } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", wsId);

      // Ensure the logged-in user has a workspace_members record
      const hasUserMember = wsMembers && wsMembers.some(m => m.user_id === sessionUser.id);
      if (!hasUserMember && wsId) {
        await supabase.from("workspace_members").insert({
          workspace_id: wsId,
          user_id: sessionUser.id,
          role: userRole || "Owner",
          status: "active"
        });
        // Re-fetch members list
        const { data: refetchedMembers } = await supabase
          .from("workspace_members")
          .select("*")
          .eq("workspace_id", wsId);
        if (refetchedMembers) wsMembers = refetchedMembers;
      }

      // Fetch invitations
      const { data: wsInvites } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", wsId);

      // Resolve member identities server-side (auth.users is not readable from the browser);
      // fall back to id-only rows if the endpoint is unavailable.
      let membersList = wsMembers ? wsMembers.map(m => ({
        id: m.user_id,
        name: m.user_id === sessionUser.id ? dbUser.name : "Team Member",
        email: m.user_id === sessionUser.id ? dbUser.email : "…",
        role: m.role,
        status: m.status,
        joined_at: m.created_at
      })) : [];
      try {
        const res = await fetch("/api/users/list", { headers: { "x-workspace-id": wsId } });
        const body = await res.json();
        if (body.success && Array.isArray(body.members)) membersList = body.members;
      } catch {}

      // Only still-pending invitations belong in the list — accepted ones are members now.
      const invitesList = wsInvites ? wsInvites.filter(i => i.status === "pending").map(i => ({
        id: i.id,
        name: i.email.split("@")[0],
        email: i.email,
        role: i.role,
        status: "pending",
        joined_at: i.created_at
      })) : [];

      setUsers([...membersList, ...invitesList]);

      // Fetch Tools
      const { data: dbTools } = await supabase.from("tools").select("*").eq("workspace_id", wsId);
      const dbSlugs = new Set((dbTools || []).map(t => t.slug));
      const filteredBuiltIns = INITIAL_BUILTIN_TOOLS.filter(t => !dbSlugs.has(t.slug))
                                                   .map(t => ({ ...t, workspace_id: wsId }));
      setTools([...filteredBuiltIns, ...(dbTools || [])]);

      // Fetch Tool Features
      const { data: dbFeatures } = await supabase.from("tool_features").select("*");
      const keptBuiltInIds = new Set(filteredBuiltIns.map(t => t.id));
      const filteredBuiltInFeatures = INITIAL_FEATURES.filter(f => keptBuiltInIds.has(f.tool_id));
      setFeatures([...filteredBuiltInFeatures, ...(dbFeatures || [])]);

      // Fetch Tool Accounts
      const { data: dbAccounts } = await supabase.from("tool_accounts").select("*").eq("workspace_id", wsId);
      setToolAccounts(dbAccounts || []);

      // Fetch Agents
      const { data: dbAgents } = await supabase.from("agents").select("*").eq("workspace_id", wsId);
      setAgents(dbAgents || []);

      // Fetch API Keys
      const { data: dbKeys } = await supabase.from("api_keys").select("*").eq("workspace_id", wsId);
      setApiKeys(dbKeys || []);

      // Fetch Permissions Matrix
      const { data: dbPerms } = await supabase.from("agent_tool_permissions").select("*").eq("workspace_id", wsId);
      setPermissions(dbPerms || []);

      // Fetch Logs
      const { data: dbLogs } = await supabase.from("tool_call_logs").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      setLogs(dbLogs || []);

      // Fetch Approvals
      const { data: dbApprovals } = await supabase.from("tool_approvals").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      setApprovals(dbApprovals || []);

    } catch (e) {
      console.error("Error loading live database tables:", e);
    }
  };

  // Sync data on mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchLiveDatabaseData(session.user);
        } else {
          // If no active DB session, check localStorage fallback
          const localUser = localStorage.getItem("tmcp_user");
          if (localUser) {
            setUser(JSON.parse(localUser));
          }
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchLiveDatabaseData(session.user);
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // LocalStorage Mock mode
      const savedUser = localStorage.getItem("tmcp_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
        const defaultUser = INITIAL_USERS[0];
        setUser(defaultUser);
        localStorage.setItem("tmcp_user", JSON.stringify(defaultUser));
      }

      const savedStore = localStorage.getItem("tmcp_store");
      if (savedStore) {
        const parsed = JSON.parse(savedStore);
        if (parsed.tools) setTools(parsed.tools);
        if (parsed.features) setFeatures(parsed.features);
        if (parsed.toolAccounts) setToolAccounts(parsed.toolAccounts);
        if (parsed.agents) setAgents(parsed.agents);
        if (parsed.apiKeys) setApiKeys(parsed.apiKeys);
        if (parsed.permissions) setPermissions(parsed.permissions);
        if (parsed.logs) setLogs(parsed.logs);
        if (parsed.approvals) setApprovals(parsed.approvals);
        if (parsed.users) setUsers(parsed.users);
      } else {
        const generatedPerms = [];
        INITIAL_AGENTS.forEach(agent => {
          INITIAL_ACCOUNTS.forEach(account => {
            INITIAL_FEATURES.filter(f => f.tool_id === account.tool_id).forEach(feature => {
              const isSendOrDelete = ["gmail.send", "drive.delete"].includes(feature.feature_key);
              generatedPerms.push({
                id: `${agent.id}-${account.id}-${feature.feature_key}`,
                agent_id: agent.id,
                tool_id: account.tool_id,
                tool_account_id: account.id,
                feature_key: feature.feature_key,
                allowed: isSendOrDelete ? false : true,
                daily_limit: isSendOrDelete ? 5 : 100,
                require_approval: isSendOrDelete ? true : false,
              });
            });
          });
        });
        setPermissions(generatedPerms);
      }
    }
  }, []);

  // Save store updates (Mock mode fallback)
  const saveState = (updatedState) => {
    if (useLiveDb) return;
    localStorage.setItem("tmcp_store", JSON.stringify({
      tools,
      features,
      toolAccounts,
      agents,
      apiKeys,
      permissions,
      logs,
      approvals,
      users,
      ...updatedState
    }));
  };

  const handleLogin = async (email, password) => {
    if (useLiveDb) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // If login fails, attempt auto-signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        return signUpData.user;
      }
      return data.user;
    }

    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setUser(existing);
      localStorage.setItem("tmcp_user", JSON.stringify(existing));
      return existing;
    } else {
      const newUser = {
        id: `usr-${Date.now()}`,
        name: email.split("@")[0],
        email: email,
        role: "Owner",
        status: "active",
        joined_at: new Date().toISOString()
      };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      setUser(newUser);
      localStorage.setItem("tmcp_user", JSON.stringify(newUser));
      saveState({ users: updatedUsers });
      return newUser;
    }
  };

  const handleLogout = async () => {
    if (useLiveDb) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem("tmcp_user");
  };

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    const allowedKeys = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return allowedKeys.includes(permissionKey);
  };

  const inviteUser = async (name, email, role) => {
    if (!hasPermission("users.invite")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      // Call the API route so Resend email is dispatched
      try {
        const res = await fetch("/api/users/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role })
        });
        const data = await res.json();
        if (!data.success) return { error: data.error || "Failed to send invite" };
        fetchLiveDatabaseData(user);
        return { success: true };
      } catch (err) {
        return { error: err.message || "Failed to send invite" };
      }
    }

    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role,
      status: "active",
      joined_at: new Date().toISOString()
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const changeUserRole = async (userId, newRole) => {
    if (!hasPermission("users.change_role")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { data: updatedMember } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("user_id", userId)
        .eq("workspace_id", currentWorkspace)
        .select();

      if (!updatedMember || updatedMember.length === 0) {
        await supabase
          .from("workspace_invitations")
          .update({ role: newRole })
          .eq("id", userId)
          .eq("workspace_id", currentWorkspace);
      }

      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const removeUser = async (userId) => {
    if (!hasPermission("users.remove")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { data: delMember } = await supabase
        .from("workspace_members")
        .delete()
        .eq("user_id", userId)
        .eq("workspace_id", currentWorkspace)
        .select();

      if (!delMember || delMember.length === 0) {
        await supabase
          .from("workspace_invitations")
          .delete()
          .eq("id", userId)
          .eq("workspace_id", currentWorkspace);
      }
      
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const addTool = async (toolData) => {
    if (!hasPermission("tools.add")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const res = await fetch("/api/tools/add", {
          method: "POST",
          headers,
          body: JSON.stringify(toolData)
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true, tool: data.tool };
      } catch (err) {
        return { error: err.message };
      }
    }

    const toolId = `tool-${Date.now()}`;
    const newTool = {
      id: toolId,
      ...toolData,
      is_enabled: true,
      created_at: new Date().toISOString()
    };
    const updatedTools = [...tools, newTool];
    setTools(updatedTools);

    const newFeaturesList = [];
    if (toolData.tool_type === "custom_mcp" && toolData.mcp_config?.features) {
      toolData.mcp_config.features.forEach(f => {
        newFeaturesList.push({
          id: `feat-${Date.now()}-${f.name}`,
          tool_id: toolId,
          feature_key: f.name,
          name: f.name.split(".").pop().replace(/_/g, " "),
          description: f.description || `Custom MCP action ${f.name}`,
          is_dangerous: false,
          requires_approval: false
        });
      });
    } else if (toolData.tool_type === "custom_rest") {
      newFeaturesList.push({
        id: `feat-${Date.now()}-${toolData.slug}`,
        tool_id: toolId,
        feature_key: `${toolData.slug}.call`,
        name: toolData.name,
        description: toolData.description || "Custom API call",
        is_dangerous: false,
        requires_approval: false
      });
    }

    const updatedFeatures = [...features, ...newFeaturesList];
    setFeatures(updatedFeatures);
    saveState({ tools: updatedTools, features: updatedFeatures });
    return { success: true, tool: newTool };
  };

  const updateTool = async (toolId, updates) => {
    if (!hasPermission("tools.add")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const res = await fetch("/api/tools/update", {
          method: "POST",
          headers,
          body: JSON.stringify({ toolId, updates })
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }

    const updatedTools = tools.map(t => t.id === toolId ? { ...t, ...updates } : t);
    setTools(updatedTools);
    saveState({ tools: updatedTools });
    return { success: true };
  };

  const deleteTool = async (toolId) => {
    if (!hasPermission("tools.add")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {};
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const res = await fetch(`/api/tools/${toolId}`, {
          method: "DELETE",
          headers
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }

    const updatedTools = tools.filter(t => t.id !== toolId);
    setTools(updatedTools);
    
    const updatedFeatures = features.filter(f => f.tool_id !== toolId);
    setFeatures(updatedFeatures);

    const updatedAccounts = toolAccounts.filter(a => a.tool_id !== toolId);
    setToolAccounts(updatedAccounts);

    const updatedPerms = permissions.filter(p => p.tool_id !== toolId);
    setPermissions(updatedPerms);

    saveState({ 
      tools: updatedTools, 
      features: updatedFeatures, 
      toolAccounts: updatedAccounts, 
      permissions: updatedPerms 
    });
    return { success: true };
  };

  const addToolAccount = async (toolId, label, credentials) => {
    if (!hasPermission("tools.connect_account")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const mappedCredentials = { ...credentials };
        if (credentials.key && !credentials.apiKey) {
          mappedCredentials.apiKey = credentials.key;
        }
        const res = await fetch("/api/tool-accounts/add", {
          method: "POST",
          headers,
          body: JSON.stringify({ toolId, label, credentials: mappedCredentials })
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }

    const accountId = `acc-${Date.now()}`;
    const newAccount = {
      id: accountId,
      tool_id: toolId,
      label,
      account_email: credentials.email || "custom-auth@gateway.local",
      status: "connected",
      auth_type: credentials.apiKey ? "api_key" : "oauth",
      created_at: new Date().toISOString()
    };

    const updatedAccounts = [...toolAccounts, newAccount];
    setToolAccounts(updatedAccounts);

    const newPerms = [...permissions];
    const toolFeats = features.filter(f => f.tool_id === toolId);
    agents.forEach(agent => {
      toolFeats.forEach(feat => {
        newPerms.push({
          id: `${agent.id}-${accountId}-${feat.feature_key}`,
          agent_id: agent.id,
          tool_id: toolId,
          tool_account_id: accountId,
          feature_key: feat.feature_key,
          allowed: true,
          daily_limit: 100,
          require_approval: false
        });
      });
    });
    setPermissions(newPerms);
    saveState({ toolAccounts: updatedAccounts, permissions: newPerms });
    return { success: true };
  };

  const disconnectToolAccount = async (accountId) => {
    if (!hasPermission("tools.disconnect_account")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = {};
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const res = await fetch(`/api/tool-accounts/${accountId}`, {
          method: "DELETE",
          headers
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }

    const updatedAccounts = toolAccounts.filter(a => a.id !== accountId);
    setToolAccounts(updatedAccounts);
    const updatedPerms = permissions.filter(p => p.tool_account_id !== accountId);
    setPermissions(updatedPerms);
    saveState({ toolAccounts: updatedAccounts, permissions: updatedPerms });
    return { success: true };
  };

  const createAgent = async (name, description) => {
    if (!hasPermission("agents.create")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { data, error } = await supabase
        .from("agents")
        .insert({ workspace_id: currentWorkspace, name, description, user_id: user.id })
        .select()
        .single();
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true, agent: data };
    }

    const agentId = `agent-${Date.now()}`;
    const newAgent = {
      id: agentId,
      name,
      description,
      status: "active",
      created_at: new Date().toISOString()
    };

    const updatedAgents = [...agents, newAgent];
    setAgents(updatedAgents);

    const newPerms = [...permissions];
    toolAccounts.forEach(account => {
      features.filter(f => f.tool_id === account.tool_id).forEach(feat => {
        newPerms.push({
          id: `${agentId}-${account.id}-${feat.feature_key}`,
          agent_id: agentId,
          tool_id: account.tool_id,
          tool_account_id: account.id,
          feature_key: feat.feature_key,
          allowed: true,
          daily_limit: 100,
          require_approval: false
        });
      });
    });
    setPermissions(newPerms);
    saveState({ agents: updatedAgents, permissions: newPerms });
    return { success: true, agent: newAgent };
  };

  const updateAgent = async (agentId, data) => {
    if (!hasPermission("agents.edit")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { error } = await supabase.from("agents").update(data).eq("id", agentId);
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updated = agents.map(a => a.id === agentId ? { ...a, ...data } : a);
    setAgents(updated);
    saveState({ agents: updated });
    return { success: true };
  };

  const deleteAgent = async (agentId) => {
    if (!hasPermission("agents.delete")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { error } = await supabase.from("agents").delete().eq("id", agentId);
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updatedAgents = agents.filter(a => a.id !== agentId);
    setAgents(updatedAgents);
    const updatedPerms = permissions.filter(p => p.agent_id !== agentId);
    setPermissions(updatedPerms);
    const updatedKeys = apiKeys.filter(k => k.agent_id !== agentId);
    setApiKeys(updatedKeys);
    saveState({ agents: updatedAgents, permissions: updatedPerms, apiKeys: updatedKeys });
    return { success: true };
  };

  const generateApiKey = async (agentId, name, expiryDays) => {
    if (!hasPermission("api_keys.create")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const res = await fetch("/api/api-keys/create", {
          method: "POST",
          headers,
          body: JSON.stringify({ agentId, name, expiryDays })
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true, rawKey: data.rawKey, key: data.key };
      } catch (err) {
        return { error: err.message };
      }
    }

    const rawSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const rawKey = `mcp_live_${rawSuffix}`;
    const prefix = rawKey.slice(0, 16);
    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const newKey = {
      id: `key-${Date.now()}`,
      agent_id: agentId,
      name,
      key_prefix: prefix,
      status: "active",
      last_used_at: null,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    saveState({ apiKeys: updated });
    return { success: true, rawKey, key: newKey };
  };

  const revokeApiKey = async (keyId) => {
    if (!hasPermission("api_keys.revoke")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const res = await fetch("/api/api-keys/revoke", {
          method: "POST",
          headers,
          body: JSON.stringify({ keyId })
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true };
      } catch (err) {
        return { error: err.message };
      }
    }

    const updated = apiKeys.map(k => k.id === keyId ? { ...k, status: "revoked" } : k);
    setApiKeys(updated);
    saveState({ apiKeys: updated });
    return { success: true };
  };

  const rotateApiKey = async (keyId) => {
    if (!hasPermission("api_keys.rotate")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        if (currentWorkspace) headers["x-workspace-id"] = currentWorkspace;

        const res = await fetch("/api/api-keys/rotate", {
          method: "POST",
          headers,
          body: JSON.stringify({ keyId })
        });
        const data = await res.json();
        if (!data.success) return { error: data.error };
        fetchLiveDatabaseData(user);
        return { success: true, rawKey: data.rawKey };
      } catch (err) {
        return { error: err.message };
      }
    }

    const oldKey = apiKeys.find(k => k.id === keyId);
    if (!oldKey) return { error: "Key not found" };

    const rawSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const rawKey = `mcp_live_${rawSuffix}`;
    const prefix = rawKey.slice(0, 16);

    const updated = apiKeys.map(k => k.id === keyId ? {
      ...k,
      key_prefix: prefix,
      last_used_at: null,
      created_at: new Date().toISOString()
    } : k);

    setApiKeys(updated);
    saveState({ apiKeys: updated });
    return { success: true, rawKey };
  };

  const updatePermission = async (agentId, accountId, featureKey, field, value) => {
    if (useLiveDb) {
      // Optimistically update local state so checkbox toggles immediately
      const matchIdx = permissions.findIndex(
        (p) =>
          p.agent_id === agentId &&
          p.tool_account_id === accountId &&
          p.feature_key === featureKey
      );

      let optimisticPerms;
      if (matchIdx >= 0) {
        optimisticPerms = permissions.map((p, i) =>
          i === matchIdx ? { ...p, [field]: value } : p
        );
      } else {
        const account = toolAccounts.find((a) => a.id === accountId);
        optimisticPerms = [
          ...permissions,
          {
            id: `temp-${Date.now()}`,
            agent_id: agentId,
            tool_id: account?.tool_id,
            tool_account_id: accountId,
            feature_key: featureKey,
            allowed: field === "allowed" ? value : false,
            daily_limit: field === "daily_limit" ? parseInt(value) || 100 : 100,
            require_approval: field === "require_approval" ? value : false,
          },
        ];
      }
      setPermissions(optimisticPerms);

      try {
        // Get session token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        if (currentWorkspace) {
          headers["x-workspace-id"] = currentWorkspace;
        }

        const res = await fetch("/api/permissions", {
          method: "POST",
          headers,
          body: JSON.stringify({ agentId, accountId, featureKey, field, value }),
        });
        const data = await res.json();
        if (!data.success) {
          console.error("Permission update failed:", data.error);
          // Revert on failure
          setPermissions(permissions);
        }
      } catch (err) {
        console.error("Permission update fetch error:", err);
        // Revert on error
        setPermissions(permissions);
      }
      return;
    }


    const permId = `${agentId}-${accountId}-${featureKey}`;
    let exists = permissions.find(p => p.id === permId);

    let updatedPerms;
    if (exists) {
      updatedPerms = permissions.map(p => p.id === permId ? { ...p, [field]: value } : p);
    } else {
      const account = toolAccounts.find(a => a.id === accountId);
      updatedPerms = [...permissions, {
        id: permId,
        agent_id: agentId,
        tool_id: account?.tool_id,
        tool_account_id: accountId,
        feature_key: featureKey,
        allowed: field === "allowed" ? value : true,
        daily_limit: field === "daily_limit" ? parseInt(value) || 100 : 100,
        require_approval: field === "require_approval" ? value : false
      }];
    }

    setPermissions(updatedPerms);
    saveState({ permissions: updatedPerms });
  };

  const approveRequest = async (approvalId, userId) => {
    if (!hasPermission("approvals.approve")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      // Route through the decide endpoint so the approved call actually executes and the
      // outcome is stored for the requesting agent to retrieve.
      try {
        const res = await fetch(`/api/approvals/${approvalId}/decide`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "approve" })
        });
        const body = await res.json();
        if (!res.ok || !body.success) return { error: body.error || "Failed to approve request" };
      } catch (err) {
        return { error: err.message || "Failed to approve request" };
      }
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) return { error: "Request not found" };

    const updatedApprovals = approvals.map(a => a.id === approvalId ? {
      ...a,
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString()
    } : a);

    const agent = agents.find(a => a.id === approval.agent_id);
    const tool = tools.find(t => t.id === approval.tool_id);
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent_name: agent?.name || "System Agent",
      agent_id: approval.agent_id,
      tool_name: tool?.name || "External Tool",
      feature_key: approval.feature_key,
      input: approval.input,
      output: { success: true, action: "Approved and executed dangerous call" },
      status: "SUCCESS",
      latency_ms: 1200
    };

    const updatedLogs = [newLog, ...logs];
    setApprovals(updatedApprovals);
    setLogs(updatedLogs);
    saveState({ approvals: updatedApprovals, logs: updatedLogs });
    return { success: true };
  };

  const rejectRequest = async (approvalId, userId) => {
    if (!hasPermission("approvals.reject")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      try {
        const res = await fetch(`/api/approvals/${approvalId}/decide`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "reject" })
        });
        const body = await res.json();
        if (!res.ok || !body.success) return { error: body.error || "Failed to reject request" };
      } catch (err) {
        return { error: err.message || "Failed to reject request" };
      }
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) return { error: "Request not found" };

    const updatedApprovals = approvals.map(a => a.id === approvalId ? {
      ...a,
      status: "rejected",
      approved_by: userId,
      rejected_at: new Date().toISOString()
    } : a);

    const agent = agents.find(a => a.id === approval.agent_id);
    const tool = tools.find(t => t.id === approval.tool_id);
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent_name: agent?.name || "System Agent",
      agent_id: approval.agent_id,
      tool_name: tool?.name || "External Tool",
      feature_key: approval.feature_key,
      input: approval.input,
      output: null,
      status: "DENIED",
      error: "Dangerous tool request was rejected by admin.",
      latency_ms: 60
    };

    const updatedLogs = [newLog, ...logs];
    setApprovals(updatedApprovals);
    setLogs(updatedLogs);
    saveState({ approvals: updatedApprovals, logs: updatedLogs });
    return { success: true };
  };

  const simulateToolCall = async (agentId, accountId, featureKey, customInput = {}) => {
    const agent = agents.find(a => a.id === agentId);
    const account = toolAccounts.find(a => a.id === accountId);
    const tool = tools.find(t => t.id === account?.tool_id);
    const feature = features.find(f => f.feature_key === featureKey);

    if (!agent || !account || !tool || !feature) {
      return { error: "Invalid parameters for simulation" };
    }

    const perm = permissions.find(p => p.agent_id === agentId && p.tool_account_id === accountId && p.feature_key === featureKey);
    const isAllowed = perm ? perm.allowed : true;
    const requiresApproval = perm ? perm.require_approval : feature.requires_approval;

    if (isAllowed && requiresApproval) {
      if (useLiveDb) {
        await supabase.from("tool_approvals").insert({
          workspace_id: currentWorkspace,
          agent_id: agentId,
          tool_id: tool.id,
          tool_account_id: accountId,
          feature_key: featureKey,
          input: customInput,
          status: "pending"
        });
        fetchLiveDatabaseData(user);
        return { status: "pending", message: "Action queued. Dangerous tool call requires approval." };
      }

      const newApproval = {
        id: `appr-${Date.now()}`,
        agent_id: agentId,
        tool_id: tool.id,
        tool_account_id: accountId,
        feature_key: featureKey,
        input: customInput,
        status: "pending",
        created_at: new Date().toISOString()
      };
      const updatedApprovals = [newApproval, ...approvals];
      setApprovals(updatedApprovals);
      saveState({ approvals: updatedApprovals });
      return { status: "pending", message: "Action queued. Dangerous tool call requires approval." };
    }

    const isSuccess = isAllowed && agent.status === "active";
    const statusVal = isSuccess ? "SUCCESS" : (agent.status !== "active" ? "FAILED" : "DENIED");
    const errorVal = isSuccess ? null : (agent.status !== "active" ? "Agent is disabled" : "Access denied by permission matrix");

    if (useLiveDb) {
      // Find active key prefix to simulate
      const agentKey = apiKeys.find(k => k.agent_id === agentId && k.status === "active");
      
      const { data: logRes, error: logErr } = await supabase.from("tool_call_logs").insert({
        workspace_id: currentWorkspace,
        agent_id: agentId,
        api_key_id: agentKey?.id,
        tool_id: tool.id,
        tool_account_id: accountId,
        tool_name: tool.name,
        feature_key: featureKey,
        input: customInput,
        output: isSuccess ? { success: true, feature_key: featureKey, mode: "local-audit-preview" } : null,
        status: statusVal,
        error: errorVal,
        latency_ms: Math.floor(Math.random() * 400) + 50
      }).select().single();

      if (logErr) return { error: logErr.message };
      fetchLiveDatabaseData(user);
      return { status: statusVal, error: errorVal, log: logRes };
    }

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent_name: agent.name,
      agent_id: agentId,
      tool_name: tool.name,
      feature_key: featureKey,
      input: customInput,
      output: isSuccess ? { success: true, feature_key: featureKey, mode: "local-audit-preview" } : null,
      status: statusVal,
      error: errorVal,
      latency_ms: Math.floor(Math.random() * 400) + 50
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    const agentKey = apiKeys.find(k => k.agent_id === agentId && k.status === "active");
    if (agentKey) {
      const updatedKeys = apiKeys.map(k => k.id === agentKey.id ? { ...k, last_used_at: new Date().toISOString() } : k);
      setApiKeys(updatedKeys);
      saveState({ logs: updatedLogs, apiKeys: updatedKeys });
    } else {
      saveState({ logs: updatedLogs });
    }

    return { status: statusVal, error: errorVal, log: newLog };
  };

  const getWorkspaceStats = () => {
    const activeKeyCount = apiKeys.filter(k => k.status === "active").length;
    const pendingCount = approvals.filter(a => a.status === "pending").length;
    const failedLogs = logs.filter(l => ["FAILED", "DENIED"].includes(l.status));
    const failedCallsPercentage = logs.length > 0
      ? `${((failedLogs.length / logs.length) * 100).toFixed(1)}%`
      : "0%";

    return {
      totalTools: tools.length,
      connectedAccounts: toolAccounts.length,
      activeAgents: agents.filter(a => a.status === "active").length,
      apiKeysCount: activeKeyCount,
      failedCallsCount: failedLogs.length,
      failedCallsPercentage,
      totalCalls: logs.length,
      pendingApprovals: pendingCount,
      recentLogs: logs.slice(0, 10)
    };
  };

  const switchWorkspace = async (workspaceId) => {
    // Set cookie that expires in 30 days
    document.cookie = `tmcp_workspace_id=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}`;
    setCurrentWorkspace(workspaceId);
    if (useLiveDb) {
      // Re-fetch from Supabase to get the real auth user object
      const { supabase } = await import("@/lib/supabase/client");
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (sessionUser) {
        await fetchLiveDatabaseData(sessionUser);
      } else {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <MockStoreContext.Provider
      value={{
        useLiveDb,
        user,
        workspaces,
        currentWorkspace,
        users,
        tools,
        features,
        toolAccounts,
        agents,
        apiKeys,
        permissions,
        logs,
        approvals,
        hasPermission,
        handleLogin,
        handleLogout,
        inviteUser,
        changeUserRole,
        removeUser,
        addTool,
        updateTool,
        deleteTool,
        addToolAccount,
        disconnectToolAccount,
        createAgent,
        updateAgent,
        deleteAgent,
        generateApiKey,
        revokeApiKey,
        rotateApiKey,
        updatePermission,
        approveRequest,
        rejectRequest,
        simulateToolCall,
        getWorkspaceStats,
        switchWorkspace
      }}
    >
      {children}
    </MockStoreContext.Provider>
  );
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) {
    throw new Error("useMockStore must be used within a MockStoreProvider");
  }
  return context;
}
