const { Client } = require("ssh2");
const { decryptText } = require("../crypto/decrypt");

/**
 * Run a command over an established SSH connection.
 * Returns { stdout, stderr, exitCode }.
 */
function sshExec(conn, command, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      conn.end();
      reject(new Error(`SSH command timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    conn.exec(command, (err, stream) => {
      if (err) {
        clearTimeout(timer);
        return reject(err);
      }

      let stdout = "";
      let stderr = "";

      stream.on("close", (code) => {
        clearTimeout(timer);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code });
      });

      stream.on("data", (data) => { stdout += data; });
      stream.stderr.on("data", (data) => { stderr += data; });
    });
  });
}

/**
 * Build SSH connect config from stored credentials + metadata.
 * metadata  → non-sensitive fields (host, port, username, etc.) stored in connection_metadata
 * creds     → encrypted fields from tool_account_credentials
 */
function buildConnectConfig(metadata, credentialRecord) {
  const host = String(
    metadata?.host ||
    metadata?.hostname ||
    metadata?.server ||
    metadata?.ip ||
    ""
  ).trim();
  const username = String(
    metadata?.username ||
    metadata?.user ||
    metadata?.login ||
    ""
  ).trim();
  const portValue = metadata?.port || metadata?.ssh_port || metadata?.sshPort || "22";
  const port = Number.parseInt(String(portValue), 10);

  if (!host || !username) {
    throw new Error("SSH account is missing host or username. Please reconnect the account.");
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid SSH port '${portValue}'. Please set a port between 1 and 65535.`);
  }

  const authMethod = String(metadata?.auth_method || metadata?.authMethod || "Password").toLowerCase();
  const connTimeoutSeconds = Number.parseInt(String(metadata?.connection_timeout || metadata?.connectionTimeout || "30"), 10);
  const connTimeout = (Number.isInteger(connTimeoutSeconds) && connTimeoutSeconds > 0 ? connTimeoutSeconds : 30) * 1000;

  const config = {
    host,
    port,
    username,
    readyTimeout: connTimeout,
    keepaliveInterval: 10000,
    keepaliveCountMax: 3,
  };

  if (authMethod.includes("private") || authMethod.includes("key")) {
    const privateKey = credentialRecord?.encrypted_private_key
      ? decryptText(credentialRecord.encrypted_private_key)
      : null;

    if (!privateKey) {
      throw new Error("Private key is missing. Please reconnect the SSH account.");
    }

    if (/^PuTTY-User-Key-File-/m.test(privateKey.trim())) {
      throw new Error("PuTTY .ppk private keys are not supported by this SSH runtime. Export/convert the key to OpenSSH private key format, then reconnect the SSH account.");
    }

    config.privateKey = privateKey;

    if (credentialRecord?.encrypted_private_key_passphrase) {
      config.passphrase = decryptText(credentialRecord.encrypted_private_key_passphrase);
    }
  } else {
    // Password auth
    const password = credentialRecord?.encrypted_password
      ? decryptText(credentialRecord.encrypted_password)
      : null;

    if (!password) {
      throw new Error("SSH password is missing. Please reconnect the SSH account.");
    }

    config.password = password;
  }

  return config;
}

/**
 * Open an SSH connection, run the callback, then close.
 */
function withSshConnection(connectConfig, fn) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      try { conn.end(); } catch (_) {}
      reject(err);
    };

    conn.on("ready", async () => {
      if (settled) return;
      try {
        const result = await fn(conn);
        settled = true;
        conn.end();
        resolve(result);
      } catch (err) {
        fail(err);
      }
    });

    conn.on("error", (err) => {
      fail(new Error(formatSshConnectionError(err, connectConfig)));
    });

    conn.on("end", () => {
      if (!settled) fail(new Error("SSH connection ended before it became ready."));
    });

    conn.on("close", () => {
      if (!settled) fail(new Error("SSH connection closed before it became ready."));
    });

    try {
      conn.connect(connectConfig);
    } catch (err) {
      fail(new Error(formatSshConnectionError(err, connectConfig)));
    }
  });
}

function formatSshConnectionError(err, connectConfig) {
  const message = err?.message || String(err);
  const target = `${connectConfig.host}:${connectConfig.port}`;

  if (err?.code === "ETIMEDOUT" || message.includes("Timed out") || message.includes("ETIMEDOUT")) {
    return `SSH connection error: connect ETIMEDOUT ${target}. This is a server/port/firewall issue, not a credential issue.`;
  }

  if (err?.code === "ECONNREFUSED" || message.includes("ECONNREFUSED")) {
    return `SSH connection error: connect ECONNREFUSED ${target}. SSH is not accepting connections on this host/port.`;
  }

  if (message.includes("All configured authentication methods failed")) {
    return "SSH authentication failed. Check username, password/private key, key passphrase, and that the public key is authorized on the server.";
  }

  if (message.includes("Encrypted private OpenSSH key detected, but no passphrase given")) {
    return "SSH authentication failed: encrypted private key needs its key passphrase. Add the private-key passphrase or use an unencrypted OpenSSH key.";
  }

  if (message.includes("Cannot parse privateKey")) {
    return `SSH private key error: ${message}. Use OpenSSH private key format, not PuTTY .ppk.`;
  }

  return `SSH connection error: ${message}`;
}

async function runSshTool({ featureKey, input, credentialRecord, connectionMetadata }) {
  const metadata = connectionMetadata || {};
  const cmdTimeout = parseInt(metadata?.command_timeout || "60", 10) * 1000;

  // Allowed / blocked command lists (comma-separated strings)
  const allowedCmds = metadata?.allowed_commands
    ? metadata.allowed_commands.split(",").map((c) => c.trim()).filter(Boolean)
    : [];
  const blockedCmds = metadata?.blocked_commands
    ? metadata.blocked_commands.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  const connectConfig = buildConnectConfig(metadata, credentialRecord);

  // ----------------------------------------------------------------
  // ssh.exec_command
  // ----------------------------------------------------------------
  if (featureKey === "ssh.exec_command") {
    const { command, working_dir } = input;

    if (!command || typeof command !== "string" || !command.trim()) {
      throw new Error("Missing required input: command");
    }

    const trimmedCmd = command.trim();

    // Security: check blocked commands
    if (blockedCmds.length > 0) {
      for (const blocked of blockedCmds) {
        if (trimmedCmd.startsWith(blocked) || trimmedCmd.includes(` ${blocked} `)) {
          throw new Error(`Command "${blocked}" is blocked by workspace policy.`);
        }
      }
    }

    // Security: check allowed commands (if list is set, command must match one)
    if (allowedCmds.length > 0) {
      const isAllowed = allowedCmds.some(
        (allowed) => trimmedCmd.startsWith(allowed) || trimmedCmd === allowed
      );
      if (!isAllowed) {
        throw new Error(`Command is not in the allowed-commands list set by this workspace.`);
      }
    }

    // Optionally prefix with sudo
    const useSudo = metadata?.use_sudo === true || metadata?.use_sudo === "true";
    const sudoPassword = useSudo && credentialRecord?.encrypted_sudo_password
      ? decryptText(credentialRecord.encrypted_sudo_password)
      : null;

    // Build the final command
    const workDir = working_dir || metadata?.default_working_dir;
    let finalCmd = workDir ? `cd ${workDir} && ${trimmedCmd}` : trimmedCmd;
    if (useSudo && sudoPassword) {
      finalCmd = `echo '${sudoPassword.replace(/'/g, "'\\''")}' | sudo -S sh -c '${finalCmd.replace(/'/g, "'\\''")}'`;
    } else if (useSudo) {
      finalCmd = `sudo sh -c '${finalCmd.replace(/'/g, "'\\''")}'`;
    }

    const result = await withSshConnection(connectConfig, (conn) =>
      sshExec(conn, finalCmd, cmdTimeout)
    );

    return {
      success: true,
      command: trimmedCmd,
      stdout: result.stdout,
      stderr: result.stderr,
      exit_code: result.exitCode,
      host: connectConfig.host,
    };
  }

  // ----------------------------------------------------------------
  // ssh.list_directory
  // ----------------------------------------------------------------
  if (featureKey === "ssh.list_directory") {
    const { path: dirPath = "." } = input;

    const result = await withSshConnection(connectConfig, (conn) =>
      sshExec(conn, `ls -la ${dirPath}`, cmdTimeout)
    );

    const lines = result.stdout.split("\n").filter(Boolean);

    return {
      success: true,
      path: dirPath,
      listing: lines,
      raw: result.stdout,
      host: connectConfig.host,
    };
  }

  // ----------------------------------------------------------------
  // ssh.upload_file — SCP via sftp subsystem
  // ----------------------------------------------------------------
  if (featureKey === "ssh.upload_file") {
    const { remote_path, content } = input;

    if (!remote_path || content === undefined) {
      throw new Error("Missing required inputs: remote_path, content");
    }

    await withSshConnection(connectConfig, (conn) => {
      return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);

          const writeStream = sftp.createWriteStream(remote_path);
          writeStream.on("close", resolve);
          writeStream.on("error", reject);
          writeStream.end(Buffer.from(content, "utf-8"));
        });
      });
    });

    return {
      success: true,
      remote_path,
      bytes_written: Buffer.byteLength(content, "utf-8"),
      host: connectConfig.host,
    };
  }

  throw new Error(`Unsupported SSH feature key: ${featureKey}`);
}

module.exports = { runSshTool };
