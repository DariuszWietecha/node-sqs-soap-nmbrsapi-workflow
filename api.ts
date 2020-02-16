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

export function getCompanyIdList(authHeader: IAuthHeader, CompanyServiceUrl: string): Promise<number[]> {
  return new Promise((resolve: (companyIdList: number[]) => void, reject) => {
    soap.createClient(CompanyServiceUrl, async (error: Error, client: any) => {
      if (error) {
        reject(error);
      }

      client.addSoapHeader(authHeader);
      client.List_GetAll((err: Error, result: IListGetAllResult) => {
        if (err) {
          reject(err);
        }
        resolve(result.List_GetAllResult.Company.map((company) => company.ID));
      });
    });
  });
}

export function getEmployeesIdsList(
  authHeader: IAuthHeader, EmployeeServiceUrl: string, CompanyId: number): Promise<number[]> {
  return new Promise((resolve: (employeesList: number[]) => void, reject) => {
    soap.createClient(EmployeeServiceUrl, async (error: Error, client: any) => {
      if (error) {
        reject(error);
      }

      client.addSoapHeader(authHeader);
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
  });
}

export function getEmployeAbsenceList(
  authHeader: IAuthHeader, EmployeeServiceUrl: string, EmployeeId: number): Promise<IAbsenceItem[]> {
  return new Promise((resolve: (absence: IAbsenceItem[]) => void, reject) => {
    // TODO move client above to avoid creating it two times
    soap.createClient(EmployeeServiceUrl, async (error: Error, client: any) => {
      if (error) {
        reject(error);
      }

      client.addSoapHeader(authHeader);
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
  });
}
