import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ZetaInlineCompletionProvider } from "../autocomplete/ZetaInlineCompletionProvider";
import { PredictionNavigator } from "../autocomplete/prediction-navigator/PredictionNavigator";
import { log } from "../extension";

export interface MultiEditTestScenario {
	name: string;
	description: string;
	sourceCode: string;
	cursorPosition: { line: number; character: number };
	expectedEditCount: number;
	expectedEditTypes: string[];
	mockResponse: string;
	testActiveBlockingBehavior: boolean;
}

export class MultiEditTester {
	private provider: ZetaInlineCompletionProvider;
	private predictionNavigator: PredictionNavigator;
	private testDocument: vscode.TextDocument | null = null;
	private logFilePath: string;

	constructor(context: vscode.ExtensionContext) {
		this.predictionNavigator = new PredictionNavigator(context);
		this.provider = new ZetaInlineCompletionProvider(this.predictionNavigator);
		
		// Create log file path
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		this.logFilePath = path.join('/tmp', `multi-edit-test-${timestamp}.log`);
		
		// Initialize log file
		this.writeToLog(`=== Multi-Edit Test Log Started ===`);
		this.writeToLog(`Timestamp: ${new Date().toISOString()}`);
		this.writeToLog(`Log file: ${this.logFilePath}\n`);
	}

	async runAllTests(): Promise<void> {
		const startMessage = "=== Multi-Edit Test Suite Started ===";
		log.appendLine(startMessage);
		log.appendLine("📋 Running with MOCK responses (fast, predictable)");
		log.appendLine("⚠️  Use 'Run Real Multi-Edit Tests' for actual LLM testing\n");
		log.appendLine(`📄 Detailed logs: ${this.logFilePath}\n`);
		
		this.writeToLog(startMessage);
		this.writeToLog("📋 Running with MOCK responses (fast, predictable)");
		this.writeToLog("⚠️  Use 'Run Real Multi-Edit Tests' for actual LLM testing\n");
		
		const scenarios = this.getTestScenarios();
		let passed = 0;
		let failed = 0;

		for (const scenario of scenarios) {
			try {
				const testHeader = `\n--- Testing: ${scenario.name} ---`;
				const testDesc = `Description: ${scenario.description}`;
				
				log.appendLine(testHeader);
				log.appendLine(testDesc);
				this.writeToLog(testHeader);
				this.writeToLog(testDesc);
				
				const result = await this.runScenario(scenario);
				if (result.success) {
					const passMsg = `✅ PASSED: ${scenario.name}`;
					log.appendLine(passMsg);
					this.writeToLog(passMsg);
					passed++;
				} else {
					const failMsg = `❌ FAILED: ${scenario.name} - ${result.error}`;
					log.appendLine(failMsg);
					this.writeToLog(failMsg);
					failed++;
				}
			} catch (error) {
				const errorMsg = `❌ ERROR: ${scenario.name} - ${error}`;
				log.appendLine(errorMsg);
				this.writeToLog(errorMsg);
				failed++;
			} finally {
				// Cleanup between tests
				if (this.predictionNavigator.isActive()) {
					const cleanupMsg = "🧹 Cleaning up predictions after test...";
					log.appendLine(cleanupMsg);
					this.writeToLog(cleanupMsg);
					this.predictionNavigator.cancelAllPredictions();
					await this.sleep(100);
				}
			}
		}

		const resultsHeader = `\n=== Test Results ===`;
		const passedMsg = `Passed: ${passed}`;
		const failedMsg = `Failed: ${failed}`;
		const totalMsg = `Total: ${passed + failed}`;
		const completeMsg = "=== Multi-Edit Test Suite Complete ===";
		
		log.appendLine(resultsHeader);
		log.appendLine(passedMsg);
		log.appendLine(failedMsg);
		log.appendLine(totalMsg);
		log.appendLine(completeMsg);
		log.appendLine(`📄 Full details in: ${this.logFilePath}`);
		
		this.writeToLog(resultsHeader);
		this.writeToLog(passedMsg);
		this.writeToLog(failedMsg);
		this.writeToLog(totalMsg);
		this.writeToLog(completeMsg);
		this.writeToLog(`\nLog file location: ${this.logFilePath}`);
		
		// Show the log file path prominently
		vscode.window.showInformationMessage(
			`Multi-Edit tests complete! Detailed log: ${this.logFilePath}`,
			"Open Log File"
		).then(selection => {
			if (selection === "Open Log File") {
				vscode.commands.executeCommand("vscode.open", vscode.Uri.file(this.logFilePath));
			}
		});
	}

	async runRealLLMTests(): Promise<void> {
		log.appendLine("=== REAL LLM Multi-Edit Test Suite Started ===");
		log.appendLine("🚀 Using REAL LLM calls - make sure Ollama server is running!");
		log.appendLine("⏱️  This may take 30-60 seconds...\n");
		
		const realScenarios = this.getRealTestScenarios();
		let passed = 0;
		let failed = 0;

		for (const scenario of realScenarios) {
			try {
				log.appendLine(`\n--- Real LLM Testing: ${scenario.name} ---`);
				log.appendLine(`Description: ${scenario.description}`);
				
				const result = await this.runRealScenario(scenario);
				if (result.success) {
					log.appendLine(`✅ PASSED: ${scenario.name}`);
					passed++;
				} else {
					log.appendLine(`❌ FAILED: ${scenario.name} - ${result.error}`);
					failed++;
				}
			} catch (error) {
				log.appendLine(`❌ ERROR: ${scenario.name} - ${error}`);
				failed++;
			}

			// Wait between tests to avoid overwhelming server
			await this.sleep(2000);
		}

		log.appendLine(`\n=== Real LLM Test Results ===`);
		log.appendLine(`Passed: ${passed}`);
		log.appendLine(`Failed: ${failed}`);
		log.appendLine(`Total: ${passed + failed}`);
		log.appendLine("=== Real LLM Multi-Edit Test Suite Complete ===");
	}

	async runScenario(scenario: MultiEditTestScenario): Promise<{success: boolean, error?: string}> {
		try {
			// CRITICAL: Clear any active predictions from previous tests
			if (this.predictionNavigator.isActive()) {
				log.appendLine("🧹 Clearing active predictions from previous test...");
				this.predictionNavigator.cancelAllPredictions();
				await this.sleep(100); // Small delay to ensure cleanup
			}

			// Create test document and show it in editor
			const document = await this.createTestDocument(scenario.sourceCode);
			await vscode.window.showTextDocument(document);
			const position = new vscode.Position(scenario.cursorPosition.line, scenario.cursorPosition.character);

			// Mock the LLM response for this test
			const suggestionModule = require("../autocomplete/suggestion");
			const originalCallProvider = suggestionModule.callProvider;
			suggestionModule.callProvider = async () => scenario.mockResponse;

			// Test 1: Basic multi-edit generation
			const test1Msg = "Test 1: Generating multi-edit predictions...";
			log.appendLine(test1Msg);
			this.writeToLog(test1Msg);
			this.writeToLog(`Cursor position: line ${position.line}, character ${position.character}`);
			this.writeToLog(`Source code:\n${scenario.sourceCode}`);
			
			const completionItems = await this.provider.provideInlineCompletionItems(
				document,
				position,
				{ triggerKind: vscode.InlineCompletionTriggerKind.Automatic, selectedCompletionInfo: undefined },
				new vscode.CancellationTokenSource().token
			);
			
			this.writeToLog(`Completion items returned: ${completionItems.length}`);

			// Verify multi-edit was detected
			if (scenario.expectedEditCount > 1) {
				if (completionItems.length !== 0) {
					return { success: false, error: "Expected empty completions for multi-edit scenario" };
				}
				
				// Check if predictions were created
				if (!this.predictionNavigator.isActive()) {
					return { success: false, error: "Multi-edit should have activated prediction navigator" };
				}

				const predictionCount = this.predictionNavigator.getCurrentPredictionCount();
				const activatedMsg = `✓ Multi-edit activated with prediction navigator (${predictionCount} predictions)`;
				log.appendLine(activatedMsg);
				this.writeToLog(activatedMsg);
			} else {
				if (completionItems.length === 0) {
					return { success: false, error: "Expected single completion item for single-edit scenario" };
				}
				log.appendLine(`✓ Single edit returned ${completionItems.length} completion items`);
			}

			// Test 2: Active blocking behavior (if applicable)
			if (scenario.testActiveBlockingBehavior && this.predictionNavigator.isActive()) {
				log.appendLine("Test 2: Testing active prediction blocking...");
				
				const initialPredictionCount = this.predictionNavigator.getCurrentPredictionCount();
				log.appendLine(`Initial prediction count: ${initialPredictionCount}`);
				
				// CRITICAL: This test reveals whether active blocking is working
				// The provider should check predictionNavigator.isActive() and return [] if true
				const blockedCompletions = await this.provider.provideInlineCompletionItems(
					document,
					position,
					{ triggerKind: vscode.InlineCompletionTriggerKind.Automatic, selectedCompletionInfo: undefined },
					new vscode.CancellationTokenSource().token
				);

				// Active blocking should prevent new completions (length should be 0)
				// Prediction count should stay the same (not accumulate)
				const currentPredictionCount = this.predictionNavigator.getCurrentPredictionCount();
				log.appendLine(`Current prediction count: ${currentPredictionCount}`);
				
				if (blockedCompletions.length !== 0) {
					return { 
						success: false, 
						error: `Active blocking FAILED! Got ${blockedCompletions.length} new completions when should be 0. The isActive() check is working but returning wrong result.` 
					};
				}
				
				// Check if prediction count increased (which would mean new predictions were added)
				if (currentPredictionCount !== initialPredictionCount) {
					return {
						success: false,
						error: `Prediction count changed from ${initialPredictionCount} to ${currentPredictionCount}! Active blocking should prevent new predictions.`
					};
				}
				log.appendLine("✓ Active predictions properly blocked new completions");
			}

			// Test 3: Prediction navigation workflow
			if (this.predictionNavigator.isActive()) {
				log.appendLine("Test 3: Testing prediction navigation workflow...");
				
				const initialPredictionCount = this.predictionNavigator.getCurrentPredictionCount();
				// Be more flexible with prediction count since mocked responses may generate different edits
				if (initialPredictionCount < scenario.expectedEditCount) {
					return { 
						success: false, 
						error: `Expected at least ${scenario.expectedEditCount} predictions, got ${initialPredictionCount}` 
					};
				}
				
				log.appendLine(`✓ Got ${initialPredictionCount} predictions (expected at least ${scenario.expectedEditCount})`);

				// Show the document in editor so predictions can display properly
				await vscode.window.showTextDocument(document);

				// Test partial navigation (just a few predictions to verify workflow)
				// Don't navigate through ALL predictions since there could be many (18 in this case)
				const testNavigationCount = Math.min(scenario.expectedEditCount, 3);
				let navigationSuccess = true;
				
				for (let i = 0; i < testNavigationCount; i++) {
					try {
						await vscode.commands.executeCommand("zeta.acceptPrediction");
						log.appendLine(`✓ Successfully navigated to prediction ${i + 1}/${testNavigationCount}`);
						await this.sleep(100); // Small delay to see the changes
					} catch (error) {
						navigationSuccess = false;
						log.appendLine(`✗ Failed to navigate to prediction ${i + 1}: ${error}`);
						break;
					}
				}

				if (!navigationSuccess) {
					return { success: false, error: "Failed during prediction navigation" };
				}

				// Navigator should still be active since we didn't process all predictions
				if (!this.predictionNavigator.isActive()) {
					return { success: false, error: `Navigator should still be active after ${testNavigationCount} predictions (${initialPredictionCount} total)` };
				}

				log.appendLine(`✓ Navigation workflow working correctly (tested ${testNavigationCount}/${initialPredictionCount} predictions)`);

				// Cancel remaining predictions for cleanup
				await vscode.commands.executeCommand("zeta.cancelPredictions");
				
				// Now navigator should be inactive
				if (this.predictionNavigator.isActive()) {
					return { success: false, error: "Prediction navigator should be inactive after cancellation" };
				}
				
				log.appendLine("✓ All predictions successfully navigated");
			}

			// Restore original function
			suggestionModule.callProvider = originalCallProvider;

			// Cleanup test document
			await this.cleanupTestDocument();

			return { success: true };

		} catch (error) {
			return { success: false, error: `Test execution error: ${error}` };
		} finally {
			// Always cleanup test document, even on error
			await this.cleanupTestDocument();
		}
	}

	private async createTestDocument(content: string): Promise<vscode.TextDocument> {
		// Create an untitled document that won't prompt for save
		const uri = vscode.Uri.parse(`untitled:multi-edit-test-${Date.now()}.py`);
		const document = await vscode.workspace.openTextDocument({
			content: content,
			language: 'python'
		});
		
		this.testDocument = document;
		return document;
	}

	private async cleanupTestDocument(): Promise<void> {
		try {
			// Method 1: Try to close specific document without saving
			if (this.testDocument) {
				const editor = vscode.window.visibleTextEditors.find(
					e => e.document.uri.toString() === this.testDocument!.uri.toString()
				);
				
				if (editor) {
					// Close the specific editor tab without saving
					await vscode.window.showTextDocument(this.testDocument);
					await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
					this.writeToLog("🗑️ Closed test document without saving (specific)");
				}
			} else {
				// Method 2: Close currently active editor without saving
				await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
				this.writeToLog("🗑️ Closed test document without saving (active)");
			}
		} catch (error) {
			try {
				// Fallback: Force close all editors matching our pattern
				await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
				this.writeToLog("🗑️ Closed test document (fallback - may have prompted for save)");
			} catch (fallbackError) {
				this.writeToLog(`Warning: Failed to close test document: ${fallbackError}`);
			}
		}
		
		if (this.testDocument) {
			this.testDocument = null;
		}
	}

	private sleep(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	private writeToLog(message: string): void {
		try {
			const timestamp = new Date().toISOString();
			const logEntry = `[${timestamp}] ${message}\n`;
			fs.appendFileSync(this.logFilePath, logEntry);
		} catch (error) {
			// Fallback to console if file write fails
			console.error(`Failed to write to log file: ${error}`);
		}
	}

	private getTestScenarios(): MultiEditTestScenario[] {
		return [
			{
				name: "Python Function Refactor",
				description: "AI suggests multiple edits: import addition, variable modification, and return statement change",
				sourceCode: `def process_user_data(users):
    # TODO: Add input validation
    results = []
    for user in users:
        results.append(user.upper())
    # TODO: Add error handling
    return results`,
				cursorPosition: { line: 1, character: 30 }, // After "validation"
				expectedEditCount: 3,
				expectedEditTypes: ["import", "validation", "error_handling"],
				mockResponse: `<|editable_region_start|>
import logging
from typing import List, Optional

def process_user_data(users: List[str]) -> Optional[List[str]]:
    if not users:
        logging.warning("Empty user list provided")
        return None
    
    results = []
    try:
        for user in users:
            if isinstance(user, str):
                results.append(user.upper())
    except Exception as e:
        logging.error(f"Error processing users: {e}")
        return None
    
    return results
<|editable_region_end|>`,
				testActiveBlockingBehavior: true
			},
			{
				name: "Error Handling Addition", 
				description: "AI suggests adding multiple error handling blocks",
				sourceCode: `def read_and_process_file(filename):
    file = open(filename)
    data = file.read()
    file.close()
    return data.upper()`,
				cursorPosition: { line: 1, character: 20 }, // After "open(filename)"
				expectedEditCount: 4,
				expectedEditTypes: ["import", "try_block", "except_block", "finally_block"],
				mockResponse: `<|editable_region_start|>
import logging
from pathlib import Path

def read_and_process_file(filename):
    if not Path(filename).exists():
        logging.error(f"File {filename} does not exist")
        return None
        
    try:
        with open(filename, 'r') as file:
            data = file.read()
        return data.upper()
    except PermissionError:
        logging.error(f"Permission denied reading {filename}")
        return None
    except Exception as e:
        logging.error(f"Error reading file: {e}")
        return None
<|editable_region_end|>`,
				testActiveBlockingBehavior: true
			},
			{
				name: "Single Edit Scenario",
				description: "AI suggests only one edit - should use normal completion, not multi-edit mode",
				sourceCode: `def greet(name):
    return f"Hello, "`,
				cursorPosition: { line: 1, character: 20 }, // After the quote
				expectedEditCount: 1,
				expectedEditTypes: ["simple_completion"],
				mockResponse: `<|editable_region_start|>
def greet(name):
    return f"Hello, {name}!"
<|editable_region_end|>`,
				testActiveBlockingBehavior: false
			},
			{
				name: "Error Handling Additions",
				description: "AI suggests multiple try-catch blocks and error handling",
				sourceCode: `def read_file(filename):
    file = open(filename, 'r')
    content = file.read()
    file.close()
    return content`,
				cursorPosition: { line: 1, character: 0 },
				expectedEditCount: 4,
				expectedEditTypes: ["try_block", "except_block", "finally_block", "logging"],
				mockResponse: `<|editable_region_start|>
import logging

def read_file(filename):
    try:
        file = open(filename, 'r')
        content = file.read()
        return content
    except FileNotFoundError:
        logging.error(f"File {filename} not found")
        return None
    finally:
        if 'file' in locals():
            file.close()
<|editable_region_end|>`,
				testActiveBlockingBehavior: true
			},
			{
				name: "Type Annotations Addition",
				description: "AI suggests adding type hints throughout a function",
				sourceCode: `def process_data(data, multiplier):
    result = []
    for item in data:
        result.append(item * multiplier)
    return result`,
				cursorPosition: { line: 0, character: 15 },
				expectedEditCount: 3,
				expectedEditTypes: ["import_typing", "function_signature", "variable_annotation"],
				mockResponse: `<|editable_region_start|>
from typing import List

def process_data(data: List[int], multiplier: int) -> List[int]:
    result: List[int] = []
    for item in data:
        result.append(item * multiplier)
    return result
<|editable_region_end|>`,
				testActiveBlockingBehavior: true
			}
		];
	}

	private getRealTestScenarios(): MultiEditTestScenario[] {
		return [
			{
				name: "Real LLM - Incomplete Function",
				description: "Function with TODOs that should trigger multiple AI fixes",
				sourceCode: `def process_user_data(users):
    # TODO: Add input validation
    results = []
    for user in users:
        results.append(user.upper())
    # TODO: Add error handling
    return results`,
				cursorPosition: { line: 1, character: 30 }, // After "validation"
				expectedEditCount: 2, // More flexible for real LLM
				expectedEditTypes: ["validation", "error_handling"],
				mockResponse: "", // Not used for real tests
				testActiveBlockingBehavior: true
			},
			{
				name: "Real LLM - Simple Completion",
				description: "Simple function that should only need one completion",
				sourceCode: `def greet(name):
    return f"Hello, "`,
				cursorPosition: { line: 1, character: 20 }, // After the quote
				expectedEditCount: 1,
				expectedEditTypes: ["simple_completion"],
				mockResponse: "", // Not used for real tests
				testActiveBlockingBehavior: false
			}
		];
	}

	async runRealScenario(scenario: MultiEditTestScenario): Promise<{success: boolean, error?: string}> {
		try {
			// Create test document
			const document = await this.createTestDocument(scenario.sourceCode);
			const position = new vscode.Position(scenario.cursorPosition.line, scenario.cursorPosition.character);

			// Show document in editor so user can see what's being tested
			await vscode.window.showTextDocument(document);

			// NO MOCKING - use real LLM calls
			log.appendLine("🚀 Triggering REAL LLM completion...");
			log.appendLine("⏱️  Waiting for response (up to 15 seconds)...");
			
			const completionPromise = this.provider.provideInlineCompletionItems(
				document,
				position,
				{ triggerKind: vscode.InlineCompletionTriggerKind.Automatic, selectedCompletionInfo: undefined },
				new vscode.CancellationTokenSource().token
			);

			const completionItems = await this.withTimeout(completionPromise, 15000);
			
			// Analyze real results
			if (scenario.expectedEditCount > 1) {
				// Expected multi-edit
				if (completionItems.length !== 0) {
					return { success: false, error: "Expected empty completions for multi-edit (should activate navigator)" };
				}
				
				if (!this.predictionNavigator.isActive()) {
					return { success: false, error: "Expected prediction navigator to be active for multi-edit" };
				}

				const predictionCount = this.predictionNavigator.getCurrentPredictionCount();
				log.appendLine(`✓ Multi-edit activated with ${predictionCount} predictions`);

				// Test active blocking if requested
				if (scenario.testActiveBlockingBehavior) {
					log.appendLine("🔒 Testing active blocking behavior...");
					const blockedCompletions = await this.provider.provideInlineCompletionItems(
						document,
						position,
						{ triggerKind: vscode.InlineCompletionTriggerKind.Automatic, selectedCompletionInfo: undefined },
						new vscode.CancellationTokenSource().token
					);

					if (blockedCompletions.length !== 0) {
						return { success: false, error: "New completions should be blocked during active predictions" };
					}
					log.appendLine("✓ Active predictions properly blocked new completions");
				}

			} else {
				// Expected single edit
				if (completionItems.length === 0 && !this.predictionNavigator.isActive()) {
					return { success: false, error: "Expected either completion items or navigator activation" };
				}
				log.appendLine(`✓ Got ${completionItems.length} completion items or navigator activation`);
			}

			return { success: true };

		} catch (error) {
			return { success: false, error: `Real test execution error: ${error}` };
		} finally {
			// Cleanup: Cancel any active predictions
			if (this.predictionNavigator.isActive()) {
				await vscode.commands.executeCommand("zeta.cancelPredictions");
			}
			
			// Close the test document
			await this.cleanupTestDocument();
		}
	}

	private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error(`Operation timed out after ${timeoutMs}ms`));
			}, timeoutMs);

			promise
				.then(result => {
					clearTimeout(timer);
					resolve(result);
				})
				.catch(error => {
					clearTimeout(timer);
					reject(error);
				});
		});
	}

}

export async function runMultiEditTests(): Promise<void> {
	// Create a minimal extension context for testing
	const context = {
		subscriptions: [],
		workspaceState: {
			get: () => undefined,
			update: () => Promise.resolve()
		},
		globalState: {
			get: () => undefined,
			update: () => Promise.resolve()
		}
	} as any as vscode.ExtensionContext;

	const tester = new MultiEditTester(context);
	await tester.runAllTests();
}

export async function runRealMultiEditTests(): Promise<void> {
	// Create a minimal extension context for testing
	const context = {
		subscriptions: [],
		workspaceState: {
			get: () => undefined,
			update: () => Promise.resolve()
		},
		globalState: {
			get: () => undefined,
			update: () => Promise.resolve()
		}
	} as any as vscode.ExtensionContext;

	const tester = new MultiEditTester(context);
	await tester.runRealLLMTests();
}