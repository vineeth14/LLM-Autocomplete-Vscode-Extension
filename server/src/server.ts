import log from "./log";
import { initialize } from "./methods/initialize";
import { completion } from "./methods/textDocument/completion";

export interface RequestMessage extends Message {
  id: number | string;
  method: string;
  params?: unknown[] | object;
}

interface Message {
  jsonrpc: string;
}

type RequestMethod = (message: RequestMessage) => unknown;

const methodLookup: Record<string, RequestMethod> = {
  initialize,
  "textDocument/completion": completion,
};

// Write a json rpc message to client
const respond = (id: RequestMessage["id"], result: unknown) => {
  const message = JSON.stringify({ id, result });
  const messageLength = Buffer.byteLength(message, "utf-8");
  const header = `Content-Length: ${messageLength}\r\n\r\n`;
  log.write(header + message); //Write to log
  process.stdout.write(header + message); // Send json rpc method to client
};

let buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    const lengthMatch = buffer.match(/Content-Length: (\d+)\r\n/);
    if (!lengthMatch) break;
    const contentLength = parseInt(lengthMatch[1], 10);
    const messageStart = buffer.indexOf("\r\n\r\n") + 4;

    //break if the full message is not in buffer
    if (buffer.length < messageStart + contentLength) break;
    const rawMessage = buffer.slice(messageStart, messageStart + contentLength);
    const message = JSON.parse(rawMessage);

    log.write({ id: message.id, method: message.method });

    const method = methodLookup[message.method];
    if (method) {
      respond(message.id, method(message));
    }

    //Remove processed message from buffer
    buffer = buffer.slice(messageStart + contentLength);
  }
});
