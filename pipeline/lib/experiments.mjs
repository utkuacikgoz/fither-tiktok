const PLACEHOLDER = /^(?:—|-|tbd|pending)?$/i;
const REQUIRED = ["Week opened", "Status", "Hypothesis", "Metric", "Decision rule", "Result", "Decision"];
const STATUSES = new Set(["running", "decided", "void"]);

export function parseExperiments(markdown) {
  const experiments = [];
  const headings = [...markdown.matchAll(/^##\s+(EXP-\d{3})\s+—\s+(.+)$/gm)];
  for (const [index, match] of headings.entries()) {
    const fields = {};
    let active = null;
    const bodyStart = match.index + match[0].length;
    const bodyEnd = headings[index + 1]?.index ?? markdown.length;
    for (const line of markdown.slice(bodyStart, bodyEnd).split("\n")) {
      const field = /^- \*\*(.+?)\*\*:\s*(.*)$/.exec(line);
      if (field) {
        active = field[1];
        fields[active] = field[2].trim();
      } else if (active && /^\s{2,}\S/.test(line)) {
        fields[active] = `${fields[active]} ${line.trim()}`.trim();
      } else if (line.trim()) {
        active = null;
      }
    }
    experiments.push({ id: match[1], title: match[2].trim(), fields });
  }
  return experiments;
}

export function validateExperiments(markdown, performanceRows = []) {
  const experiments = parseExperiments(markdown);
  const errors = [];
  const seen = new Set();
  const perWeek = new Map();
  const latestPerformanceWeek = performanceRows.reduce((latest, row) => Math.max(latest, Number(row.week) || 0), 0);

  if (!experiments.length) errors.push("experiment registry has no EXP-NNN records");
  for (const experiment of experiments) {
    if (seen.has(experiment.id)) errors.push(`${experiment.id}: duplicate id`);
    seen.add(experiment.id);
    for (const field of REQUIRED) {
      if (!(field in experiment.fields)) errors.push(`${experiment.id}: missing ${field}`);
    }
    const week = experiment.fields["Week opened"];
    const status = String(experiment.fields.Status ?? "").toLowerCase();
    if (!/^(0[1-9]|[1-4]\d|5[0-3])$/.test(week ?? "")) errors.push(`${experiment.id}: Week opened must be 01-53`);
    if (!STATUSES.has(status)) errors.push(`${experiment.id}: invalid status "${experiment.fields.Status ?? ""}"`);
    if (!/\d/.test(experiment.fields["Decision rule"] ?? "")) errors.push(`${experiment.id}: decision rule needs a numeric threshold`);
    if (status === "running") {
      if (!PLACEHOLDER.test(experiment.fields.Result ?? "")) errors.push(`${experiment.id}: running experiments must not have a result`);
      if (!PLACEHOLDER.test(experiment.fields.Decision ?? "")) errors.push(`${experiment.id}: running experiments must not have a decision`);
      if ((Number(week) || 0) < latestPerformanceWeek) {
        errors.push(`${experiment.id}: still running after Week ${week} performance arrived; close it before planning again`);
      }
    }
    if (status === "decided") {
      if (PLACEHOLDER.test(experiment.fields.Result ?? "")) errors.push(`${experiment.id}: decided experiments need a result`);
      if (PLACEHOLDER.test(experiment.fields.Decision ?? "")) errors.push(`${experiment.id}: decided experiments need a decision`);
    }
    // A void experiment is a record of a test that never ran, so it is not
    // one of the week's tests. The 1-3 guard exists to catch a week that is
    // coasting or making noise, and a voided record is neither.
    if (status !== "void") {
      if (!perWeek.has(week)) perWeek.set(week, 0);
      perWeek.set(week, perWeek.get(week) + 1);
    }
  }
  for (const [week, count] of perWeek) {
    if (count < 1 || count > 3) errors.push(`Week ${week}: expected 1-3 live experiments, found ${count}`);
  }
  return { experiments, errors };
}
