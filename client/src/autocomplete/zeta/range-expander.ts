import * as vscode from "vscode";
import { estimateTokensZeta } from "../context/ast";

export function expandRange(
	document: vscode.TextDocument,
	range: vscode.Range,
	remainingTokens: number
): vscode.Range {
	let expandedRange = new vscode.Range(
		new vscode.Position(range.start.line, 0),
		new vscode.Position(
			range.end.line,
			document.lineAt(range.end.line).text.length
		)
	);

	while (true) {
		let expanded = false;
		if (remainingTokens > 0 && expandedRange.start.line > 0) {
			expandedRange = expandedRange.with(
				new vscode.Position(expandedRange.start.line - 1, 0)
			);
			const lineTokens = estimateTokensZeta(
				document.lineAt(expandedRange.start.line).text
			);
			remainingTokens = Math.max(0, remainingTokens - lineTokens);
			expanded = true;
		}
		if (
			remainingTokens > 0 &&
			expandedRange.end.line < document.lineCount - 1
		) {
			expandedRange = expandedRange.with(
				undefined,
				new vscode.Position(
					expandedRange.end.line + 1,
					document.lineAt(expandedRange.end.line + 1).text.length
				)
			);
			const lineTokens = estimateTokensZeta(
				document.lineAt(expandedRange.end.line).text
			);
			remainingTokens = Math.max(0, remainingTokens - lineTokens);
			expanded = true;
		}
		if (!expanded) {
			break;
		}
	}
	return expandedRange;
}
