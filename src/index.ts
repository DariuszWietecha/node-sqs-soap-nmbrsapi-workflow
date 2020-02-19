// tslint:disable-next-line:no-var-requires
const { Consumer } = require("sqs-consumer");
import * as AWS from "aws-sdk";
import { config } from "./config";
import * as lib from "./lib";
import { fromNullable } from "fp-ts/lib/Option";
import * as api from "./api";

const queueUrl = fromNullable(process.env.SQS_URL)
  .ap(fromNullable(process.env.QUEUE_NAME)
    .map((qN) => (qU) => `${qU}/queue/${qN}`))
  .getOrElseL(() => {
    throw new Error("Queue url or name not available in .env");
  });

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: process.env.AWS_REGION,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const sqs = new AWS.SQS({ endpoint: queueUrl });

(async () => {
  const companySoapClient = await api.createSoapClient(config.api.CompanyServiceUrl) as api.ISoapCompanyServiceClient;
  const employeesSoapClient = await api.createSoapClient(config.api.EmployeeServiceUrl) as api.ISoapEmployeeServiceClient;

  const app = Consumer.create({
  handleMessage: async (message: lib.ISQSMessage) => lib.handleMessage(config, companySoapClient, employeesSoapClient, message),
    queueUrl,
    sqs,
  });

  app.on("message_processed", (message: lib.ISQSMessage) => {
    // tslint:disable-next-line:no-console
    console.info(`Message:\n${message.Body}\nwas processed.`);
  });

  app.on("error", (err: Error) => {
    // tslint:disable-next-line:no-console
    console.error(err.message);
  });

  app.on("processing_error", (err: Error) => {
    // tslint:disable-next-line:no-console
    console.error(err.message);
  });

  app.on("timeout_error", (err: Error) => {
    // tslint:disable-next-line:no-console
    console.error(err.message);
  });

  app.start();
})()

// tslint:disable-next-line:max-line-length
// const messageCommand = "{'source_app' => 'nmbrs', 'user' => 'michiel.crommelinck@officient.io', 'pass' => '2ed523df992646bf9bcfef66f75ef758', 'group' => 1234, 'controller' => 'importDaysoff',}";
// lib.sendMessage(sqs, queueUrl, messageCommand);
// Uncomment above two lines to send test message to the queue
