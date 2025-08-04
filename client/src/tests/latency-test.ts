import * as vscode from "vscode";
import * as fs from "fs";
import { LLMInlineCompletionProvider } from "../autocomplete/LLMInlineCompletionProvider";

interface LatencyResult {
	position: string;
	latency: number;
	success: boolean;
	suggestion?: string;
	breakdown?: {
		debounce: number;
		cache: number;
		context: number;
		network: number;
		caching: number;
		userPerceived: number;
	};
}

export class LatencyTester {
	private provider = new LLMInlineCompletionProvider();
	private results: LatencyResult[] = [];
	private logFile = "/tmp/llm-latency-test.log";

	private log(message: string): void {
		fs.appendFileSync(this.logFile, message + "\n");
	}

	async runTests(): Promise<void> {
		this.log("🚀 Running both partial and function completion tests...");
		await this.runPartialCompletionTests();
		await this.runFunctionCompletionTests();
		this.printSummary();
	}

	async runPartialCompletionTests(): Promise<void> {
		// Reset log file
		fs.writeFileSync(
			this.logFile,
			"🚀 Partial Completion Test Results\n" + "=".repeat(50) + "\n\n"
		);

		this.log("🔍 Starting partial completion tests...");

		// Comprehensive partial completion scenarios
		const testCases = [
			{ line: 11, char: 17, desc: "module attr: 'math.'" },
			{ line: 12, char: 26, desc: "expression: 'radius * radius * '" },
			{ line: 13, char: 11, desc: "return stmt: 'return '" },
			{ line: 18, char: 14, desc: "iterator: 'for num in '" },
			{ line: 19, char: 15, desc: "comparison: 'if num > '" },
			{ line: 20, char: 19, desc: "assignment: 'total += '" },
			{ line: 21, char: 11, desc: "return value: 'return '" },
			{ line: 25, char: 12, desc: "condition: 'if n <= '" },
			{ line: 27, char: 41, desc: "func call: '+ '" },
			{ line: 32, char: 19, desc: "range: 'range('" },
			{ line: 34, char: 21, desc: "array access: 'arr[j] > '" },
			{ line: 35, char: 39, desc: "tuple assign: '= '" },
			{ line: 48, char: 28, desc: "func param: 'calculate_area('" },
		];

		// Open the test file
		const document = await vscode.workspace.openTextDocument(
			"/Users/vineethrajesh/Projects/custom-llm-autocomplete/client/src/tests/autocomplete_test.py"
		);

		for (let i = 0; i < testCases.length; i++) {
			const testCase = testCases[i];
			this.log(
				`\n📍 Test ${i + 1}/${testCases.length}: ${testCase.desc} (line ${testCase.line})`
			);

			const position = new vscode.Position(testCase.line, testCase.char);
			const context: vscode.InlineCompletionContext = {
				triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
				selectedCompletionInfo: undefined,
			};

			const startTime = performance.now();

			try {
				const items = await this.provider.provideInlineCompletionItems(
					document,
					position,
					context,
					{
						isCancellationRequested: false,
						onCancellationRequested: () => ({ dispose: () => {} }),
					}
				);

				const endTime = performance.now();
				const latency = endTime - startTime;

				// const breakdown = this.provider.getLastTimingBreakdown();
				const result: LatencyResult = {
					position: `${testCase.line}:${testCase.char} (${testCase.desc})`,
					latency: latency,
					success: items && items.length > 0,
					suggestion: items?.[0]?.insertText?.toString(),
					// breakdown: breakdown,
				};

				this.results.push(result);

				this.log(
					`   ⏱️  ${latency.toFixed(1)}ms - ${result.success ? "✅" : "❌"}`
				);

				// if (breakdown) {
				// 	this.log(
				// 		`   📊 Breakdown: Debounce ${breakdown.debounce.toFixed(0)}ms | Cache ${breakdown.cache.toFixed(0)}ms | Context ${breakdown.context.toFixed(0)}ms | Network ${breakdown.network.toFixed(0)}ms`
				// 	);
				// 	this.log(
				// 		`   👤 User perceived: ${breakdown.userPerceived.toFixed(0)}ms (after stopping typing)`
				// 	);
				// }

				if (result.suggestion) {
					this.log(
						`   💡 "${result.suggestion.substring(0, 50)}..."`
					);
				}

				// Test cache behavior on last test only
				if (i === testCases.length - 1 && result.success) {
					this.log(`   🔄 Testing cache hit for same position...`);
					const cacheStartTime = performance.now();

					try {
						const cacheItems =
							await this.provider.provideInlineCompletionItems(
								document,
								position,
								context,
								{
									isCancellationRequested: false,
									onCancellationRequested: () => ({
										dispose: () => {},
									}),
								}
							);

						const cacheEndTime = performance.now();
						const cacheLatency = cacheEndTime - cacheStartTime;

						this.log(
							`   ⚡ Cache test: ${cacheLatency.toFixed(1)}ms (${cacheLatency < 50 ? "GOOD" : "SLOW"})`
						);
					} catch (error) {
						this.log(`   ❌ Cache test failed: ${error}`);
					}
				}

				// Wait a bit between tests to avoid overwhelming
				await new Promise(resolve => setTimeout(resolve, 500));
			} catch (error) {
				const endTime = performance.now();
				const latency = endTime - startTime;

				this.results.push({
					position: `${testCase.line}:${testCase.char} (${testCase.desc})`,
					latency: latency,
					success: false,
				});

				this.log(`   ❌ Error: ${error}`);
			}
		}
	}

	async runFunctionCompletionTests(): Promise<void> {
		this.log("\n🏗️ Starting function completion tests...");

		// Function body completion scenarios
		const testCases = [
			{ line: 40, char: 4, desc: "🏝️ numIslands: LeetCode algorithm" },
			{ line: 44, char: 4, desc: "📈 fibonacci: mathematical function" },
		];

		// Open the test file
		const document = await vscode.workspace.openTextDocument(
			"/Users/vineethrajesh/Projects/custom-llm-autocomplete/client/src/tests/autocomplete_test.py"
		);

		for (let i = 0; i < testCases.length; i++) {
			const testCase = testCases[i];
			this.log(
				`\n📍 Function Test ${i + 1}/${testCases.length}: ${testCase.desc} (line ${testCase.line})`
			);

			const position = new vscode.Position(testCase.line, testCase.char);
			const context: vscode.InlineCompletionContext = {
				triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
				selectedCompletionInfo: undefined,
			};

			const startTime = performance.now();

			try {
				const items = await this.provider.provideInlineCompletionItems(
					document,
					position,
					context,
					{
						isCancellationRequested: false,
						onCancellationRequested: () => ({ dispose: () => {} }),
					}
				);

				const endTime = performance.now();
				const latency = endTime - startTime;

				// const breakdown = this.provider.getLastTimingBreakdown();
				const result: LatencyResult = {
					position: `${testCase.line}:${testCase.char} (${testCase.desc})`,
					latency: latency,
					success: items && items.length > 0,
					suggestion: items?.[0]?.insertText?.toString(),
					// breakdown: breakdown,
				};

				this.results.push(result);

				this.log(
					`   ⏱️  ${latency.toFixed(1)}ms - ${result.success ? "✅" : "❌"}`
				);

				// if (breakdown) {
				// 	this.log(
				// 		`   📊 Breakdown: Debounce ${breakdown.debounce.toFixed(0)}ms | Cache ${breakdown.cache.toFixed(0)}ms | Context ${breakdown.context.toFixed(0)}ms | Network ${breakdown.network.toFixed(0)}ms`
				// 	);
				// 	this.log(
				// 		`   👤 User perceived: ${breakdown.userPerceived.toFixed(0)}ms (after stopping typing)`
				// 	);
				// }

				if (result.suggestion) {
					this.log(
						`   💡 Function body: "${result.suggestion.substring(0, 100)}..."`
					);
				}

				// Wait longer between function tests as they're more complex
				await new Promise(resolve => setTimeout(resolve, 1500));
			} catch (error) {
				const endTime = performance.now();
				const latency = endTime - startTime;

				this.results.push({
					position: `${testCase.line}:${testCase.char} (${testCase.desc})`,
					latency: latency,
					success: false,
				});

				this.log(`   ❌ Error: ${error}`);
			}
		}
	}

	printSummary(): void {
		this.log("\n📊 LATENCY TEST SUMMARY");
		this.log("=".repeat(50));

		const latencies = this.results.map(r => r.latency);
		const successCount = this.results.filter(r => r.success).length;
		const failedTests = this.results.filter(r => !r.success);
		const slowTests = this.results.filter(r => r.latency > 500);
		const successfulResults = this.results.filter(
			r => r.success && r.breakdown
		);

		this.log(`Tests run: ${this.results.length}`);
		this.log(
			`Success rate: ${((successCount / this.results.length) * 100).toFixed(1)}%`
		);
		this.log(`Average latency: ${this.average(latencies).toFixed(1)}ms`);
		this.log(`Median latency: ${this.median(latencies).toFixed(1)}ms`);
		this.log(`Min latency: ${Math.min(...latencies).toFixed(1)}ms`);
		this.log(`Max latency: ${Math.max(...latencies).toFixed(1)}ms`);

		// Breakdown analysis for successful tests
		if (successfulResults.length > 0) {
			const debounceAvg = this.average(
				successfulResults.map(r => r.breakdown!.debounce)
			);
			const cacheAvg = this.average(
				successfulResults.map(r => r.breakdown!.cache)
			);
			const contextAvg = this.average(
				successfulResults.map(r => r.breakdown!.context)
			);
			const networkAvg = this.average(
				successfulResults.map(r => r.breakdown!.network)
			);
			const userPerceivedAvg = this.average(
				successfulResults.map(r => r.breakdown!.userPerceived)
			);

			this.log(`\n⚡ TIMING BREAKDOWN (successful tests)`);
			this.log(`Average debounce: ${debounceAvg.toFixed(1)}ms`);
			this.log(`Average cache lookup: ${cacheAvg.toFixed(1)}ms`);
			this.log(`Average context extraction: ${contextAvg.toFixed(1)}ms`);
			this.log(`Average network (LLM): ${networkAvg.toFixed(1)}ms`);
			this.log(
				`Average user perceived: ${userPerceivedAvg.toFixed(1)}ms`
			);
		}

		this.log("\n📋 Individual Results:");
		this.results.forEach((result, i) => {
			const status = result.success ? "✅" : "❌";
			this.log(
				`${i + 1}. ${status} ${result.latency.toFixed(1)}ms - ${result.position}`
			);
		});

		// Performance Analysis & Suggestions
		this.log("\n🔍 PERFORMANCE ANALYSIS");
		this.log("=".repeat(50));

		if (failedTests.length > 0) {
			this.log(`\n❌ Failed Tests (${failedTests.length}):`);
			failedTests.forEach((test, i) => {
				this.log(`${i + 1}. ${test.position}`);
			});

			if (failedTests.some(t => t.position.includes("math."))) {
				this.log(
					"\n💡 Suggestion: Failed math. completion indicates import context missing"
				);
				this.log(
					"   - Check if imports are being included in context for Python files"
				);
				this.log(
					"   - Verify import cache is working (uses MD5 hash of first 1000 chars)"
				);
				this.log(
					"   - Check if AST vs simple regex import extraction is working"
				);
			}
		}

		if (slowTests.length > 0) {
			this.log(`\n🐌 Slow Tests >500ms (${slowTests.length}):`);
			slowTests.forEach((test, i) => {
				this.log(
					`${i + 1}. ${test.latency.toFixed(1)}ms - ${test.position}`
				);
			});

			this.log("\n💡 Performance Suggestions:");
			this.log(
				"   - Check if context is too long (currently 4 lines: 3 before + 1 after)"
			);
			this.log("   - Verify HTTP keepAlive is working properly");
			this.log(
				"   - Monitor Ollama model loading time (keep_alive: 10m)"
			);
			this.log(
				"   - Consider if num_predict=12 is sufficient for completions"
			);
		}

		// Open the log file in VSCode
		vscode.workspace.openTextDocument(this.logFile).then(doc => {
			vscode.window.showTextDocument(doc);
		});
	}

	private average(numbers: number[]): number {
		return numbers.reduce((a, b) => a + b, 0) / numbers.length;
	}

	private median(numbers: number[]): number {
		const sorted = [...numbers].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0
			? (sorted[mid - 1] + sorted[mid]) / 2
			: sorted[mid];
	}

	private variance(numbers: number[]): number {
		const avg = this.average(numbers);
		return this.average(numbers.map(x => Math.pow(x - avg, 2)));
	}
}

// Export functions to run from command palette
export async function runLatencyTests(): Promise<void> {
	const tester = new LatencyTester();
	await tester.runTests();
}

export async function runPartialCompletionTests(): Promise<void> {
	const tester = new LatencyTester();
	await tester.runPartialCompletionTests();
	tester.printSummary();
}

export async function runFunctionCompletionTests(): Promise<void> {
	const tester = new LatencyTester();
	await tester.runFunctionCompletionTests();
	tester.printSummary();
}
