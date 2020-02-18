import * as AWS from "aws-sdk";
import { fromNullable } from "fp-ts/lib/Option";
import * as fs from "fs";
import * as path from "path";
import * as api from "./api";
import { IConfig } from "./config";

export interface ISQSMessage {
  Body: string;
}

interface IMessageObject {
  controller: string;
  group: number;
  pass: string;
  source_app: string;
  user: string;
}

export interface IEmployeData {
  group_id: string;
  source_app: string;
  source_app_internal_id: number;
  historical_days_off: ICalendar[];
}

interface ICalendar {
  date: string;
  data: {
    duration_minutes: number;
    day_off_name: string;
    internal_code: number;
    type_work: number;
    type_company_holiday: number;
    type_holiday: number;
  };
}

function getCalendar(absence: api.IAbsenceItem[]): ICalendar[] {
  return absence.map((absenceItem) => {
    return {
      data: {
        day_off_name: absenceItem.Dossier,
        duration_minutes: getDuration(absenceItem.AbsenceId, absenceItem.Start, absenceItem.End),
        internal_code: absenceItem.Dossiernr,
        type_company_holiday: 0,
        type_holiday: 1,
        type_work: 0,
      },
      date: absenceItem.Start,
    };
  });
}

function getDuration(absenceId: number, start: string, end?: string): number {
  return fromNullable(end)
    .map((e) => {
      const sDate = new Date(start);
      const eDate = new Date(e);
      const diffMs = (eDate.getTime() - sDate.getTime());
      return Math.round(diffMs / 60000);
    })
    .getOrElseL(() => {
      // tslint:disable-next-line:no-console
      console.warn(`AbsenceId: ${absenceId}, end not available, duration can't be calculated, it was set to 0`);
      return 0;
    });
}

function getEmployeData(
  groupId: number, sourceApp: string, sourceAppInternalId: number, absence: api.IAbsenceItem[]): IEmployeData {
  return {
    group_id: groupId.toString(),
    historical_days_off: getCalendar(absence),
    source_app: sourceApp,
    source_app_internal_id: sourceAppInternalId,
  };
}

export async function handleMessage(config: IConfig, message: ISQSMessage): Promise<void> {
  const messageData = messageToJSON(message.Body);
  if (!isValidMessageData(messageData)) {
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

  const companySoapClient = await api.createSoapClient(authHeader, config.api.CompanyServiceUrl) as api.ISoapCompanyServiceClient;
  const companiesIdsList = await api.getCompanyIdList(companySoapClient);

  const employeesSoapClient = await api.createSoapClient(authHeader, config.api.EmployeeServiceUrl) as api.ISoapEmployeeServiceClient;
  await Promise.all(companiesIdsList.map(async (companyId) => {
    const employeesIdsList = await api.getEmployeesIdsList(employeesSoapClient, companyId);
    await Promise.all(employeesIdsList.map(async (employeId) => {
      const employeAbsenceList =
        await api.getEmployeAbsenceList(employeesSoapClient, employeId);

      const employeData = getEmployeData(
        messageData.group, messageData.source_app, employeId, employeAbsenceList);

      const fileName = `${messageData.group}-${messageData.source_app}-${employeId}.json`;
      await saveFile(`${__dirname}/../${config.outputDir}/${timestamp}/`, fileName, employeData);
    }));
  }));
}

export function isValidMessageData(messageData: IMessageObject): boolean {
  return messageData.group === 1234 &&
    messageData.source_app === "nmbrs" &&
    messageData.controller === "importDaysoff";
}

export function messageToJSON(message: string): IMessageObject {
  const step1 = message
    .replace(/'/g, '"')
    .replace(/=>/g, ":")
    .split(",");

  const step2 = step1.reduce((acc, item, index, array) => {
    return (acc + ((index + 1) === array.length ? "" : ",") + item);
  });

  return JSON.parse(step2);
}

export async function saveFile(directoryPath: string, fileName: string, employeData: IEmployeData): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(directoryPath, { recursive: true });
    fs.writeFile(`${directoryPath}/${fileName}`, JSON.stringify(employeData),
      (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
  });
}

export function sendMessage(sqs: AWS.SQS, queueUrl: string, MessageBody: string): void {
  const params = {
    MessageBody,
    QueueUrl: queueUrl,
  };

  sqs.sendMessage(params, (err, data) => {
    if (err) {
      // tslint:disable-next-line:no-console
      console.error(err, err.stack);
    } else {
      // tslint:disable-next-line:no-console
      console.info(`Message:\n${params.MessageBody}\nsent:\n${JSON.stringify(data)}`);
    }
  });
}
