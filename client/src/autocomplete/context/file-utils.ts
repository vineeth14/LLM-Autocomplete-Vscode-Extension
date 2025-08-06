import * as vscode from "vscode";

export async function readRangeInFile(
	filepath: string,
	range: vscode.Range
): Promise<string> {
	try {
		const document = await vscode.workspace.openTextDocument(filepath);
		return document.getText(range);
	} catch (error) {
		return "";
	}
}

export async function gotoDefinition(
	filepath: string,
	position: vscode.Position
): Promise<vscode.LocationLink[]> {
	try {
		const document = await vscode.workspace.openTextDocument(filepath);

		const definitions = await vscode.commands.executeCommand<
			vscode.LocationLink[]
		>("vscode.executeDefinitionProvider", document.uri, position);

		return definitions || [];
	} catch (error) {
		return [];
	}
}
