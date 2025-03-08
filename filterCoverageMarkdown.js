import fs from 'fs';

fs.readFile('code-coverage-results.md', 'utf8', (err, data) => {
  if (err) throw err;

  const lines = data.split('\n'); // Split data into lines
  const filteredLines = lines.filter((line) => !line.includes('⚪ 0%')); // Filter lines

  fs.writeFile('code-coverage-results.md', filteredLines.join('\n'), (err) => {
    if (err) throw err;
    // eslint-disable-next-line no-undef
    console.log('Filtered file has been saved!');
  });
});
