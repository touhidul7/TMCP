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
  const host     = metadata?.host     || "";
  const port     = parseInt(metadata?.port || "22", 10);
  const username = metadata?.username || "";

  if (!host || !username) {
    throw new Error("SSH account is missing host or username. Please reconnect the account.");
  }

  const authMethod = metadata?.auth_method || "Password";
  const connTimeout = parseInt(metadata?.connection_timeout || "30", 10) * 1000;

  const config = { host, port, username, readyTimeout: connTimeout };

  if (authMethod === "Private Key") {
    const privateKey = credentialRecord?.encrypted_private_key
      ? decryptText(credentialRecord.encrypted_private_key)
      : null;

    if (!privateKey) {
      throw new Error("Private key is missing. Please reconnect the SSH account.");
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

    conn.on("ready", async () => {
      try {
        const result = await fn(conn);
        conn.end();
        resolve(result);
      } catch (err) {
        conn.end();
        reject(err);
      }
    });

    conn.on("error", (err) => {
      reject(new Error(`SSH connection error: ${err.message}`));
    });

    conn.connect(connectConfig);
  });
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
