import * as vscode from "vscode";
import { PredictionNavigator } from "./PredictionNavigator";
import { log } from "../../extension";

/**
 * Command handlers for prediction navigation system
 */
export class PredictionCommands {
	constructor(private predictionNavigator: PredictionNavigator) {}


	/**
	 * Accept current prediction and move to next (Tab key)
	 */
	public async acceptCurrentPrediction() {
		log.appendLine("[PredictionCommands] acceptCurrentPrediction called");
		
		if (!this.predictionNavigator.isActive()) {
			log.appendLine("[PredictionCommands] No active predictions to accept");
			vscode.window.showWarningMessage("No active predictions to accept");
			return;
		}

		const info = this.predictionNavigator.getCurrentPredictionInfo();
		if (info) {
			log.appendLine(`[PredictionCommands] Accepting prediction ${info.current}/${info.total}`);
		}

		const hasMore = await this.predictionNavigator.acceptCurrentPrediction();
		
		if (!hasMore) {
			vscode.window.showInformationMessage("All predictions completed!");
		} else {
			const remainingInfo = this.predictionNavigator.getCurrentPredictionInfo();
			if (remainingInfo) {
				vscode.window.showInformationMessage(`Prediction applied! ${remainingInfo.current}/${remainingInfo.total} remaining`);
			}
		}
	}

	/**
	 * Cancel all predictions (Escape key)
	 */
	public cancelAllPredictions() {
		log.appendLine("[PredictionCommands] cancelAllPredictions called");
		
		if (!this.predictionNavigator.isActive()) {
			log.appendLine("[PredictionCommands] No active predictions to cancel");
			vscode.window.showWarningMessage("No active predictions to cancel");
			return;
		}

		const info = this.predictionNavigator.getCurrentPredictionInfo();
		if (info) {
			const remaining = info.total - info.current + 1;
			log.appendLine(`[PredictionCommands] Cancelling ${remaining} remaining predictions`);
			vscode.window.showInformationMessage(`Cancelled ${remaining} remaining predictions`);
		}

		this.predictionNavigator.cancelAllPredictions();
	}
}