import { RequestMessage } from "../../server";
import * as fs from "fs";

const words = fs.readFileSync("/usr/share/dict/words").toString().split("\n");
const items = words.map((word) => {
  return { label: word };
});
type CompletionItem = {
  label: string;
};

interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

export const completion = (message: RequestMessage): CompletionList => {
  return {
    isIncomplete: false,
    items,
  };
};
