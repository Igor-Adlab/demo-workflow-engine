export interface IWorkflowRunner {
  listen(): Promise<void>;
}

export interface WorkflowRunnerCronSchedule {
  name: string;
  handler: () => void;
  schedule: string | Deno.CronSchedule;
}
