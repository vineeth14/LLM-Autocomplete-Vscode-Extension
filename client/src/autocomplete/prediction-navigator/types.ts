import { Range, TextDocument } from "vscode";
import { ZetaEdit } from "../zeta/response-parser";

export interface DocumentAnchor {
	line: number;
	character: number;
	lineContent: string;
}

export interface DocumentSnapshot {
	version: number;
	contentHash: string;
	timestamp: number;
}

export interface EditPrediction {
	id: string;
	edit: ZetaEdit;
	anchor: DocumentAnchor;
	snapshot: DocumentSnapshot;
	confidence: number;
	description: string;
	isValid: boolean;
}

export interface PredictionNavigatorState {
	predictions: EditPrediction[];
	currentIndex: number;
	activeDocument: TextDocument | undefined;
	isNavigating: boolean;
}