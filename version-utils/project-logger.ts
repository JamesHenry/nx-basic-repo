// TODO: Fix these before merging
/* eslint-disable @nx/enforce-module-boundaries,@typescript-eslint/no-restricted-imports */
// TODO: replace this with picocolors
import chalk from 'chalk';
import { output } from 'nx/src/devkit-exports';

const colors = [
  { instance: chalk.green, spinnerColor: 'green' },
  { instance: chalk.greenBright, spinnerColor: 'green' },
  { instance: chalk.red, spinnerColor: 'red' },
  { instance: chalk.redBright, spinnerColor: 'red' },
  { instance: chalk.cyan, spinnerColor: 'cyan' },
  { instance: chalk.cyanBright, spinnerColor: 'cyan' },
  { instance: chalk.yellow, spinnerColor: 'yellow' },
  { instance: chalk.yellowBright, spinnerColor: 'yellow' },
  { instance: chalk.magenta, spinnerColor: 'magenta' },
  { instance: chalk.magentaBright, spinnerColor: 'magenta' },
] as const;

function getColor(projectName: string) {
  let code = 0;
  for (let i = 0; i < projectName.length; ++i) {
    code += projectName.charCodeAt(i);
  }
  const colorIndex = code % colors.length;

  return colors[colorIndex];
}

export class ProjectLogger {
  private logs: string[] = [];
  private color: (typeof colors)[number];

  constructor(private projectName: string) {
    this.color = getColor(projectName);
  }

  buffer(msg: string) {
    this.logs.push(msg);
  }

  flush() {
    // Don't slow down or add noise to unit tests output unnecessarily
    if (
      process.env.JEST_WORKER_ID !== undefined ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }

    output.logSingleLine(
      `Running release version for project: ${this.color.instance.bold(
        this.projectName
      )}`
    );
    this.logs.forEach((msg) => {
      console.log(this.color.instance.bold(this.projectName) + ' ' + msg);
    });
  }
}
