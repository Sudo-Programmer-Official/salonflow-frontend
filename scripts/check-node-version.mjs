import process from "node:process";

const parseVersion = (value) => {
  const [major = "0", minor = "0", patch = "0"] = value.replace(/^v/, "").split(".");

  return {
    major: Number.parseInt(major, 10) || 0,
    minor: Number.parseInt(minor, 10) || 0,
    patch: Number.parseInt(patch, 10) || 0,
  };
};

const compareVersions = (left, right) => {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }

  return left.patch - right.patch;
};

const current = parseVersion(process.versions.node);
const minimumNode20 = parseVersion("20.19.0");
const minimumNode22 = parseVersion("22.12.0");

const isSupported =
  (current.major === 20 && compareVersions(current, minimumNode20) >= 0) ||
  (current.major === 22 && compareVersions(current, minimumNode22) >= 0) ||
  current.major > 22;

if (!isSupported) {
  console.error(
    [
      "Unsupported Node.js version for this repo.",
      `Current: ${process.versions.node}`,
      "Required: 20.19.0+ or 22.12.0+",
      "Vite 7 and @vitejs/plugin-vue 6 require that runtime floor.",
      "Run `nvm use` after installing the version from `.nvmrc`, or switch Node manually.",
    ].join("\n"),
  );

  process.exit(1);
}
