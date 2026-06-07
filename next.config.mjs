/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "192.168.239.119",
    "100.116.177.98",
    "tmcp.vercel.app",
    "local.brittosoft.site",
  ],
  // ssh2 uses native Node.js crypto — must not be bundled by Turbopack
  serverExternalPackages: ["ssh2"],
};

export default nextConfig;
