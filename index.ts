// tslint:disable-next-line:no-var-requires
const { Consumer } = require("sqs-consumer");
import * as AWS from "aws-sdk";
import * as api from "./api";
import config from "./config";
import * as lib from "./lib";

interface ISQSMessage {
  Body: string;
}
// TODO: move ts to src
const queueUrl = process.env.QUEUE_URL as string;

// const messageObject = {
//   controller: "importDaysoff",
//   group: "1234",
//   pass: "2ed523df992646bf9bcfef66f75ef758",
//   source_app: "nmbrs",
//   user: "michiel.crommelinck@officient.io",
// };

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  region: config.sqs.region,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const sqs = new AWS.SQS({ endpoint: queueUrl });

const app = Consumer.create({
  handleMessage: async (message: ISQSMessage) => {
    const messageData = lib.messageToJSON(message.Body);
    if (!lib.isValidMessageData(messageData)) {
      // tslint:disable-next-line:no-console
      console.info(`Process stopped. Invalid message ${message.Body}`);
      return;
    }

    const authHeader = {
      "tns:AuthHeader": {
        "tns:Token": messageData.pass,
        "tns:Username": messageData.user,
      },
    };
    const timestamp = Date.now();

    const companiesIdsList = await api.getCompanyIdList(authHeader, config.api.CompanyServiceUrl);

    await Promise.all(companiesIdsList.map(async (companyId) => {
      const employeesIdsList = await api.getEmployeesIdsList(authHeader, config.api.EmployeeServiceUrl, companyId);
      await Promise.all(employeesIdsList.map(async (employeId) => {
        const employeAbsenceList =
          await api.getEmployeAbsenceList(authHeader, config.api.EmployeeServiceUrl, employeId);

        const employeData = lib.getEmployeData(
          messageData.group, messageData.source_app, employeId, employeAbsenceList);

        const fileName = `${messageData.group}-${messageData.source_app}-${employeId}.json`;
        await lib.saveFile(`${__dirname}/../output/${timestamp}/`, fileName, employeData);
      }));
    }));
  },
  queueUrl,
  sqs,
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

// Uncomment below two lines to send test message to the queue
const messageCommand = "{'source_app' => 'nmbrs', 'user' => 'michiel.crommelinck@officient.io', 'pass' => '2ed523df992646bf9bcfef66f75ef758', 'group' => 1234, 'controller' => 'importDaysoff',}";
lib.sendMessage(sqs, queueUrl, messageCommand);
