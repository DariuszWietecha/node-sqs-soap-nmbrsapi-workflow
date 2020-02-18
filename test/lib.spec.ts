import assert = require("assert");
import * as nock from "nock";
import * as lib from "../lib";
import * as config from "../config";
import * as path from "path";
import * as fs from "fs";
// tslint:disable-next-line:no-var-requires
const rimraf = require('rimraf');

const message = {
  Body: "{'source_app' => 'nmbrs', 'user' => 'michiel.crommelinck@officient.io', 'pass' => '2ed523df992646bf9bcfef66f75ef758', 'group' => 1234, 'controller' => 'importDaysoff',}",
}

const configMock: config.IConfig = {
  api: {
    CompanyServiceUrl: "https://api.nmbrs.nl/soap/v2.1/CompanyService.asmx?WSDL",
    EmployeeServiceUrl: "https://api.nmbrs.nl/soap/v2.1/EmployeeService.asmx?WSDL",
  },
  sqs: {
    region: "eu-west-1",
  },
  outputDir: "test/output",
};

const soapApiHost = "https://api.nmbrs.nl";
const soapApiPathCS = "/soap/v2.1/CompanyService.asmx";
const soapApiPathES = "/soap/v2.1/EmployeeService.asmx";

const ServiceNock = nock(soapApiHost);
const CompanyServiceNockListGetAll = nock(soapApiHost, {
  reqheaders: {
    soapaction: `"${soapApiHost}/soap/v2.1/CompanyService/List_GetAll"`
  }
});
const EmployeeServiceNockListGetByCompany = nock(soapApiHost, {
  reqheaders: {
    soapaction: `"${soapApiHost}/soap/v2.1/EmployeeService/List_GetByCompany"`
  }
});
const EmployeeServiceNockAbsenceGetList = nock(soapApiHost, {
  reqheaders: {
    soapaction: `"${soapApiHost}/soap/v2.1/EmployeeService/Absence_GetList"`
  }
});

function emptyOutputDir(rootDirectoryPath: string): void {
  const directoriesList = fs.readdirSync(rootDirectoryPath);
  directoriesList.map((directory) => {
    const directoryContent = fs.readdirSync(`${rootDirectoryPath}/${directory}`);
    directoryContent.map((file) => {
      fs.unlinkSync(`${rootDirectoryPath}/${directory}/${file}`);
    })
    fs.rmdirSync(`${rootDirectoryPath}/${directory}`);
  })
}

after(() => {
  nock.cleanAll();
});

afterEach(() => {
  ServiceNock.done();
  emptyOutputDir(`${__dirname}/output`);
});

describe("lib", () => {
  describe("handleMessage", () => {
    it("successful run, generate required output data", () => {
      ServiceNock
        .get(soapApiPathCS + "?WSDL")
        .replyWithFile(200, path.join(__dirname, "./data/CompanyService-wsdl.xml"));
      CompanyServiceNockListGetAll
        .post(soapApiPathCS)
        .replyWithFile(200, path.join(__dirname, "./data/ListGetAll.xml"));

      ServiceNock
        .get(soapApiPathES + "?WSDL")
        .replyWithFile(200, path.join(__dirname, "./data/EmployeeService-wsdl.xml"));
      EmployeeServiceNockListGetByCompany
        .post(soapApiPathES)
        .replyWithFile(200, path.join(__dirname, "./data/ListGetByCompany.xml"));
      EmployeeServiceNockAbsenceGetList
        .post(soapApiPathES)
        .replyWithFile(200, path.join(__dirname, "./data/AbsenceGetList-503293.xml"));
      EmployeeServiceNockAbsenceGetList
        .post(soapApiPathES)
        .replyWithFile(200, path.join(__dirname, "./data/AbsenceGetList-503294.xml"));


      return lib.handleMessage(configMock, message)
        .then(() => {
          const directoryOutputContent = fs.readdirSync(`${__dirname}/output`);

          directoryOutputContent.map((directory) => {
            const directoryContent = fs.readdirSync(`${__dirname}/output/${directory}`);

            const file1 = require(`${__dirname}/output/${directory}/${directoryContent[0]}`) as lib.IEmployeData;
            assert.equal(file1.group_id, 1234);

            assert.equal(file1.historical_days_off[0].data.day_off_name, "Ziekte");
            assert.equal(file1.historical_days_off[0].data.duration_minutes, 0);
            assert.equal(file1.historical_days_off[0].data.internal_code, 62101);
            assert.equal(file1.historical_days_off[0].data.type_company_holiday, 0);
            assert.equal(file1.historical_days_off[0].data.type_holiday, 1);
            assert.equal(file1.historical_days_off[0].data.type_work, 0);
            assert.equal(Date.parse(file1.historical_days_off[0].date), 1502402400000);
            assert.equal(file1.historical_days_off[1].data.day_off_name, "Ziekte");
            assert.equal(file1.historical_days_off[1].data.duration_minutes, 7200);
            assert.equal(file1.historical_days_off[1].data.internal_code, 62075);
            assert.equal(file1.historical_days_off[1].data.type_company_holiday, 0);
            assert.equal(file1.historical_days_off[1].data.type_holiday, 1);
            assert.equal(file1.historical_days_off[1].data.type_work, 0);
            assert.equal(Date.parse(file1.historical_days_off[1].date), 1515020400000);

            assert.equal(file1.source_app, "nmbrs");
            assert.equal(file1.source_app_internal_id, 503293);

            const file2 = require(`${__dirname}/output/${directory}/${directoryContent[1]}`) as lib.IEmployeData;
            assert.equal(file2.group_id, 1234);

            assert.equal(file2.historical_days_off[0].data.day_off_name, "Ziekte");
            assert.equal(file2.historical_days_off[0].data.duration_minutes, 501120);
            assert.equal(file2.historical_days_off[0].data.internal_code, 55283);
            assert.equal(file2.historical_days_off[0].data.type_company_holiday, 0);
            assert.equal(file2.historical_days_off[0].data.type_holiday, 1);
            assert.equal(file2.historical_days_off[0].data.type_work, 0);
            assert.equal(Date.parse(file2.historical_days_off[0].date), 1501711200000);

            assert.equal(file2.source_app, "nmbrs");
            assert.equal(file2.source_app_internal_id, 503294);
          });

        }, () => {
          assert.fail("Promise rejected when it should have been resolved");
        });
    })
      .timeout(100000);
  });
});