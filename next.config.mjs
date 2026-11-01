/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "10mb" } }, // upload del regolamento in PDF
};
export default nextConfig;
