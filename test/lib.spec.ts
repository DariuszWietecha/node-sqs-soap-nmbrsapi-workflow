import assert = require("assert");
import * as nock from "nock";
import * as lib from "../src/lib";
import * as config from "../src/config";
import * as path from "path";
import * as fs from "fs";
import * as api from "../src/api";

describe("lib", () => {
  const message = {
    Body: "{'source_app' => 'nmbrs', 'user' => 'michiel.crommelinck@officient.io', 'pass' => '2ed523df992646bf9bcfef66f75ef758', 'group' => 1234, 'controller' => 'importDaysoff',}",
  }

  const configMock: config.IConfig = {
    api: {
      CompanyServiceUrl: `${__dirname}/data/CompanyService-wsdl.xml`,
      EmployeeServiceUrl: `${__dirname}/data/EmployeeService-wsdl.xml`,
    },
    sqs: {
      region: "eu-west-1",
    },
    outputDir: "test/output",
  };

  let companySoapClient: api.ISoapCompanyServiceClient;
  let employeesSoapClient: api.ISoapEmployeeServiceClient;

  const soapApiHost = "https://api.nmbrs.nl";
  const soapApiPathCS = "/soap/v2.1/CompanyService.asmx";
  const soapApiPathES = "/soap/v2.1/EmployeeService.asmx";

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

  before(async () => {
    companySoapClient = await api.createSoapClient(configMock.api.CompanyServiceUrl) as api.ISoapCompanyServiceClient;
    employeesSoapClient = await api.createSoapClient(configMock.api.EmployeeServiceUrl) as api.ISoapEmployeeServiceClient;
  })

  after(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    CompanyServiceNockListGetAll.done();
    EmployeeServiceNockListGetByCompany.done();
    EmployeeServiceNockAbsenceGetList.done();
    emptyOutputDir(`${__dirname}/output`);
  });

  describe("handleMessage", () => {
    it("successful run, generate required output data", () => {
      CompanyServiceNockListGetAll
        .post(soapApiPathCS)
        .replyWithFile(200, path.join(__dirname, "./data/ListGetAll.xml"));

      EmployeeServiceNockListGetByCompany
        .post(soapApiPathES)
        .replyWithFile(200, path.join(__dirname, "./data/ListGetByCompany.xml"));
      EmployeeServiceNockAbsenceGetList
        .post(soapApiPathES)
        .replyWithFile(200, path.join(__dirname, "./data/AbsenceGetList-503293.xml"));
      EmployeeServiceNockAbsenceGetList
        .post(soapApiPathES)
        .replyWithFile(200, path.join(__dirname, "./data/AbsenceGetList-503294.xml"));


      return lib.handleMessage(configMock, companySoapClient, employeesSoapClient, message)
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
  });
});