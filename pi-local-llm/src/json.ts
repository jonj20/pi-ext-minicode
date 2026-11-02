export function stripJsonComments(input: string): string {
	let result = "";
	let inString = false;
	let inLineComment = false;
	let inBlockComment = false;
	let escaped = false;

	for (let i = 0; i < input.length; i++) {
		const char = input[i];
		const next = input[i + 1];

		if (inLineComment) {
			if (char === "\n") {
				inLineComment = false;
				result += char;
			}
			continue;
		}

		if (inBlockComment) {
			if (char === "*" && next === "/") {
				inBlockComment = false;
				i++;
			}
			continue;
		}

		if (inString) {
			result += char;
			if (escaped) {
				escaped = false;
			} else if (char === "\\") {
				escaped = true;
			} else if (char === '"') {
				inString = false;
			}
			continue;
		}

		if (char === '"') {
			inString = true;
			result += char;
			continue;
		}

		if (char === "/" && next === "/") {
			inLineComment = true;
			i++;
			continue;
		}

		if (char === "/" && next === "*") {
			inBlockComment = true;
			i++;
			continue;
		}

		result += char;
	}

	return result;
}
