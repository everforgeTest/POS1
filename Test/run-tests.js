const { runPOSTests } = require('./TestCases/POSTest');

(async () => {
  try {
    await runPOSTests();
    console.log('All tests completed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Tests failed:', e);
    process.exit(1);
  }
})();
