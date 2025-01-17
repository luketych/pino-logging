import { Writable } from 'stream';
import chai from 'chai';
import { describe, it, before } from 'mocha';
import { pinoLoggerCreate } from '#src';

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';

const expect = chai.expect;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MAX_TIMEOUT = 10000;


describe("Create instance of PinoLogger and test its basic formatter.", function () {
  let basicPinoStreamLogger, basicPinoFileLogger, logs;


  before(async function () {
    this.timeout(MAX_TIMEOUT);
  
    // Ensure log directory exists
    const logDir = path.resolve(__dirname, '../logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  
    // Initialize logs array
    logs = [];
  
    // Create custom writable stream
    const logStream = new Writable({
      write(chunk, encoding, callback) {
        console.log('Stream received chunk:', chunk.toString());
        try {
          const parsed = JSON.parse(chunk.toString());
          logs.push(parsed);
        } catch (err) {
          console.error('Parse error:', err);
          console.error('Raw chunk:', chunk.toString());
        }
        callback();
      },
    });
    
    basicPinoStreamLogger = await pinoLoggerCreate(import.meta.url, { formatterType: 'basic', stream: logStream });
    basicPinoFileLogger = await pinoLoggerCreate(import.meta.url, { formatterType: 'basic', destination: path.join(logDir, 'info.log') });
  
    console.log('Loggers created.');
  });


  it("tests the basic formatter.", async function () {
    this.timeout(MAX_TIMEOUT);

    // Clear logs before test
    logs = [];

    // Log a test message
    basicPinoStreamLogger.info({
      msg: "This is a test message.",
    });

    // Wait longer for logs to flush
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(logs.length).to.be.greaterThan(0, 'No logs were captured');

    // Assert directly on the parsed log message
    const loggedMessage = logs[0];
    expect(loggedMessage.msg).to.equal("This is a test message.");
    expect(loggedMessage.level).to.equal(30); // 30 is the level for "info"
  });

  it("tests the basic formatter with a structured object.", async function () {
    this.timeout(MAX_TIMEOUT);

    // Clear logs before test
    logs = [];

    // Log a structured object
    basicPinoStreamLogger.info({
      structuredObj: {
        foo: "bar",
      },
    });

    // Wait longer for logs to flush
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(logs.length).to.be.greaterThan(0, 'No logs were captured');

    // Assert directly on the parsed log message
    const loggedMessage = logs[0];
    expect(loggedMessage.structuredObj).to.be.an("object");
    expect(loggedMessage.structuredObj.foo).to.equal("bar");
    expect(loggedMessage.level).to.equal(30); // 30 is the level for "info"
  });

  it("tests basic formatter logging to a file.", async function () {
    this.timeout(MAX_TIMEOUT);
  
    const logFilePath = path.resolve(__dirname, '../logs/info.log');
  
    // Log a message
    basicPinoFileLogger.info({
      msg: "File test message.",
    });
  
    // Wait for logs to flush
    await new Promise((resolve) => setTimeout(resolve, 500));
  
    // Read the log file content
    const logContent = await fs.readFile(logFilePath, 'utf8');
    const logLines = logContent.split('\n').filter((line) => line); // Remove empty lines
    expect(logLines.length).to.be.greaterThan(0, 'No logs were captured in the file');
  
    // Validate the first log entry
    const loggedMessage = JSON.parse(logLines[0]);
    expect(loggedMessage.msg).to.equal("File test message.");
    expect(loggedMessage.level).to.equal(30); // 30 is the level for "info"
  });


  after(async function () {
    this.timeout(MAX_TIMEOUT);

    const logFilePath = path.resolve(__dirname, '../logs/info.log');
    if (existsSync(logFilePath)) {
      await fs.unlink(logFilePath);
    }
  });
});