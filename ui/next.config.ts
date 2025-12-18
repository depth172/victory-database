import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "dxi4wb638ujep.cloudfront.net",
				port: "",
				pathname: "/**",
			},
		],
	},
  reactCompiler: true,
};

export default nextConfig;
