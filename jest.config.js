module.exports = {
	moduleFileExtensions: ["js", "json", "ts"],
	rootDir: ".", // Changed from 'src' to '.' (project root)
	testRegex: "src/.*\\.spec\\.ts$", // Adjusted to look within src directory
	transform: {
		"^.+\\.(t|j)s$": "ts-jest", // This should now resolve correctly from project root node_modules
	},
	collectCoverageFrom: ["src/**/*.(t|j)s"], // Adjusted to collect from src
	coverageDirectory: "./coverage", // Relative to project root
	testEnvironment: "node",
	moduleNameMapper: {
		// This mapping means imports starting with 'src/' in tests will resolve to '<rootDir>/src/'
		// '<rootDir>' is now the project root.
		"^src/(.*)$": "<rootDir>/src/$1",
		// Add other aliases if they are confirmed to be used in tsconfig.json and src code
		// e.g., "^@domain/(.*)$": "<rootDir>/src/domain/$1"
	},
	// This path should point to 'src/test/setup.ts' from the project root
	setupFiles: ["<rootDir>/src/test/setup.ts"],
};
