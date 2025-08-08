import * as vscode from "vscode";
import { PredictionNavigator } from "./PredictionNavigator";
import { log } from "../../extension";

export class PredictionCommands {
	constructor(private navigator: PredictionNavigator) {}

	public registerCommands(context: vscode.ExtensionContext): void {
		const acceptCommand = vscode.commands.registerCommand(
			"zeta.acceptPrediction",
			async () => {
				if (!this.navigator.isActive()) {
					return;
				}
				const success = await this.navigator.acceptCurrentPrediction();
			}
		);

		const cancelCommand = vscode.commands.registerCommand(
			"zeta.cancelPredictions",
			() => {
				if (!this.navigator.isActive()) {
					return;
				}
				this.navigator.cancelAllPredictions();
			}
		);
		context.subscriptions.push(acceptCommand, cancelCommand);
	}
}
