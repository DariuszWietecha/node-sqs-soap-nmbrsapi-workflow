
export interface IConfig {
  api: {
    CompanyServiceUrl: string;
    EmployeeServiceUrl: string;
  };
  sqs: {
    region: string;
  };
  outputDir: string;
}

export const config: IConfig = {
  api: {
    CompanyServiceUrl: "https://api.nmbrs.nl/soap/v2.1/CompanyService.asmx?WSDL",
    EmployeeServiceUrl: "https://api.nmbrs.nl/soap/v2.1/EmployeeService.asmx?WSDL",
  },
  sqs: {
    region: "eu-west-1",
  },
  outputDir: "output",
};
