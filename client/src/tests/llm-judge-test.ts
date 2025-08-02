import * as vscode from "vscode";
import * as fs from "fs";
import { LLMInlineCompletionProvider } from "../autocomplete/LLMInlineCompletionProvider";

interface JudgedResult {
	scenario: string;
	position: string;
	suggestion: string;
	context: string;
	score: number;
	reasoning: string;
	success: boolean;
}

export class LLMJudgeTester {
	private provider = new LLMInlineCompletionProvider();
	private results: JudgedResult[] = [];
	private logFile = "/tmp/llm-judge-test.log";
	private judgeModel = "gemma3n:e2b"; // Separate reliable judge model

	private log(message: string): void {
		fs.appendFileSync(this.logFile, message + "\n");
	}

	private async callJudgeModel(prompt: string): Promise<string> {
		const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";

		try {
			const response = await fetch(`${ollamaUrl}/api/generate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: this.judgeModel,
					prompt: prompt,
					stream: false,
					options: {
						temperature: 0.1,
						top_p: 0.9,
						num_predict: 20, // Much shorter responses
						stop: ["\n\n", "User:", "Suggestion:"], // Stop early
					},
				}),
			});

			if (!response.ok) {
				throw new Error(
					`Judge API error: ${response.status} ${response.statusText}`
				);
			}

			const data = (await response.json()) as { response?: string };
			return data.response || "";
		} catch (error) {
			this.log(`   ❌ Judge API call failed: ${error}`);
			throw error;
		}
	}

	async runLLMJudgeTests(): Promise<void> {
		// Reset log file
		fs.writeFileSync(
			this.logFile,
			"🤖 LLM Judge Quality Test Results\n" + "=".repeat(50) + "\n\n"
		);

		this.log(
			`🔍 Testing suggestion quality with ${this.judgeModel} as judge...`
		);
		this.log(
			`📊 Judge Model: ${this.judgeModel} (separate from completion model)\n`
		);

		// 8 scenarios focused on scope understanding and function awareness
		const testCases = [
			{
				line: 10,
				char: 16,
				scenario: "API response method",
				desc: "data = response.",
				expectedContext:
					"Common API response methods like .json(), .text(), .status_code",
			},
			{
				line: 14,
				char: 18,
				scenario: "Dictionary key access",
				desc: "email = user_data[",
				expectedContext:
					"Dictionary key completion with context from defined keys",
			},
			{
				line: 18,
				char: 36,
				scenario: "List comprehension condition",
				desc: "even_numbers = [x for x in numbers if x ",
				expectedContext:
					"Filtering condition for even numbers (% 2 == 0)",
			},
			{
				line: 23,
				char: 29,
				scenario: "F-string variable reference",
				desc: 'message = f"Hello {name}, you are {',
				expectedContext:
					"Variable reference in f-string with available variables",
			},
			{
				line: 28,
				char: 4,
				scenario: "Empty bubble sort implementation",
				desc: "def bubble_sort(arr: List[int]) -> List[int]:\n    ",
				expectedContext: "Complete bubble sort algorithm from scratch",
			},
			{
				line: 35,
				char: 4,
				scenario: "Graph DFS nested logic",
				desc: "def find_path_dfs(...):\n    if visited is None:\n        visited = set()\n    ",
				expectedContext:
					"Recursive DFS implementation with nested calls",
			},
			{
				line: 40,
				char: 29,
				scenario: "Function call with scope awareness",
				desc: "sorted_scores = bubble_sort(",
				expectedContext:
					"Calling previously defined bubble_sort function",
			},
			{
				line: 44,
				char: 47,
				scenario: "Lambda dictionary access",
				desc: "top_users = list(filter(lambda user: user[",
				expectedContext:
					"Dictionary key access in lambda with context knowledge",
			},
		];

		// Open the test file
		const document = await vscode.workspace.openTextDocument(
			"/Users/vineethrajesh/Projects/custom-llm-autocomplete/client/src/tests/judge_test_data.py"
		);

		for (let i = 0; i < testCases.length; i++) {
			const testCase = testCases[i];
			this.log(
				`\n📍 Test ${i + 1}/${testCases.length}: ${testCase.scenario} (${testCase.desc})`
			);

			const position = new vscode.Position(testCase.line, testCase.char);
			const context: vscode.InlineCompletionContext = {
				triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
				selectedCompletionInfo: undefined,
			};

			try {
				// Get the completion suggestion
				const items = await this.provider.provideInlineCompletionItems(
					document,
					position,
					context,
					{
						isCancellationRequested: false,
						onCancellationRequested: () => ({ dispose: () => {} }),
					}
				);

				const suggestion = items?.[0]?.insertText?.toString() || "";

				if (!suggestion) {
					this.results.push({
						scenario: testCase.scenario,
						position: `${testCase.line}:${testCase.char}`,
						suggestion: "",
						context: testCase.expectedContext,
						score: 0,
						reasoning: "No suggestion provided",
						success: false,
					});
					this.log(`   ❌ No suggestion provided`);
					continue;
				}

				// Get context around the position for the judge
				const contextLines = this.getContextLines(document, position);

				// Ask LLM to judge the quality
				const judgment = await this.judgeSuggestion(
					contextLines,
					testCase.desc,
					suggestion,
					testCase.expectedContext
				);

				const result: JudgedResult = {
					scenario: testCase.scenario,
					position: `${testCase.line}:${testCase.char}`,
					suggestion: suggestion,
					context: testCase.expectedContext,
					score: judgment.score,
					reasoning: judgment.reasoning,
					success: true,
				};

				this.results.push(result);

				const scoreEmoji = this.getScoreEmoji(judgment.score);
				this.log(`   ${scoreEmoji} Score: ${judgment.score}/10`);
				this.log(`   💡 Suggestion: "${suggestion}"`);
				this.log(`   🤔 Reasoning: ${judgment.reasoning}`);

				// Wait between tests
				await new Promise(resolve => setTimeout(resolve, 1000));
			} catch (error) {
				this.results.push({
					scenario: testCase.scenario,
					position: `${testCase.line}:${testCase.char}`,
					suggestion: "",
					context: testCase.expectedContext,
					score: 0,
					reasoning: `Error: ${error}`,
					success: false,
				});

				this.log(`   ❌ Error: ${error}`);
			}
		}

		this.printJudgeSummary();
	}

	private getContextLines(
		document: vscode.TextDocument,
		position: vscode.Position
	): string {
		// Enhanced context extraction for better judge information
		const startLine = Math.max(0, position.line - 5); // More context
		const endLine = Math.min(document.lineCount - 1, position.line + 3);

		let context = "";

		// Add imports and key definitions first
		const imports: string[] = [];
		const variables: string[] = [];

		for (let i = 0; i < Math.min(20, document.lineCount); i++) {
			const line = document.lineAt(i).text.trim();
			if (line.startsWith("import ") || line.startsWith("from ")) {
				imports.push(line);
			}
			if (line.includes(" = ") && !line.startsWith("#")) {
				const varMatch = line.match(/(\w+)\s*=/);
				if (varMatch) variables.push(varMatch[1]);
			}
		}

		if (imports.length > 0) {
			context += "IMPORTS:\n" + imports.join("\n") + "\n\n";
		}

		if (variables.length > 0) {
			context +=
				"AVAILABLE VARIABLES: " +
				variables.slice(0, 10).join(", ") +
				"\n\n";
		}

		context += "CODE CONTEXT:\n";
		for (let i = startLine; i <= endLine; i++) {
			const line = document.lineAt(i).text;
			const marker = i === position.line ? " <-- CURSOR HERE" : "";
			context += `${i + 1}: ${line}${marker}\n`;
		}

		return context;
	}

	private async judgeSuggestion(
		context: string,
		incomplete: string,
		suggestion: string,
		expectedContext: string
	): Promise<{ score: number; reasoning: string }> {
		const judgePrompt = `Rate code completion 1-10:

User typed: "${incomplete}"
Suggestion: "${suggestion}"

Quick rating:
SCORE: [number]
WHY: [short reason]`;

		try {
			this.log(
				`   🤖 Sending to ${this.judgeModel} judge (${judgePrompt.length} chars)...`
			);
			const response = await this.callJudgeModel(judgePrompt);
			this.log(`   📥 Judge response: "${response || "NULL"}"`);

			if (!response || response.trim() === "") {
				return {
					score: 5,
					reasoning: "Empty response from judge model",
				};
			}

			// Parse the response - optimized for short format
			const scoreMatch =
				response.match(/SCORE:\s*(\d+)/i) ||
				response.match(/(\d+)\/10/) ||
				response.match(/\b([1-9]|10)\b/);
			const reasoningMatch =
				response.match(/WHY:\s*(.+)/i) ||
				response.match(/REASONING:\s*(.+)/i) ||
				response.match(/because\s+(.+)/i);

			let score = 5;
			let reasoning = "Unable to parse judgment from response";

			if (scoreMatch) {
				score = parseInt(scoreMatch[1]);
				this.log(`   ✅ Parsed score: ${score}`);
			} else {
				this.log(`   ❌ Could not parse score from: "${response}"`);
				// Try to extract any number between 1-10
				const numberMatch = response.match(/\b([1-9]|10)\b/);
				if (numberMatch) {
					score = parseInt(numberMatch[1]);
					this.log(`   🔍 Found fallback score: ${score}`);
				}
			}

			if (reasoningMatch) {
				reasoning = reasoningMatch[1].trim();
				this.log(`   ✅ Parsed reasoning: "${reasoning}"`);
			} else {
				// Use first sentence as reasoning
				const firstSentence = response.split(/[.!?]/)[0].trim();
				if (firstSentence.length > 0) {
					reasoning = firstSentence;
					this.log(`   🔍 Using fallback reasoning: "${reasoning}"`);
				}
			}

			return {
				score: Math.max(1, Math.min(10, score)), // Clamp between 1-10
				reasoning,
			};
		} catch (error) {
			this.log(`   ❌ Judge error: ${error}`);
			return {
				score: 5,
				reasoning: `Judge error: ${error}`,
			};
		}
	}

	private getScoreEmoji(score: number): string {
		if (score >= 9) return "🏆";
		if (score >= 7) return "🟢";
		if (score >= 5) return "🟡";
		if (score >= 3) return "🟠";
		return "🔴";
	}

	private printJudgeSummary(): void {
		this.log("\n📊 COMPLETION-SPECIFIC QUALITY ANALYSIS");
		this.log("=".repeat(50));

		const scores = this.results.filter(r => r.success).map(r => r.score);
		const successfulTests = this.results.filter(r => r.success).length;

		if (scores.length === 0) {
			this.log("❌ No successful tests to analyze");
			return;
		}

		const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
		const maxScore = Math.max(...scores);
		const minScore = Math.min(...scores);

		const excellent = scores.filter(s => s >= 9).length;
		const good = scores.filter(s => s >= 7 && s < 9).length;
		const fair = scores.filter(s => s >= 5 && s < 7).length;
		const poor = scores.filter(s => s < 5).length;

		this.log(`Tests completed: ${this.results.length}`);
		this.log(`Successful: ${successfulTests}`);
		this.log(`Average completion score: ${avgScore.toFixed(1)}/10`);
		this.log(`Score range: ${minScore} - ${maxScore}`);

		// Completion-specific metrics
		const appropriateCompletions = scores.filter(s => s >= 7).length;
		const usableCompletions = scores.filter(s => s >= 6).length;
		const timeWastingCompletions = scores.filter(s => s <= 3).length;

		this.log(`\n🎯 COMPLETION EFFECTIVENESS:`);
		this.log(
			`   Time-saving completions (7-10): ${appropriateCompletions}/${scores.length} (${((appropriateCompletions / scores.length) * 100).toFixed(1)}%)`
		);
		this.log(
			`   Usable completions (6+): ${usableCompletions}/${scores.length} (${((usableCompletions / scores.length) * 100).toFixed(1)}%)`
		);
		this.log(
			`   Time-wasting completions (1-3): ${timeWastingCompletions}/${scores.length} (${((timeWastingCompletions / scores.length) * 100).toFixed(1)}%)`
		);

		const completionGrade =
			appropriateCompletions / scores.length >= 0.8
				? "EXCELLENT"
				: usableCompletions / scores.length >= 0.7
					? "GOOD"
					: timeWastingCompletions / scores.length <= 0.2
						? "FAIR"
						: "POOR";
		this.log(`\n📝 Completion System Grade: ${completionGrade}`);

		// Detailed results
		this.log("\n📋 DETAILED JUDGE RESULTS");
		this.log("=".repeat(40));
		this.results.forEach((result, i) => {
			const emoji = result.success
				? this.getScoreEmoji(result.score)
				: "❌";
			this.log(`\n${i + 1}. ${emoji} ${result.scenario}`);
			this.log(`   Position: ${result.position}`);
			this.log(`   Suggestion: "${result.suggestion}"`);
			if (result.success) {
				this.log(`   Score: ${result.score}/10`);
				this.log(`   Judge: ${result.reasoning}`);
			} else {
				this.log(`   Error: ${result.reasoning}`);
			}
		});

		// Completion-specific insights
		this.log("\n💡 ACTIONABLE COMPLETION INSIGHTS");
		this.log("=".repeat(40));

		// Analyze by scenario type
		const scenarioPerformance = new Map<string, number[]>();
		this.results
			.filter(r => r.success)
			.forEach(r => {
				const type = r.scenario.split(" ")[0]; // First word of scenario
				if (!scenarioPerformance.has(type))
					scenarioPerformance.set(type, []);
				scenarioPerformance.get(type)!.push(r.score);
			});

		this.log("📊 Performance by completion type:");
		scenarioPerformance.forEach((scores, type) => {
			const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
			this.log(
				`   ${type}: ${avg.toFixed(1)}/10 (${scores.length} tests)`
			);
		});

		// Specific recommendations
		if (appropriateCompletions / scores.length < 0.6) {
			this.log("\n🔧 COMPLETION IMPROVEMENTS NEEDED:");
			this.log(
				"   - Focus on context-aware suggestions that match immediate typing intent"
			);
			this.log(
				"   - Reduce generic completions that don't save keystrokes"
			);
			this.log(
				"   - Improve specificity for API methods and variable references"
			);
		}

		if (timeWastingCompletions > scores.length * 0.3) {
			this.log("\n⚠️  HIGH PRIORITY: Too many time-wasting completions");
			this.log(
				"   - Filter out irrelevant suggestions that interrupt workflow"
			);
			this.log(
				"   - Improve context understanding for better appropriateness"
			);
		}

		// Best and worst completion scenarios
		if (this.results.length > 1) {
			const bestResult = this.results
				.filter(r => r.success)
				.sort((a, b) => b.score - a.score)[0];
			const worstResult = this.results
				.filter(r => r.success)
				.sort((a, b) => a.score - b.score)[0];

			if (bestResult) {
				this.log(
					`\n🏆 Most effective completion: ${bestResult.scenario} (${bestResult.score}/10)`
				);
				this.log(`   Reason: ${bestResult.reasoning}`);
			}
			if (worstResult && worstResult.score < bestResult?.score) {
				this.log(
					`\n🔴 Least effective completion: ${worstResult.scenario} (${worstResult.score}/10)`
				);
				this.log(`   Reason: ${worstResult.reasoning}`);
			}
		}

		// Open the log file in VSCode
		vscode.workspace.openTextDocument(this.logFile).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	}
}

// Export function to run from command palette
export async function runLLMJudgeTests(): Promise<void> {
	const tester = new LLMJudgeTester();
	await tester.runLLMJudgeTests();
}
