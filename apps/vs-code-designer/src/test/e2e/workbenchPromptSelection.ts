export interface WorkbenchPrompt {
  matchText: string;
  optionText: string;
  postClickDelayMs?: number;
}

export interface WorkbenchPromptPoint {
  x: number;
  y: number;
}

export interface WorkbenchPromptOption {
  text: string;
  point?: WorkbenchPromptPoint;
}

export interface WorkbenchPromptContainer {
  kind: 'quickInput' | 'dialog' | 'notification';
  text: string;
  buttons: WorkbenchPromptOption[];
  rows: WorkbenchPromptOption[];
}

export interface WorkbenchPromptSelection {
  visible: boolean;
  text: string;
  targetText?: string;
  point?: WorkbenchPromptPoint;
  postClickDelayMs?: number;
}

export function selectWorkbenchPromptOption(prompts: WorkbenchPrompt[], containers: WorkbenchPromptContainer[]): WorkbenchPromptSelection {
  for (const container of containers) {
    const prompt = prompts.find((candidate) => includesNormalized(container.text, candidate.matchText));
    if (!prompt) {
      continue;
    }

    const exactButton = container.buttons.find((button) => equalsNormalized(button.text, prompt.optionText));
    if (exactButton?.point) {
      return {
        visible: true,
        text: container.text,
        targetText: exactButton.text,
        point: exactButton.point,
        postClickDelayMs: prompt.postClickDelayMs,
      };
    }

    if (container.kind === 'quickInput') {
      const row = container.rows.find((candidate) => includesNormalized(candidate.text, prompt.optionText));
      if (row?.point) {
        return {
          visible: true,
          text: container.text,
          targetText: row.text,
          point: row.point,
          postClickDelayMs: prompt.postClickDelayMs,
        };
      }
    }

    return { visible: true, text: container.text };
  }

  return { visible: false, text: '' };
}

function normalize(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function equalsNormalized(actual: string, expected: string): boolean {
  return normalize(actual) === normalize(expected);
}

function includesNormalized(actual: string, expected: string): boolean {
  return normalize(actual).includes(normalize(expected));
}
