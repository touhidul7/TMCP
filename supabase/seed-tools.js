const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://fuhuaanavqlgplraruon.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHVhYW5hdnFsZ3BscmFydW9uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY4ODEyOSwiZXhwIjoyMDk2MjY0MTI5fQ.7TpwVjqOiPWdAsygUwX8tFaFXnsl0Hx8yTwuWuwBlEg',
  { auth: { persistSession: false } }
);

const BUILT_IN_TOOLS = [
  {
    name: 'Gmail',
    slug: 'gmail',
    provider: 'google',
    description: 'Send and read Gmail emails on behalf of connected accounts',
    category: 'communication',
    tool_type: 'built_in',
    official_website_url: 'https://gmail.com',
    icon_url: 'https://www.google.com/gmail/about/static-2.0/images/logo-gmail.png',
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
    features: [
      {
        feature_key: 'gmail.send_email',
        name: 'Send Email',
        description: 'Compose and send an email from the connected Gmail account',
        input_schema: {
          type: 'object',
          required: ['to', 'subject', 'body'],
          properties: {
            to: { type: 'string', description: 'Recipient email address' },
            subject: { type: 'string', description: 'Email subject line' },
            body: { type: 'string', description: 'Email body content (plain text or HTML)' },
            cc: { type: 'string', description: 'CC email addresses (comma-separated)' },
            bcc: { type: 'string', description: 'BCC email addresses (comma-separated)' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'gmail.read_inbox',
        name: 'Read Inbox',
        description: 'List recent emails from the inbox',
        input_schema: {
          type: 'object',
          properties: {
            max_results: { type: 'number', description: 'Number of emails to fetch (default 10)' },
            query: { type: 'string', description: 'Gmail search query filter' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'gmail.get_email',
        name: 'Get Email',
        description: 'Get the full content of a specific email by ID',
        input_schema: {
          type: 'object',
          required: ['message_id'],
          properties: {
            message_id: { type: 'string', description: 'Gmail message ID' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'gmail.delete_email',
        name: 'Delete Email',
        description: 'Permanently delete an email by ID',
        input_schema: {
          type: 'object',
          required: ['message_id'],
          properties: {
            message_id: { type: 'string', description: 'Gmail message ID to delete' },
          }
        },
        is_dangerous: true,
        requires_approval: true,
        is_enabled: true,
      },
    ]
  },
  {
    name: 'Google Drive',
    slug: 'google-drive',
    provider: 'google',
    description: 'Read, write, and manage files in Google Drive',
    category: 'storage',
    tool_type: 'built_in',
    official_website_url: 'https://drive.google.com',
    icon_url: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png',
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
    features: [
      {
        feature_key: 'drive.list_files',
        name: 'List Files',
        description: 'List files and folders in Google Drive',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (Google Drive query syntax)' },
            max_results: { type: 'number', description: 'Max files to return (default 20)' },
            folder_id: { type: 'string', description: 'Parent folder ID to search in' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'drive.read_file',
        name: 'Read File',
        description: 'Read the content of a file from Google Drive',
        input_schema: {
          type: 'object',
          required: ['file_id'],
          properties: {
            file_id: { type: 'string', description: 'Google Drive file ID' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'drive.create_file',
        name: 'Create File',
        description: 'Create a new file or document in Google Drive',
        input_schema: {
          type: 'object',
          required: ['name', 'content'],
          properties: {
            name: { type: 'string', description: 'File name' },
            content: { type: 'string', description: 'File content' },
            mime_type: { type: 'string', description: 'MIME type (e.g. text/plain, application/json)' },
            folder_id: { type: 'string', description: 'Parent folder ID' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'drive.delete_file',
        name: 'Delete File',
        description: 'Permanently delete a file from Google Drive',
        input_schema: {
          type: 'object',
          required: ['file_id'],
          properties: {
            file_id: { type: 'string', description: 'Google Drive file ID to delete' },
          }
        },
        is_dangerous: true,
        requires_approval: true,
        is_enabled: true,
      },
    ]
  },
  {
    name: 'Hunter.io',
    slug: 'hunter-io',
    provider: 'hunter',
    description: 'Find and verify professional email addresses',
    category: 'prospecting',
    tool_type: 'built_in',
    official_website_url: 'https://hunter.io',
    icon_url: 'https://hunter.io/assets/hunter-logo-1c9e7a6e.svg',
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
    features: [
      {
        feature_key: 'hunter.domain_search',
        name: 'Domain Search',
        description: 'Find all email addresses for a company domain',
        input_schema: {
          type: 'object',
          required: ['domain'],
          properties: {
            domain: { type: 'string', description: 'Company domain (e.g. stripe.com)' },
            limit: { type: 'number', description: 'Max results (default 10)' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'hunter.email_finder',
        name: 'Email Finder',
        description: 'Find the email address of a person by name and company',
        input_schema: {
          type: 'object',
          required: ['domain', 'first_name', 'last_name'],
          properties: {
            domain: { type: 'string', description: 'Company domain' },
            first_name: { type: 'string', description: 'First name' },
            last_name: { type: 'string', description: 'Last name' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
      {
        feature_key: 'hunter.email_verifier',
        name: 'Email Verifier',
        description: 'Verify the deliverability of an email address',
        input_schema: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', description: 'Email address to verify' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
    ]
  },
  {
    name: 'Consulti AI',
    slug: 'consulti',
    provider: 'consulti',
    description: 'Access Consulti AI consulting knowledge base and analysis tools',
    category: 'ai',
    tool_type: 'built_in',
    official_website_url: 'https://consulti.ai',
    icon_url: null,
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
    features: [
      {
        feature_key: 'consulti.analyze',
        name: 'Analyze',
        description: 'Analyze business data or text using Consulti AI',
        input_schema: {
          type: 'object',
          required: ['input'],
          properties: {
            input: { type: 'string', description: 'Text or data to analyze' },
            context: { type: 'string', description: 'Additional context for the analysis' },
          }
        },
        is_dangerous: false,
        requires_approval: false,
        is_enabled: true,
      },
    ]
  },
];

async function seed() {
  console.log('Seeding built-in tools...\n');

  // Check if already seeded
  const { data: existing } = await supabase.from('tools').select('slug').eq('is_public', true);
  const existingSlugs = new Set((existing || []).map(t => t.slug));

  for (const tool of BUILT_IN_TOOLS) {
    if (existingSlugs.has(tool.slug)) {
      console.log(`⏭  ${tool.name} already exists, skipping`);
      continue;
    }

    const { features, ...toolData } = tool;

    // Insert tool
    const { data: inserted, error: toolErr } = await supabase
      .from('tools')
      .insert({ ...toolData, owner_user_id: null, workspace_id: null })
      .select('id')
      .single();

    if (toolErr) {
      console.error(`✗ ${tool.name}:`, toolErr.message);
      continue;
    }

    // Insert features
    const featureRows = features.map(f => ({ ...f, tool_id: inserted.id }));
    const { error: featErr } = await supabase.from('tool_features').insert(featureRows);

    if (featErr) {
      console.error(`✗ ${tool.name} features:`, featErr.message);
    } else {
      console.log(`✓ ${tool.name} (${features.length} features)`);
    }
  }

  console.log('\nDone!');
}

seed().catch(console.error);
