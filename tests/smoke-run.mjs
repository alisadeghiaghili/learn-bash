import { Shell } from '../src/bash/shell.js';
import { buildFS } from '../src/bash/fs.js';
import { LEVELS, checkLevel, golfScore } from '../src/level/levels.js';

const solutions = {
  'b1-pwd': ['pwd'],
  'b2-ls': ['ls'],
  'b3-cd': ['cd notes'],
  'b4-echo': ['echo hello bash'],
  'b5-vars': ['NAME=ada', 'echo hello $NAME'],
  'f1-touch': ['touch report.txt'],
  'f2-mkdir': ['mkdir src', 'cd src'],
  'f3-mv': ['mv draft.txt final.txt'],
  'f4-cp-rm': ['cp notes/todo.txt todo.copy', 'rm -r notes'],
  't1-cat': ['cat notes/todo.txt'],
  't2-redirect': ['echo done > status.txt'],
  't3-append': ['echo second >> log.txt'],
  't4-wc': ['wc -l notes/book.txt'],
  't5-sort': ['sort data/nums.txt > sorted.txt'],
  's1-pipe': ['cat notes/todo.txt | wc -l'],
  's2-grep': ['grep pipes notes/todo.txt'],
  's3-stderr': ['cat missing.txt 2> err.txt'],
  's4-chain': ['cat notes/book.txt | grep e | wc -l'],
  'q1-glob': ['ls data/*.txt'],
  'q2-quotes': ["echo '$USER is unknown'"],
  'q3-cmdsub': ['wc -l < notes/todo.txt > count.txt'],
  'c1-exit': ['grep pipes notes/todo.txt && touch ok.txt'],
  'c2-test': ['if [ -f notes/todo.txt ]; then touch present.txt; fi'],
  'c3-for': ['for x in p q r; do touch $x.txt; done'],
  'c4-arith': ['N=2', 'echo $((N * 4))'],
  'x1-report': ['mkdir -p out', 'echo ok > out/summary.txt'],
  'x2-pipeline-report': ['grep e notes/book.txt > hits.txt'],
  'x3-script': [
    'echo echo building > build.sh',
    'echo touch built.txt >> build.sh',
    'bash build.sh',
  ],
};

for (const level of LEVELS) {
  process.stdout.write(`>> ${level.id} ... `);
  const cmds = solutions[level.id];
  const shell = new Shell(buildFS(level.seed.tree), {
    cwd: level.seed.cwd,
    home: level.seed.home,
  });
  const traces = [];
  for (const c of cmds) {
    process.stdout.write(`\n   cmd ${JSON.stringify(c)} `);
    const t = shell.execute(c);
    process.stdout.write(`code=${t.code} `);
    traces.push(t);
  }
  const { ok, failures } = checkLevel(level, shell, traces);
  const g = golfScore(traces);
  console.log(ok ? `OK golf=${g}` : `FAIL ${failures.join('; ')} golf=${g}`);
}
console.log('ALL DONE');
