/*
  1. EditPrediction: Wraps ZetaEdit with metadata for tracking and validation
  2. DocumentAnchor: Stores position context so we can detect if the prediction is still valid after document changes
  3. DocumentSnapshot: MD5 hash of document to detect significant changes
  4. PredictionState: Central state management for the multi-edit workflow
*/
import * as vscode from "vscode";
import { ZetaEdit } from "../zeta/response-parser";

export interface EditPrediction {
	id: string;
	edit: ZetaEdit;
	anchor: DocumentAnchor;
	snapshot: DocumentSnapshot;
	confidence: number;
	description: string;
	isValid: boolean;
}
export interface DocumentAnchor {
	position: vscode.Position;
	lineText: string;
	hash: string;
}

export interface DocumentSnapshot {
	uri: string;
	timestamp: number;
	hash: string;
}

export interface PredictionState {
	predictions: EditPrediction[];
	currentIndex: number;
	document: vscode.TextDocument;
	isActive: boolean;
}
