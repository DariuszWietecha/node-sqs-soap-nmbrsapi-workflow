// tslint:disable-next-line:no-var-requires
const soap = require("soap");
import { fromNullable } from "fp-ts/lib/Option";

interface IAuthHeader {
  "tns:AuthHeader": {
    "tns:Token": string;
    "tns:Username": string;
  };
}

interface IListGetAllResult {
  List_GetAllResult: {
    Company: [
      {
        ID: number;
        // other attributes skipped as not needed to solve the task
      },
    ];
  };
}

interface IListGetByCompanyResult {
  List_GetByCompanyResult: {
    Employee: [
      {
        Id: number;
        // other attributes skipped as not needed to solve the task
      },
    ];
  };
}

interface IAbsenceGetListResult {
  Absence_GetListResult: {
    Absence: IAbsenceItem[];
  } | null;
}

export interface IAbsenceItem {
  AbsenceId: number;
  Comment: string;
  Percentage: number;
  Start: string;
  RegistrationStartDate: string;
  Dossier: string;
  Dossiernr: number;
  End?: string;
  RegistrationEndDate?: string;
}

export interface ISoapClient {
  addSoapHeader: (authHeader: IAuthHeader) => void
}

export interface ISoapCompanyServiceClient extends ISoapClient {
  addSoapHeader: (authHeader: IAuthHeader) => void
  List_GetAll: (callback: (err: Error, result: IListGetAllResult) => void) => void;
}

export interface ISoapEmployeeServiceClient extends ISoapClient {
  List_GetByCompany: (companyIdAndActive: ICompanyIdAndActive, callback: (err: Error, result: IListGetByCompanyResult) => void) => void;
  Absence_GetList: (EmployeeId: IEmployeeId, callback: (err: Error, result: IAbsenceGetListResult) => void) => void;
}

interface ICompanyIdAndActive {
  CompanyId: number;
  active: string;
}

interface IEmployeeId {
  EmployeeId: number;
}

export async function createSoapClient(serviceUrl: string): Promise<ISoapClient> {
  return new Promise((resolve: (client: ISoapClient) => void, reject) => {
    soap.createClient(serviceUrl, async (error: Error, client: ISoapClient): Promise<void> => {
      if (error) {
        reject(error);
      }

      resolve(client);
    });
  });
}

export async function getCompanyIdList(client: ISoapCompanyServiceClient): Promise<number[]> {
  return new Promise((resolve: (companyIdList: number[]) => void, reject) => {
    client.List_GetAll((err: Error, result: IListGetAllResult) => {
      if (err) {
        reject(err);
      }
      resolve(result.List_GetAllResult.Company.map((company) => company.ID));
    });
  });
}

export async function getEmployeesIdsList(client: ISoapEmployeeServiceClient, CompanyId: number): Promise<number[]> {
  return new Promise((resolve: (employeesList: number[]) => void, reject) => {
    client.List_GetByCompany(
      { CompanyId, active: "active" }, (err: Error, result: IListGetByCompanyResult) => {
        if (err) {
          reject(err);
        }

        resolve(
          result.List_GetByCompanyResult.Employee
            .map((employee) => employee.Id));
      });
  });
}

export async function getEmployeAbsenceList(client: ISoapEmployeeServiceClient, EmployeeId: number): Promise<IAbsenceItem[]> {
  return new Promise((resolve: (absence: IAbsenceItem[]) => void, reject) => {
    client.Absence_GetList(
      { EmployeeId }, (err: Error, result: IAbsenceGetListResult) => {
        if (err) {
          reject(err);
        }

        const absence = fromNullable(result.Absence_GetListResult)
          .map((aGLR) => aGLR.Absence)
          .getOrElse([]);

        resolve(absence);
      });
  });
}

