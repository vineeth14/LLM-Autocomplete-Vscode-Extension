import * as vscode from 'vscode';
import * as fs from 'fs';
import { LLMInlineCompletionProvider } from './LLMInlineCompletionProvider';

interface LatencyResult {
  position: string;
  latency: number;
  success: boolean;
  suggestion?: string;
}

export class LatencyTester {
  private provider = new LLMInlineCompletionProvider();
  private results: LatencyResult[] = [];
  private logFile = '/tmp/llm-latency-test.log';

  private log(message: string): void {
    fs.appendFileSync(this.logFile, message + '\n');
  }

  async runTests(): Promise<void> {
    // Reset log file
    fs.writeFileSync(this.logFile, '🚀 LLM Latency Test Results\n' + '='.repeat(50) + '\n\n');
    
    this.log('🚀 Starting latency tests...');
    
    // Test positions in autocomplete_test.py - INCOMPLETE code for real autocomplete scenarios
    const testCases = [
      // Basic completion tests
      { line: 8, char: 20, desc: "module attr: 'math.'" },
      { line: 9, char: 27, desc: "expression end: '* '" }, 
      { line: 10, char: 11, desc: "return value: 'return '" },
      { line: 15, char: 14, desc: "for iterator: 'for num in '" },
      { line: 16, char: 15, desc: "comparison: 'if num > '" },
      { line: 17, char: 19, desc: "assignment: 'total += '" },
      { line: 18, char: 11, desc: "return stmt: 'return '" },
      { line: 23, char: 12, desc: "condition: 'if n <= '" },
      { line: 24, char: 15, desc: "return val: 'return '" },
      { line: 25, char: 41, desc: "function call: '+ '" },
      { line: 30, char: 19, desc: "range call: 'range('" },
      { line: 32, char: 21, desc: "array compare: '> '" },
      { line: 33, char: 39, desc: "tuple assign: '= '" },
      { line: 39, char: 28, desc: "func param: 'calculate_area('" },
      
      // Progressive function completion tests - EMPTY functions
      { line: 39, char: 4, desc: "🏝️ numIslands: empty function body" },
      { line: 42, char: 43, desc: "📈 fibonacci: empty function body" },
    ];

    // Open the test file
    const document = await vscode.workspace.openTextDocument('/Users/vineethrajesh/Projects/custom-llm-autocomplete/tests/autocomplete_test.py');
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      this.log(`\n📍 Test ${i + 1}/${testCases.length}: ${testCase.desc} (line ${testCase.line})`);
      
      const position = new vscode.Position(testCase.line, testCase.char);
      const context: vscode.InlineCompletionContext = {
        triggerKind: vscode.InlineCompletionTriggerKind.Automatic,
        selectedCompletionInfo: undefined
      };
      
      const startTime = performance.now();
      
      try {
        const items = await this.provider.provideInlineCompletionItems(
          document,
          position,
          context,
          { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) }
        );
        
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        const result: LatencyResult = {
          position: `${testCase.line}:${testCase.char} (${testCase.desc})`,
          latency: latency,
          success: items && items.length > 0,
          suggestion: items?.[0]?.insertText?.toString()
        };
        
        this.results.push(result);
        
        this.log(`   ⏱️  ${latency.toFixed(1)}ms - ${result.success ? '✅' : '❌'}`);
        if (result.suggestion) {
          this.log(`   💡 "${result.suggestion.substring(0, 50)}..."`);
        }
        
        // Wait a bit between tests to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        const endTime = performance.now();
        const latency = endTime - startTime;
        
        this.results.push({
          position: `${testCase.line}:${testCase.char} (${testCase.desc})`,
          latency: latency,
          success: false
        });
        
        this.log(`   ❌ Error: ${error}`);
      }
    }
    
    this.printSummary();
  }

  private printSummary(): void {
    this.log('\n📊 LATENCY TEST SUMMARY');
    this.log('=' .repeat(50));
    
    const latencies = this.results.map(r => r.latency);
    const successCount = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success);
    const slowTests = this.results.filter(r => r.latency > 500);
    
    this.log(`Tests run: ${this.results.length}`);
    this.log(`Success rate: ${((successCount / this.results.length) * 100).toFixed(1)}%`);
    this.log(`Average latency: ${this.average(latencies).toFixed(1)}ms`);
    this.log(`Median latency: ${this.median(latencies).toFixed(1)}ms`);
    this.log(`Min latency: ${Math.min(...latencies).toFixed(1)}ms`);
    this.log(`Max latency: ${Math.max(...latencies).toFixed(1)}ms`);
    
    this.log('\n📋 Individual Results:');
    this.results.forEach((result, i) => {
      const status = result.success ? '✅' : '❌';
      this.log(`${i + 1}. ${status} ${result.latency.toFixed(1)}ms - ${result.position}`);
    });

    // Performance Analysis & Suggestions
    this.log('\n🔍 PERFORMANCE ANALYSIS');
    this.log('=' .repeat(50));
    
    if (failedTests.length > 0) {
      this.log(`\n❌ Failed Tests (${failedTests.length}):`);
      failedTests.forEach((test, i) => {
        this.log(`${i + 1}. ${test.position}`);
      });
      
      if (failedTests.some(t => t.position.includes("math."))) {
        this.log('\n💡 Suggestion: Failed math. completion indicates import context missing');
        this.log('   - Check if imports are being included in context for cursor >10 lines from top');
        this.log('   - Verify AST-based import extraction is working');
      }
    }

    if (slowTests.length > 0) {
      this.log(`\n🐌 Slow Tests >500ms (${slowTests.length}):`);
      slowTests.forEach((test, i) => {
        this.log(`${i + 1}. ${test.latency.toFixed(1)}ms - ${test.position}`);
      });
      
      this.log('\n💡 Performance Suggestions:');
      this.log('   - Consider reducing num_predict parameter (currently 25)');
      this.log('   - Check if context is too long (imports + local context)');
      this.log('   - Verify HTTP keepAlive is working properly');
      this.log('   - Monitor Ollama model loading time');
    }

    const avgLatency = this.average(latencies);
    if (avgLatency > 300) {
      this.log('\n⚠️  High Average Latency:');
      this.log(`   Current: ${avgLatency.toFixed(1)}ms | Target: <250ms`);
      this.log('   - Consider optimizing model parameters');
      this.log('   - Check system resources (CPU/Memory)');
      this.log('   - Verify Ollama is running locally');
    }

    const varianceLatency = this.variance(latencies);
    if (varianceLatency > 50000) { // High variance threshold
      this.log('\n📊 High Latency Variance:');
      this.log(`   Std Dev: ${Math.sqrt(varianceLatency).toFixed(1)}ms`);
      this.log('   - Inconsistent performance detected');
      this.log('   - Check for model warm-up delays');
      this.log('   - Consider request caching improvements');
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

// Export function to run from command palette
export async function runLatencyTests(): Promise<void> {
  const tester = new LatencyTester();
  await tester.runTests();
}